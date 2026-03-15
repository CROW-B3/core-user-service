export enum Permission {
  INTERACTIONS_READ = 'interactions:read',
  INTERACTIONS_WRITE = 'interactions:write',
  INTERACTIONS_DELETE = 'interactions:delete',

  PATTERNS_READ = 'patterns:read',
  PATTERNS_WRITE = 'patterns:write',
  PATTERNS_DELETE = 'patterns:delete',

  CHAT_READ = 'chat:read',
  CHAT_WRITE = 'chat:write',
  CHAT_WEB_READ = 'chat:web:read',
  CHAT_CCTV_READ = 'chat:cctv:read',
  CHAT_SOCIAL_READ = 'chat:social:read',

  TEAM_MANAGE = 'team:manage',
  BILLING_MANAGE = 'billing:manage',
  API_KEYS_MANAGE = 'api_keys:manage',
}

export type PermissionList = Permission[];

export const ADMIN_PERMISSIONS: PermissionList = [
  Permission.INTERACTIONS_READ,
  Permission.INTERACTIONS_WRITE,
  Permission.INTERACTIONS_DELETE,
  Permission.PATTERNS_READ,
  Permission.PATTERNS_WRITE,
  Permission.PATTERNS_DELETE,
  Permission.CHAT_READ,
  Permission.CHAT_WRITE,
  Permission.CHAT_WEB_READ,
  Permission.CHAT_CCTV_READ,
  Permission.CHAT_SOCIAL_READ,
  Permission.TEAM_MANAGE,
  Permission.BILLING_MANAGE,
  Permission.API_KEYS_MANAGE,
];

export const MEMBER_PERMISSIONS: PermissionList = [
  Permission.INTERACTIONS_READ,
  Permission.PATTERNS_READ,
  Permission.CHAT_READ,
];

const buildModuleSpecificPermissions = (modules: {
  web: boolean;
  cctv: boolean;
  social: boolean;
}): Permission[] => {
  const modulePermissionMapping: [boolean, Permission][] = [
    [modules.web, Permission.CHAT_WEB_READ],
    [modules.cctv, Permission.CHAT_CCTV_READ],
    [modules.social, Permission.CHAT_SOCIAL_READ],
  ];

  return modulePermissionMapping
    .filter(([isEnabled]) => isEnabled)
    .map(([, permission]) => permission);
};

export const fetchPermissionsForRole = (
  role: 'admin' | 'member',
  modules: { web: boolean; cctv: boolean; social: boolean }
): PermissionList => {
  if (role === 'admin') return ADMIN_PERMISSIONS;

  return [...MEMBER_PERMISSIONS, ...buildModuleSpecificPermissions(modules)];
};
