import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export interface UserBuilder {
  id: string;
  betterAuthUserId: string;
  organizationId: string;
  permissions: string;
  status: string;
  createdAt: number;
}

export type Database = DrizzleD1Database<typeof schema>;

export const createUserBuilderInDatabase = async (
  _database: Database,
  builderId: string,
  _betterAuthUserId: string,
  _organizationId: string,
  _permissions: unknown,
  _timestamp: Date
): Promise<string> => {
  return builderId;
};

export const fetchUserBuilderById = async (
  _database: Database,
  _builderId: string
): Promise<UserBuilder | null> => {
  return null;
};

export const markUserBuilderAsActive = async (
  _database: Database,
  _builderId: string
): Promise<void> => {};

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
  const ts = timestamp.getTime();

  await database.insert(schema.user).values({
    id: userId,
    betterAuthUserId: builder.betterAuthUserId,
    organizationId: builder.organizationId,
    email,
    name,
    profilePictureUrl: profilePictureUrl || null,
    onboardingId: onboardingId || null,
    permissions: builder.permissions,
    createdAt: ts,
    updatedAt: ts,
  });

  return userId;
};
