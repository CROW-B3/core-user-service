import { createRoute, z } from '@hono/zod-openapi';
import {
  CreateDirectUserSchema,
  CreateUserBuilderSchema,
  CreateUserSchema,
  FinalizeUserBuilderSchema,
  HelloWorldSchema,
  PermissionsSchema,
  ProfilePictureUploadResponseSchema,
  UpdateUserProfileSchema,
  UserBuilderSchema,
  UserSchema,
} from './types';

export const HelloWorldRoute = createRoute({
  method: 'get',
  path: '/',
  request: {},
  responses: {
    200: {
      content: { 'application/json': { schema: HelloWorldSchema } },
      description: 'Hello World',
    },
  },
});

export const CreateUserBuilderRoute = createRoute({
  method: 'post',
  path: '/api/v1/user-builders',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserBuilderSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: UserBuilderSchema } },
      description: 'User builder created',
    },
  },
});

export const GetUserBuilderRoute = createRoute({
  method: 'get',
  path: '/api/v1/user-builders/{id}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserBuilderSchema } },
      description: 'User builder found',
    },
    404: {
      description: 'User builder not found',
    },
  },
});

export const FinalizeUserBuilderRoute = createRoute({
  method: 'post',
  path: '/api/v1/user-builders/{id}/finalize',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: FinalizeUserBuilderSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User created from builder',
    },
    404: {
      description: 'User builder not found',
    },
  },
});

export const GetUserRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/{id}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User found',
    },
    404: {
      description: 'User not found',
    },
  },
});

export const GetUserByAuthIdRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/by-auth-id/{betterAuthUserId}',
  request: {
    params: z.object({ betterAuthUserId: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User found',
    },
    404: {
      description: 'User not found',
    },
  },
});

export const GetUserPermissionsRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/{id}/permissions',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: PermissionsSchema } },
      description: 'User permissions',
    },
    404: {
      description: 'User not found',
    },
  },
});

export const CheckEmailsExistRoute = createRoute({
  method: 'post',
  path: '/api/v1/users/check-emails',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            emails: z.array(z.string().email()),
            organizationId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            existingEmails: z.array(z.string()),
          }),
        },
      },
      description: 'List of emails that already exist as users',
    },
  },
});

export const UploadProfilePictureRoute = createRoute({
  method: 'post',
  path: '/api/v1/users/{id}/profile-picture',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: ProfilePictureUploadResponseSchema },
      },
      description: 'Profile picture uploaded successfully',
    },
    400: {
      description: 'Invalid file or file size exceeded',
    },
    404: {
      description: 'User not found',
    },
  },
});

export const UpdateUserProfileRoute = createRoute({
  method: 'patch',
  path: '/api/v1/users/{id}/profile',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: UpdateUserProfileSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'Profile updated successfully',
    },
    404: {
      description: 'User not found',
    },
  },
});

export const GetUsersByOrganizationRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/by-organization/{organizationId}',
  request: {
    params: z.object({ organizationId: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            users: z.array(UserSchema),
            total: z.number(),
          }),
        },
      },
      description: 'Users retrieved successfully',
    },
    404: {
      description: 'No users found',
    },
  },
});

export const CreateUserRoute = createRoute({
  method: 'post',
  path: '/api/v1/users',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User created successfully',
    },
    400: {
      description: 'Invalid request',
    },
  },
});

export const CreateDirectUserRoute = createRoute({
  method: 'post',
  path: '/api/v1/users/create',
  request: {
    body: {
      content: { 'application/json': { schema: CreateDirectUserSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User created directly for onboarding',
    },
    400: {
      description: 'Invalid request or user already exists',
    },
    409: {
      description: 'User with this email already exists',
    },
  },
});

export const OnboardUserRoute = createRoute({
  method: 'post',
  path: '/api/v1/users/onboard',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            role: z.enum(['admin', 'member']),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User profile updated after signup',
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'User not found',
    },
  },
});

export const GetCurrentUserRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/me',
  request: {},
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'Current user profile',
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'User not found',
    },
  },
});
