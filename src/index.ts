import type { Environment } from './types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { poweredBy } from 'hono/powered-by';
import { createLogger } from './config/logger';
import * as schema from './db/schema';
import { createJWTMiddleware } from './middleware/jwt';
import {
  CheckEmailsExistRoute,
  CreateDirectUserRoute,
  CreateUserRoute,
  GetCurrentUserRoute,
  GetUserPermissionsRoute,
  GetUserRoute,
  GetUsersByOrganizationRoute,
  HelloWorldRoute,
  OnboardUserRoute,
  UpdateUserProfileRoute,
  UploadProfilePictureRoute,
} from './routes';
import { HealthCheckRoute, ReadinessCheckRoute } from './routes/health';
import {
  associateUserWithOrganization,
  checkUserExists,
  createUser,
  createUserRecord,
  fetchUserByBetterAuthId,
  fetchUserById,
  fetchUsersByOrganizationId,
  findExistingEmailAddresses,
  updateUserProfile,
  uploadProfilePictureToR2,
  validateUserCreationPayload,
} from './services/user-service';
import { handleErrorResponse } from './utils/error-handler';
import { formatUserResponse } from './utils/formatters';

const localDevelopmentUserCache = new Map<
  string,
  {
    id: string;
    authId: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }
>();

const app = new OpenAPIHono<{ Bindings: Environment }>();

app.use(poweredBy());
app.use(logger());
app.use(
  '/*',
  cors({
    origin: [
      'http://localhost:8000',
      'http://localhost:8001',
      'https://api.crowai.dev',
    ],
    credentials: true,
  })
);

app.openapi(HelloWorldRoute, c => {
  return c.json({ text: 'Hello Hono!' });
});

app.post('/api/v1/user-builders', async c => {
  const builderId = crypto.randomUUID();
  return c.json({ id: builderId }, 201);
});

app.post('/api/v1/user-builders/:id/finalize', async c => {
  const builderId = c.req.param('id');
  const body = await c.req.json();
  const { email, name, role, authId } = body;

  console.warn('Finalizing user-builder:', {
    builderId,
    email,
    name,
    role,
    authId,
  });

  const userId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const user = {
    id: userId,
    authId,
    email,
    name,
    role,
    createdAt,
  };

  localDevelopmentUserCache.set(user.authId, user);
  console.warn(`[User Service] Cached user with authId: ${user.authId}`);

  return c.json(user, 200);
});

app.post('/api/v1/billing-builders', async c => {
  const builderId = crypto.randomUUID();
  return c.json({ id: builderId }, 201);
});

app.post('/api/v1/billing-builders/:id/finalize', async c => {
  const builderId = c.req.param('id');
  const body = await c.req.json();

  console.warn('Finalizing billing-builder:', { builderId, body });

  // Return the finalized billing record
  const billingId = crypto.randomUUID();
  return c.json(
    {
      id: billingId,
      builderId,
      createdAt: new Date().toISOString(),
    },
    200
  );
});

app.get('/api/v1/users/by-auth-id/:authId', async c => {
  const authId = c.req.param('authId');
  const database = drizzle(c.env.DB, { schema });

  const user = await fetchUserByBetterAuthId(database, authId);

  if (!user) {
    console.warn(`[User Service] User not found for authId: ${authId}`);
    return c.json({ error: 'User not found' }, 404);
  }

  console.warn(`[User Service] Found user for authId: ${authId}`, user.id);
  return c.json(formatUserResponse(user), 200);
});

app.post('/api/v1/users/check-emails', async c => {
  const body = await c.req.json();
  const { emails } = body;

  console.warn('Checking emails:', emails);

  // For now, return that none of the emails exist
  return c.json(
    {
      existingEmails: [],
      availableEmails: emails,
    },
    200
  );
});

app.openapi(CheckEmailsExistRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const { emails } = context.req.valid('json');

  const existingEmails = await findExistingEmailAddresses(database, emails);

  return context.json({ existingEmails });
});

app.openapi(CreateUserRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const body = context.req.valid('json');

  const user = await createUser(
    database,
    body.betterAuthUserId,
    body.organizationId,
    body.email,
    body.name,
    (body.role || 'member') as 'admin' | 'member',
    body.modules || { web: true, cctv: true, social: true },
    body.onboardingId
  );

  return context.json(formatUserResponse(user), 201);
});

