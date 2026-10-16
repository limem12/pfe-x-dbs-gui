import type { User } from "./api";

const ADMIN_ROLES = new Set(["ADMIN", "Admin"]);

const RIGHT_ALIASES: Record<string, string[]> = {
  VIEW_DATA: ["VIEW_DATA", "Voir Data"],
  EDIT_PRODUCT: ["EDIT_PRODUCT", "Editer Produit"],
  EDIT_STEP: ["EDIT_STEP", "Editer Step"],
  EDIT_SEQUENCE: ["EDIT_SEQUENCE", "Editer Sequence"],
  MANAGE_USERS: ["MANAGE_USERS", "Gerer Users"],
};

export function isAdminRole(role?: string | null): boolean {
  return role ? ADMIN_ROLES.has(role) : false;
}

export function hasRight(
  user: Pick<User, "role" | "rights"> | null | undefined,
  right: string,
): boolean {
  if (!user) {
    return false;
  }

  if (isAdminRole(user.role)) {
    return true;
  }

  const grantedRights = new Set(user.rights || []);
  const aliases = RIGHT_ALIASES[right] || [right];

  return aliases.some((alias) => grantedRights.has(alias));
}
