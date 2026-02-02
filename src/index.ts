import type { Environment } from './types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { poweredBy } from 'hono/powered-by';
import * as schema from './db/schema';
import { jwtAuth, systemJwtAuth } from './middleware/auth';
import {
  CheckEmailsExistRoute,
  CreateUserBuilderRoute,
  FinalizeUserBuilderRoute,
  GetUserBuilderRoute,
  GetUserByAuthIdRoute,
  GetUserPermissionsRoute,
  GetUserRoute,
  HelloWorldRoute,
  UpdateUserProfileRoute,
  UploadProfilePictureRoute,
} from './routes';
import {
  createUserBuilderInDatabase,
  createUserFromBuilder,
  fetchUserBuilderById,
  markUserBuilderAsActive,
} from './services/user-builder-service';
import {
  checkEmailsExist,
  fetchUserByBetterAuthId,
  fetchUserById,
  updateUserProfile,
  uploadProfilePictureToR2,
} from './services/user-service';
import {
  formatUserBuilderResponse,
  formatUserResponse,
} from './utils/formatters';

// In-memory user storage for local development
// Maps authId -> user object
const userCache = new Map<
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
  return builderId;
};

  // Create and store user
  const userId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const user = {
    id: userId,
    authId: authId || builderId, // Use authId from request, fallback to builderId
    email,
    name,
    role,
    createdAt,
  };

  // Store in cache for lookup
  userCache.set(user.authId, user);
  console.warn(`[User Service] Cached user with authId: ${user.authId}`);

  return c.json(
    {
      id: userId,
      builderId,
      email,
      name,
      role,
      createdAt,
    },
    200
  );
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

  // Look up user in cache
  const user = userCache.get(authId);

  if (!user) {
    console.warn(`[User Service] User not found for authId: ${authId}`);
    return c.json({ error: 'User not found' }, 404);
  }

  console.warn(`[User Service] Found user for authId: ${authId}`, user);
  return c.json(user, 200);
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

  const existingEmails = await checkEmailsExist(database, emails);

  return context.json({ existingEmails });
});

app.openapi(UploadProfilePictureRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const { id } = context.req.valid('param');

  const user = await fetchUserById(database, id);
  if (!user) {
    return context.json({ error: 'User not found' }, 404);
  }

  const formData = await context.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return context.json({ error: 'No file provided' }, 400);
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return context.json({ error: 'File size exceeds 5MB limit' }, 400);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return context.json(
      { error: 'Invalid file type. Only JPG, PNG, and WebP are allowed' },
      400
    );
  }

  const url = await uploadProfilePictureToR2(context.env.R2_BUCKET, id, file);

  return context.json({ url });
});

app.openapi(UpdateUserProfileRoute, async context => {
  const database = drizzle(context.env.DB, { schema });
  const { id } = context.req.valid('param');
  const body = context.req.valid('json');

  const user = await fetchUserById(database, id);
  if (!user) {
    return context.json({ error: 'User not found' }, 404);
  }

  const updatedUser = await updateUserProfile(database, id, body);

  if (!updatedUser) {
    return context.json({ error: 'Failed to update profile' }, 500);
  }

  return context.json(formatUserResponse(updatedUser));
});

app.doc('/docs', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'User Service API',
  },
});

export default app;
