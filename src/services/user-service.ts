import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { and, eq, inArray, like } from 'drizzle-orm';
import * as schema from '../db/schema';
import { fetchPermissionsForRole, Permission } from '../types/permissions';

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

export const findExistingEmailAddresses = async (
  database: Database,
  emails: string[]
): Promise<string[]> => {
  const existingUsers = await database
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(inArray(schema.user.email, emails));

  return existingUsers.map(user => user.email);
};

export const searchUsersByEmailPrefix = async (
  database: Database,
  emailPrefix: string,
  organizationId: string
): Promise<{ email: string; name: string }[]> => {
  const results = await database
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(
      and(
        like(schema.user.email, `${emailPrefix}%`),
        eq(schema.user.organizationId, organizationId)
      )
    )
    .limit(10);

  return results;
};

export const uploadProfilePictureToR2 = async (
  bucket: R2Bucket,
  userId: string,
  file: File
): Promise<string> => {
  const timestamp = Date.now();
  const storageKey = `profile-pictures/${userId}/${timestamp}-${file.name}`;

  await bucket.put(storageKey, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return `https://pub-YOUR_R2_PUBLIC_URL/${storageKey}`;
};

export const updateUserProfile = async (
  database: Database,
  userId: string,
  profileUpdates: { name?: string; profilePictureUrl?: string }
): Promise<User | null> => {
  const currentTimestamp = Date.now();

  await database
    .update(schema.user)
    .set({
      ...profileUpdates,
      updatedAt: currentTimestamp,
    })
    .where(eq(schema.user.id, userId));

  return fetchUserById(database, userId);
};

export const createUser = async (
  database: Database,
  betterAuthUserId: string,
  organizationId: string,
  email: string,
  name: string,
  role: 'admin' | 'member',
  modules: { web: boolean; cctv: boolean; social: boolean },
  onboardingId?: string
): Promise<User> => {
  const userId = crypto.randomUUID();
  const currentTimestamp = Date.now();
  const permissions = fetchPermissionsForRole(role, modules);

  await database.insert(schema.user).values({
    id: userId,
    betterAuthUserId,
    organizationId,
    email,
    name,
    permissions: JSON.stringify(permissions),
    status: 'active',
    role,
    onboardingId,
    profilePictureUrl: null,
    createdAt: currentTimestamp,
    updatedAt: currentTimestamp,
  });

  return (await fetchUserById(database, userId))!;
};

export const activateUser = async (
  database: Database,
  userId: string
): Promise<void> => {
  await database
    .update(schema.user)
    .set({ status: 'active', updatedAt: Date.now() })
    .where(eq(schema.user.id, userId));
};

export const doesUserHavePermission = (
  user: User,
  permission: Permission
): boolean => {
  try {
    const permissions = JSON.parse(user.permissions) as string[];
    return permissions.includes(permission);
  } catch {
    return false;
  }
};

export const isUserAllowedToManageTeam = (user: User): boolean =>
  doesUserHavePermission(user, Permission.TEAM_MANAGE);

export const isUserAdmin = (user: User): boolean => user.role === 'admin';

export const fetchUsersByOrganizationId = async (
  database: Database,
  organizationId: string
): Promise<User[]> =>
  database
    .select()
    .from(schema.user)
    .where(eq(schema.user.organizationId, organizationId));

export const fetchUserByEmail = async (
  database: Database,
  email: string
): Promise<User | null> => {
  const results = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  return results[0] ?? null;
};

export const validateUserCreationPayload = (body: {
  email: string;
  name: string;
  organizationId: string;
  role?: string;
}): string | null => {
  if (!body.email) return 'email is required';
  if (!body.name) return 'name is required';
  if (!body.organizationId) return 'organizationId is required';
  return null;
};

export const checkUserExists = async (
  database: Database,
  email: string
): Promise<boolean> => {
  const existingUser = await fetchUserByEmail(database, email);
  return existingUser !== null;
};

export const createUserRecord = async (
  database: Database,
  email: string,
  name: string,
  organizationId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<User> => {
  const userId = crypto.randomUUID();
  const currentTimestamp = Date.now();
  const resolvedRole = role === 'owner' ? 'admin' : role;
  const permissions = fetchPermissionsForRole(resolvedRole, {
    web: true,
    cctv: true,
    social: true,
  });

  await database.insert(schema.user).values({
    id: userId,
    betterAuthUserId: userId,
    organizationId,
    email,
    name,
    permissions: JSON.stringify(permissions),
    status: 'active',
    role: resolvedRole,
    onboardingId: null,
    profilePictureUrl: null,
    createdAt: currentTimestamp,
    updatedAt: currentTimestamp,
  });

  return (await fetchUserById(database, userId))!;
};

export const associateUserWithOrganization = async (
  database: Database,
  userId: string,
  organizationId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<void> => {
  const resolvedRole = role === 'owner' ? 'admin' : role;
  await database
    .update(schema.user)
    .set({ organizationId, role: resolvedRole, updatedAt: Date.now() })
    .where(eq(schema.user.id, userId));
};
