import { hasRight } from "./access";
import { useStore } from "./store-api";

export function usePermissions() {
  const { currentUser } = useStore();

  const hasPermission = (right: string): boolean => {
    return hasRight(currentUser, right);
  };

  const canView = (): boolean => hasPermission("VIEW_DATA");
  const canEditStep = (): boolean => hasPermission("EDIT_STEP");
  const canEditSequence = (): boolean => hasPermission("EDIT_SEQUENCE");
  const canEditProduct = (): boolean => hasPermission("EDIT_PRODUCT");
  const canManageUsers = (): boolean => hasPermission("MANAGE_USERS");

  return {
    hasRight: hasPermission,
    canView,
    canEditStep,
    canEditSequence,
    canEditProduct,
    canManageUsers,
  };
}
