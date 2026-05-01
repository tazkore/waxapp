import { useUserRole } from "./useUserRole";

export const useCanImportProducts = () => {
  const { role, loading, isAdmin, isSuperAdmin, isModerator } = useUserRole();
  const canImport = isAdmin || isSuperAdmin || isModerator;
  return { canImport, role, loading, isSuperAdmin };
};
