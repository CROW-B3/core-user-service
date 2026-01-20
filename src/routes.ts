import { createRoute, z } from '@hono/zod-openapi';
import {
  CreateUserBuilderSchema,
  FinalizeUserBuilderSchema,
  HelloWorldSchema,
  PermissionsSchema,
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
