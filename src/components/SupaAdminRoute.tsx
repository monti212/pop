import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SupaAdminRouteProps {
  children: React.ReactNode;
}

export default function SupaAdminRoute({ children }: SupaAdminRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || user.email !== 'monti@orionx.xyz') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
