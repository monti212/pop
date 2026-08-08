import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
  const { user, profile, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      // Staff surface: supa_admin, admin, and prime (treated as staff).
      //
      // NOTE: this guard only decides which pages RENDER. What the pages can READ
      // is decided independently by RLS via is_admin(). Keep the two in sync — if a
      // role can reach a page but fails the RLS check, the page renders with silent
      // zeros (an RLS denial returns an empty set, not an error), which is exactly
      // how the knowledge base appeared to hold 0 of its 185 documents.
      //
      // The previous `(profile as any).is_admin === true` check was dead: there is
      // no is_admin column on user_profiles, so it always evaluated to false.
      if (user && profile) {
        const isAdmin = profile.team_role === 'supa_admin' ||
                       profile.team_role === 'admin' ||
                       profile.team_role === 'prime' ||
                       (profile.team_role as string) === 'optimus_prime'; // legacy
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