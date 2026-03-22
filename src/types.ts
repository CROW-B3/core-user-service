import { z } from '@hono/zod-openapi';

export interface Environment {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BETTER_AUTH_SECRET: string;
  AUTH_SERVICE_URL: string;
  ENVIRONMENT: 'local' | 'dev' | 'prod';
  SERVICE_API_KEY_AUTH?: string;
  SERVICE_API_KEY_ORGANIZATION?: string;
  SERVICE_API_KEY_BILLING?: string;
  SERVICE_API_KEY_NOTIFICATION?: string;
  INTERNAL_GATEWAY_KEY?: string;
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

export const CreateUserSchema = z
  .object({
    betterAuthUserId: z.string(),
    organizationId: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string().optional(),
    modules: z
      .object({
        web: z.boolean(),
        cctv: z.boolean(),
        social: z.boolean(),
      })
      .optional(),
    onboardingId: z.string().optional(),
  })
  .openapi('CreateUser');

export const UpdateUserProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    profilePictureUrl: z.string().optional(),
  })
  .openapi('UpdateUserProfile');

export const ProfilePictureUploadResponseSchema = z
  .object({
    url: z.string(),
  })
  .openapi('ProfilePictureUploadResponse');

export const UserPreferencesSchema = z
  .object({
    emailPatternAlerts: z.boolean(),
    emailBillingNotices: z.boolean(),
    emailTeamInvites: z.boolean(),
    emailWeeklyDigest: z.boolean(),
  })
  .openapi('UserPreferences');

export const UpdateUserPreferencesSchema = z
  .object({
    emailPatternAlerts: z.boolean().optional(),
    emailBillingNotices: z.boolean().optional(),
    emailTeamInvites: z.boolean().optional(),
    emailWeeklyDigest: z.boolean().optional(),
  })
  .openapi('UpdateUserPreferences');

export const CreateDirectUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string(),
    organizationId: z.string(),
    role: z.enum(['owner', 'admin', 'member']).optional(),
    sendWelcomeEmail: z.boolean().optional(),
  })
  .openapi('CreateDirectUser');