app.openapi(CreateDirectUserRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const body = context.req.valid('json');

  const validationError = validateUserCreationPayload(body);
  if (validationError) {
    return context.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError,
          timestamp: new Date().toISOString(),
        },
      },
      400
    );
  }

  const userAlreadyExists = await checkUserExists(database, body.email);
  if (userAlreadyExists) {
    return context.json(
      {
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString(),
        },
      },
      409
    );
  }

  const role = body.role ?? 'member';
  const user = await createUserRecord(
    database,
    body.email,
    body.name,
    body.organizationId,
    role
  );

  await associateUserWithOrganization(
    database,
    user.id,
    body.organizationId,
    role
  );

  return context.json(formatUserResponse(user), 201);
});

app.use('/api/v1/users/:id/profile-picture', async (c, next) =>
  createJWTMiddleware(c.env)(c, next)
);
app.use('/api/v1/users/:id/profile', async (c, next) =>
  createJWTMiddleware(c.env)(c, next)
);

app.openapi(UploadProfilePictureRoute, async context => {
  const jwtPayload = context.get('jwtPayload');
  const { id } = context.req.valid('param');

  const database = drizzle(context.env.DB, { schema });

  const user = await fetchUserById(database, id);
  if (!user)
    return context.json(
      {
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      },
      404
    );

  // Authorization: allow if system token, if the authenticated user owns this
  // profile (JWT sub is betterAuthUserId, not internal ID), or if the requester
  // belongs to the same organization.
  if (!context.get('isSystem')) {
    const isOwner = jwtPayload?.sub === user.betterAuthUserId;
    const orgFromJwt = jwtPayload?.organizationId as string | undefined;
    const orgFromHeader = context.req.header('X-Organization-Id');
    const requesterOrgId = orgFromJwt || orgFromHeader;
    const isOrgMember =
      !!requesterOrgId && requesterOrgId === user.organizationId;
    if (!isOwner && !isOrgMember) {
      return context.json(
        { error: 'Forbidden', message: 'Access denied' },
        403
      );
    }
  }

  const formData = await context.req.formData();
  const file = formData.get('file') as File;

  if (!file)
    return context.json(
      {
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'No file provided',
          timestamp: new Date().toISOString(),
        },
      },
      400
    );

  const maximumFileSizeInBytes = 5 * 1024 * 1024;
  if (file.size > maximumFileSizeInBytes)
    return context.json(
      {
        error: {
          code: 'FILE_SIZE_EXCEEDED',
          message: 'File size exceeds 5MB limit',
          timestamp: new Date().toISOString(),
        },
      },
      400
    );

  const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedImageMimeTypes.includes(file.type))
    return context.json(
      {
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Invalid file type. Only JPG, PNG, and WebP are allowed',
          timestamp: new Date().toISOString(),
        },
      },
      400
    );

  const url = await uploadProfilePictureToR2(context.env.R2_BUCKET, id, file);

  return context.json({ url });
});

app.openapi(UpdateUserProfileRoute, async context => {
  const jwtPayload = context.get('jwtPayload');
  const { id } = context.req.valid('param');

  const database = drizzle(context.env.DB, { schema });
  const body = context.req.valid('json');

  const user = await fetchUserById(database, id);
  if (!user)
    return context.json(
      {
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      },
      404
    );

  // Authorization: allow if system token, if the authenticated user owns this
  // profile (JWT sub is betterAuthUserId, not internal ID), or if the requester
  // belongs to the same organization (via JWT claim or X-Organization-Id header
  // injected by the API gateway from the active session).
  if (!context.get('isSystem')) {
    const isOwner = jwtPayload?.sub === user.betterAuthUserId;
    const orgFromJwt = jwtPayload?.organizationId as string | undefined;
    const orgFromHeader = context.req.header('X-Organization-Id');
    const requesterOrgId = orgFromJwt || orgFromHeader;
    const isOrgMember =
      !!requesterOrgId && requesterOrgId === user.organizationId;
    if (!isOwner && !isOrgMember) {
      return context.json(
        { error: 'Forbidden', message: 'Access denied' },
        403
      );
    }
  }

  const updatedUser = await updateUserProfile(database, id, body);

  if (!updatedUser)
    return context.json(
      {
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user profile',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );

  return context.json(formatUserResponse(updatedUser));
});

app.openapi(GetUsersByOrganizationRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const { organizationId } = context.req.valid('param');

  const users = await fetchUsersByOrganizationId(database, organizationId);

  if (!users || users.length === 0) {
    return context.json(
      {
        error: {
          code: 'NO_USERS_FOUND',
          message: 'No users found for this organization',
          timestamp: new Date().toISOString(),
        },
      },
      404
    );
  }

  return context.json({
    users: users.map(formatUserResponse),
    total: users.length,
  });
});

app.openapi(HealthCheckRoute, c => {
  return c.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'core-user-service',
      version: '1.0.0',
      environment: c.env.ENVIRONMENT || 'prod',
    },
    200
  );
});

