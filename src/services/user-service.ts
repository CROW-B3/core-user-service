import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';

export type User = typeof schema.user.$inferSelect;
export type Database = DrizzleD1Database<typeof schema>;

export const fetchUserById = async (
  database: Database,
  userId: string
): Promise<User | null> => {
  const results = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return results[0] ?? null;
};

export const fetchUserByBetterAuthId = async (
  database: Database,
  betterAuthUserId: string
): Promise<User | null> => {
  const results = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.betterAuthUserId, betterAuthUserId))
    .limit(1);

  return results[0] ?? null;
};

export const checkEmailsExist = async (
  database: Database,
  emails: string[]
): Promise<string[]> => {
  const existingUsers = await database
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(inArray(schema.user.email, emails));

  return existingUsers.map(user => user.email);
};
