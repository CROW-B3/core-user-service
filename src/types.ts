import { z } from '@hono/zod-openapi';

export interface Environment {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BETTER_AUTH_SECRET: string;
  AUTH_SERVICE_URL: string;
  ENVIRONMENT: 'local' | 'dev' | 'prod';
}

export const HelloWorldSchema = z
  .object({
    text: z.string(),
  })
  .openapi('HelloWorld');

export const PermissionsSchema = z
  .object({
    chat: z
      .object({
        enabled: z.boolean(),
        components: z.array(z.enum(['web', 'cctv', 'social'])),
        lookbackWindow: z.enum(['7days', '30days', '90days', '1year', 'all']),
      })
      .optional(),
    interactions: z.boolean(),
    patterns: z.boolean(),
    teamManagement: z.boolean(),
    apiKeyManagement: z.boolean(),
  })
  .openapi('Permissions');

export const UserBuilderSchema = z
  .object({
    id: z.string(),
    betterAuthUserId: z.string(),
    organizationId: z.string(),
    permissions: PermissionsSchema,
    status: z.enum(['draft', 'active']),
    createdAt: z.string(),
  })
  .openapi('UserBuilder');

export const CreateUserBuilderSchema = z
  .object({
    betterAuthUserId: z.string(),
    organizationId: z.string(),
    permissions: PermissionsSchema,
  })
  .openapi('CreateUserBuilder');

export const UserSchema = z
  .object({
    id: z.string(),
    betterAuthUserId: z.string(),
    organizationId: z.string(),
    email: z.string(),
    name: z.string(),
    profilePictureUrl: z.string().nullable(),
    onboardingId: z.string().nullable(),
    permissions: PermissionsSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('User');

export const FinalizeUserBuilderSchema = z
  .object({
    email: z.string(),
    name: z.string(),
    onboardingId: z.string().optional(),
  })
  .openapi('FinalizeUserBuilder');

export const UpdateUserProfileSchema = z
  .object({
    name: z.string().optional(),
    profilePictureUrl: z.string().optional(),
  })
  .openapi('UpdateUserProfile');

export const ProfilePictureUploadResponseSchema = z
  .object({
    url: z.string(),
  })
  .openapi('ProfilePictureUploadResponse');