app.openapi(ReadinessCheckRoute, async c => {
  let isDatabaseHealthy = false;
  try {
    const database = drizzle(c.env.DB, { schema });
    await database.run('SELECT 1');
    isDatabaseHealthy = true;
  } catch {}

  const isReady = isDatabaseHealthy;
  return c.json(
    { ready: isReady, checks: { database: isDatabaseHealthy } },
    isReady ? 200 : 503
  );
});

app.use('/api/v1/users/me', async (c, next) =>
  createJWTMiddleware(c.env)(c, next)
);
app.use('/api/v1/users/onboard', async (c, next) =>
  createJWTMiddleware(c.env)(c, next)
);

app.openapi(GetCurrentUserRoute, async context => {
  const jwtPayload = context.get('jwtPayload');
  const betterAuthUserId = jwtPayload?.sub as string | undefined;
  if (!betterAuthUserId) {
    return context.json(
      { error: 'Unauthorized', message: 'Missing subject in token' },
      401
    );
  }
  const database = drizzle(context.env.DB, { schema });
  const user = await fetchUserByBetterAuthId(database, betterAuthUserId);
  if (!user) {
    return context.json(
      {
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      },
      404
    );
  }
  return context.json(formatUserResponse(user), 200);
});

app.openapi(OnboardUserRoute, async context => {
  const jwtPayload = context.get('jwtPayload');
  const betterAuthUserId = jwtPayload?.sub as string | undefined;
  if (!betterAuthUserId) {
    return context.json(
      { error: 'Unauthorized', message: 'Missing subject in token' },
      401
    );
  }
  const database = drizzle(context.env.DB, { schema });
  const user = await fetchUserByBetterAuthId(database, betterAuthUserId);
  if (!user) {
    return context.json(
      {
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      },
      404
    );
  }
  const { name, role: _role } = context.req.valid('json');
  const updatedUser = await updateUserProfile(database, user.id, { name });
  if (!updatedUser) {
    return context.json(
      {
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user profile',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
  return context.json(formatUserResponse(updatedUser), 200);
});

app.openapi(GetUserRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const { id } = context.req.valid('param');

  const user = await fetchUserById(database, id);
  if (!user) {
    return context.json({ error: 'User not found' }, 404);
  }

  return context.json(formatUserResponse(user));
});

app.openapi(GetUserPermissionsRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const { id } = context.req.valid('param');

  const user = await fetchUserById(database, id);
  if (!user) {
    return context.json({ error: 'User not found' }, 404);
  }

  let rawPermissions: string[] = [];
  try {
    rawPermissions = JSON.parse(user.permissions) as string[];
  } catch {
    rawPermissions = [];
  }

  const permissions = {
    interactions: rawPermissions.includes('interactions:read'),
    patterns: rawPermissions.includes('patterns:read'),
    teamManagement: rawPermissions.includes('team:manage'),
    apiKeyManagement: rawPermissions.includes('api_keys:manage'),
    chat: rawPermissions.includes('chat:read')
      ? {
          enabled: true,
          components: [
            ...(rawPermissions.includes('chat:web:read')
              ? ['web' as const]
              : []),
            ...(rawPermissions.includes('chat:cctv:read')
              ? ['cctv' as const]
              : []),
            ...(rawPermissions.includes('chat:social:read')
              ? ['social' as const]
              : []),
          ],
          lookbackWindow: 'all' as const,
        }
      : undefined,
  };

  return context.json(permissions);
});

app.doc('/api/docs', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'CROW User API',
    description: 'User management service for CROW platform',
  },
});

app.notFound(c =>
  c.json({ error: 'Not Found', message: 'Route not found' }, 404)
);

app.onError((error, c) => {
  const logger = createLogger(c.env);
  return handleErrorResponse(c, error, logger);
});

export default app;
