import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '../types/workflow';

export interface PermissionMatrix {
  canApprove: boolean;
  canReject: boolean;
  canSimulate: boolean;
  canRetry: boolean;
  canViewBoxUrl: boolean;
  canViewAudit: boolean;
}

export type PermissionKey = keyof PermissionMatrix;

const ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  admin: {
    canApprove: true,
    canReject: true,
    canSimulate: true,
    canRetry: true,
    canViewBoxUrl: true,
    canViewAudit: true,
  },
  approver: {
    canApprove: true,
    canReject: true,
    canSimulate: false,
    canRetry: false,
    canViewBoxUrl: true,
    canViewAudit: true,
  },
  viewer: {
    canApprove: false,
    canReject: false,
    canSimulate: false,
    canRetry: false,
    canViewBoxUrl: false,
    canViewAudit: true,
  },
};

interface RbacContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  permissions: PermissionMatrix;
  hasPermission: (permission: PermissionKey) => boolean;
}

const RbacContext = createContext<RbacContextType | undefined>(undefined);

export function RbacProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');

  const permissions = ROLE_PERMISSIONS[role];

  const hasPermission = (permission: PermissionKey) => {
    return permissions[permission] ?? false;
  };

  return (
    <RbacContext.Provider value={{ role, setRole, permissions, hasPermission }}>
      {children}
    </RbacContext.Provider>
  );
}

export function useRbac() {
  const context = useContext(RbacContext);
  if (!context) {
    throw new Error('useRbac must be used within an RbacProvider');
  }
  return context;
}

interface PermissionGuardProps {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useRbac();
  if (hasPermission(permission)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
