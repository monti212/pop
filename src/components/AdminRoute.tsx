import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
  const { user, profile, isLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      // Hardcoded admin access for monti@orionx.xyz
      const hardcodedAdminEmail = 'monti@orionx.xyz';

      // Check if user has super admin team role (optimus_prime ONLY)
      // OR if user is the hardcoded admin email
      if (user && (
        user.email === hardcodedAdminEmail ||
        (profile && profile.team_role === 'optimus_prime')
      )) {
        setIsSuperAdmin(true);
      } else {
        setIsSuperAdmin(false);
      }
    }
  }, [user, profile, isLoading]);

  if (isLoading || isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div>
      </div>
    );
  }

  return isSuperAdmin ? <Outlet /> : <Navigate to="/chat" replace />;
};

export default AdminRoute;