import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
  const { user, profile, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      // Only allow admin users with is_admin flag or specific team roles
      if (user && profile) {
        const isAdmin = profile.is_admin === true ||
                       profile.team_role === 'supa_admin' ||
                       profile.team_role === 'admin';
        setHasAccess(isAdmin);
      } else {
        setHasAccess(false);
      }
    }
  }, [user, profile, isLoading]);

  if (isLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div>
      </div>
    );
  }

  return hasAccess ? <Outlet /> : <Navigate to="/chat" replace />;
};

export default AdminRoute;