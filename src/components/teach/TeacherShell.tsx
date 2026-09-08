import React, { useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, FolderOpen, Globe, Home, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import popLogo from '../../assets/pencils-of-promise-logo.png';

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: BookOpen, path: '/teach' },
  { key: 'students', label: 'Students', icon: Users, path: '/teach?view=students' },
  { key: 'documents', label: 'Documents', icon: FolderOpen, path: '/teach?view=documents' },
];

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = (name || email || 'T').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

const TeacherShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const activeKey = useMemo(() => {
    const activeView = new URLSearchParams(location.search).get('view');
    if (activeView === 'students' || activeView === 'documents') return activeView;
    return 'overview';
  }, [location.search]);

  const displayName = (profile as any)?.name || (profile as any)?.full_name || user?.email?.split('@')[0] || 'Teacher';
  const roleLabel = (profile as any)?.occupation || 'Teacher';
  const initials = initialsFrom(displayName, user?.email);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f8f6] font-sans">
      <aside className="hidden lg:flex w-[220px] xl:w-[240px] flex-none bg-gradient-to-b from-[#1d2758] to-[#151f49] flex-col overflow-hidden">
        <div className="px-5 pt-[28px] pb-[24px] border-b border-white/[0.08]">
          <Link
            to="/home"
            className="flex items-center"
            aria-label="Go to home"
          >
            <img src={popLogo} alt="Pencils of Promise" className="h-[42px] object-contain brightness-0 invert opacity-95" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-[26px] flex flex-col gap-3 overflow-y-auto">
          <Link
            to="/home"
            className="flex items-center gap-4 px-4 py-[14px] rounded-12 text-[15px] text-white/70 font-medium hover:bg-white/[0.05] hover:text-white transition-all"
          >
            <Home size={22} strokeWidth={1.9} />
            <span className="flex-1">Home</span>
          </Link>

          <div className="h-px bg-white/10 my-1" />

          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={[
                  'flex items-center gap-4 px-4 py-[14px] rounded-12 text-[15px] transition-all',
                  active
                    ? 'bg-white/[0.09] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-white/70 font-medium hover:bg-white/[0.05] hover:text-white',
                ].join(' ')}
              >
                <Icon size={22} strokeWidth={1.9} />
                <span className="flex-1">{item.label}</span>
                {active && <span className="w-[7px] h-[7px] rounded-full bg-[#8ed8ff] flex-none" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-[10px] bg-white/[0.08] border border-white/[0.13] rounded-12 px-3 py-[10px]">
            <span className="w-[40px] h-[40px] rounded-full bg-[#d5edff] text-greyed-navy flex items-center justify-center font-semibold text-[14px] flex-none">
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px] text-white truncate">{displayName}</div>
              <div className="text-[11.5px] text-white/55 mt-px">{roleLabel}</div>
            </div>
            <button
              type="button"
              aria-label="Change language"
              onClick={() => window.dispatchEvent(new CustomEvent('teach:open-language'))}
              className="w-8 h-8 rounded-lg border-none bg-white/10 text-white/80 flex items-center justify-center flex-none hover:bg-white/15"
            >
              <Globe size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#e8e6e0] flex px-1.5 pt-1.5 pb-2.5">
        <Link to="/home" className="flex-1 flex flex-col items-center py-[7px]">
          <Home size={20} className="text-greyed-ink" />
          <span className="text-[11px] mt-1 text-greyed-ink">Home</span>
        </Link>
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          const Icon = item.icon;
          return (
            <Link key={item.key} to={item.path} className="flex-1 flex flex-col items-center py-[7px]">
              <Icon size={20} className={active ? 'text-greyed-navy' : 'text-greyed-ink'} />
              <span className={`text-[11px] mt-1 ${active ? 'text-greyed-navy font-semibold' : 'text-greyed-ink'}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default TeacherShell;
