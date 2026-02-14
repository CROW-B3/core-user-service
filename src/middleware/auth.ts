import type { Context, Next } from 'hono';
import type { Permission } from '../types/permissions';
import { verify } from 'hono/jwt';

export const createUserJwtAuthMiddleware = (secret: string) => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    try {
      const payload = await verify(token, secret, 'HS256');
      c.set('jwtPayload', payload);
      c.set('isSystem', false);
      return next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
};

export const createSystemJwtAuthMiddleware = (secret: string) => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    try {
      const payload = await verify(token, secret, 'HS256');

      if (payload.type !== 'system') {
        return c.json({ error: 'System token required' }, 401);
      }

      c.set('jwtPayload', payload);
      c.set('isSystem', true);
      return next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
};

export const requirePermission = (permission: Permission) => {
  return async (c: Context, next: Next) => {
    const isSystemToken = c.get('isSystem');
    if (isSystemToken) {
      return next();
    }

    const payload = c.get('jwtPayload');
    const permissions = payload?.permissions || [];

    if (!permissions.includes(permission)) {
      return c.json(
        { error: 'Forbidden', message: `Missing permission: ${permission}` },
        403
      );
    }

    return next();
  };
};

export const requireRole = (role: 'admin' | 'member') => {
  return async (c: Context, next: Next) => {
    const isSystemToken = c.get('isSystem');
    if (isSystemToken) {
      return next();
    }

    const payload = c.get('jwtPayload');
    if (payload?.role !== role) {
      return c.json(
        { error: 'Forbidden', message: `Requires ${role} role` },
        403
      );
    }

    return next();
  };
};

export const requireSystemAccess = () => {
  return async (c: Context, next: Next) => {
    const isSystemToken = c.get('isSystem');
    if (!isSystemToken) {
      return c.json({ error: 'Forbidden', message: 'System access only' }, 403);
    }
    return next();
  };
};
