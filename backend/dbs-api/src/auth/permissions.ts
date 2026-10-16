export type AuthenticatedRequestUser = {
  username?: string;
  role?: string;
  rights?: string[];
};

export type AuthenticatedRequest = {
  user?: AuthenticatedRequestUser;
};

export type AuthenticatedUser = {
  username: string;
  role: string;
  status: 'ENABLED' | 'DISABLED';
  rights: string[];
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  lastLogin: string | null;
  createdAt: string;
};

export type JwtPayload = {
  sub?: string;
  username?: string;
  role?: string;
  rights?: string[];
};

export type LoginResponse = {
  access_token: string;
  user: AuthenticatedUser;
};

const ADMIN_ROLE_IDS = new Set(['ADMIN', 'Admin']);
const RIGHT_ALIASES: Record<string, string[]> = {
  VIEW_DATA: ['VIEW_DATA', 'Voir Data'],
  EDIT_PRODUCT: ['EDIT_PRODUCT', 'Editer Produit'],
  EDIT_STEP: ['EDIT_STEP', 'Editer Step'],
  EDIT_SEQUENCE: ['EDIT_SEQUENCE', 'Editer Sequence'],
  MANAGE_USERS: ['MANAGE_USERS', 'Gerer Users'],
};

function hasRight(user: AuthenticatedRequestUser | undefined, right: string) {
  if (user?.role && ADMIN_ROLE_IDS.has(user.role)) {
    return true;
  }

  const userRights = new Set(user?.rights || []);
  const aliases = RIGHT_ALIASES[right] || [right];

  return aliases.some((alias) => userRights.has(alias));
}

export function canAccessSteps(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'VIEW_DATA') || hasRight(user, 'EDIT_STEP');
}

export function canManageSteps(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'EDIT_STEP');
}

export function canAccessSequences(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'VIEW_DATA') || hasRight(user, 'EDIT_SEQUENCE');
}

export function canManageSequences(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'EDIT_SEQUENCE');
}

export function canAccessProducts(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'VIEW_DATA') || hasRight(user, 'EDIT_PRODUCT');
}

export function canManageProducts(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'EDIT_PRODUCT');
}

export function canManageUsers(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'MANAGE_USERS');
}

export function canViewHistory(user: AuthenticatedRequestUser | undefined) {
  return hasRight(user, 'VIEW_DATA');
}
