import type { UserBuilder } from '../services/user-builder-service';
import type { User } from '../services/user-service';

export const formatUserBuilderResponse = (builder: UserBuilder) => ({
  ...builder,
  permissions: JSON.parse(builder.permissions),
  createdAt: new Date(builder.createdAt).toISOString(),
});

export const formatUserResponse = (user: User) => ({
  ...user,
  permissions: JSON.parse(user.permissions),
  createdAt: new Date(user.createdAt).toISOString(),
  updatedAt: new Date(user.updatedAt).toISOString(),
});
