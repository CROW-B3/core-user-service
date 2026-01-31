import type { UserBuilder } from '../services/user-builder-service';
import type { User } from '../services/user-service';

export const formatUserBuilderResponse = (builder: UserBuilder) => ({
  ...builder,
  permissions: JSON.parse(builder.permissions),
  createdAt: builder.createdAt.toISOString(),
});

export const formatUserResponse = (user: User) => ({
  ...user,
  permissions: JSON.parse(user.permissions),
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});
