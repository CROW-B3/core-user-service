import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

export type UserBuilder = typeof schema.userBuilder.$inferSelect;
export type Database = DrizzleD1Database<typeof schema>;

export const createUserBuilderInDatabase = async (
  database: Database,
  builderId: string,
  betterAuthUserId: string,
  organizationId: string,
  permissions: unknown,
  timestamp: Date
): Promise<string> => {
  await database.insert(schema.userBuilder).values({
    id: builderId,
    betterAuthUserId,
    organizationId,
    permissions: JSON.stringify(permissions),
    createdAt: timestamp,
  });

  return builderId;
};

export const fetchUserBuilderById = async (
  database: Database,
  builderId: string
): Promise<UserBuilder | null> => {
  const results = await database
    .select()
    .from(schema.userBuilder)
    .where(eq(schema.userBuilder.id, builderId))
    .limit(1);

  return results[0] ?? null;
};

export const markUserBuilderAsActive = async (
  database: Database,
  builderId: string
): Promise<void> => {
  await database
    .update(schema.userBuilder)
    .set({ status: 'active' })
    .where(eq(schema.userBuilder.id, builderId));
};

export const createUserFromBuilder = async (
  database: Database,
  builder: UserBuilder,
  email: string,
  name: string,
  timestamp: Date,
  onboardingId?: string,
  profilePictureUrl?: string
): Promise<string> => {
  const userId = crypto.randomUUID();

  await database.insert(schema.user).values({
    id: userId,
    betterAuthUserId: builder.betterAuthUserId,
    organizationId: builder.organizationId,
    email,
    name,
    profilePictureUrl: profilePictureUrl || null,
    onboardingId: onboardingId || null,
    permissions: builder.permissions,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return userId;
};
