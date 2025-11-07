import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SupaAdminRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (user && user.email === 'monti@orionx.xyz') {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    }
  }, [user, isLoading]);

  if (isLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return hasAccess ? <Outlet /> : <Navigate to="/" replace />;
};

export default SupaAdminRoute;
