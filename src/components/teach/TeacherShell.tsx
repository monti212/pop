import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Home, Users, BookOpen, MessageCircle, Plus, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';

/**
 * TeacherShell — the GreyEd teacher web app frame.
 * Uses the classroom-style PoP header/tabs while keeping the existing routed
 * teacher tools underneath.
 */

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Overview', icon: Home, path: '/teach' },
  { key: 'classes', label: 'Classes', icon: Users, path: '/teach/classes' },
  { key: 'lessons', label: 'Lessons', icon: BookOpen, path: '/teach/lessons' },
  { key: 'ask', label: 'Ask GreyEd', icon: MessageCircle, path: '/teach/ask' },
];

// Per-route top-bar chrome. Action buttons are wired to real behaviour in the
// screen slices (S2 classes, S3 lessons); here they emit a window event the
// pages can listen for, so the shell stays decoupled from screen internals.
const TOPBAR: Record<string, { bread: string; title: string; action?: { label: string; event: string } }> = {
  '/teach': { bread: 'GreyEd Teach', title: 'Overview', action: { label: 'New class', event: 'teach:new-class' } },
  '/teach/classes': { bread: 'Your classes', title: 'Classes', action: { label: 'New class', event: 'teach:new-class' } },
  '/teach/lessons': { bread: 'Lesson plans', title: 'Lessons', action: { label: 'New lesson', event: 'teach:new-lesson' } },
  '/teach/ask': { bread: 'Assistant', title: 'Ask GreyEd' },
};

const TeacherShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  // Gate: teachers only get here authenticated (mirrors AdminRoute's pattern).
  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const activeKey = useMemo(() => {
    const match = [...NAV_ITEMS]
      .sort((a, b) => b.path.length - a.path.length)
      .find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'));
    return match?.key ?? 'home';
  }, [location.pathname]);

  const bar = TOPBAR[location.pathname] ?? TOPBAR['/teach'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-greyed-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f8f8f6] flex flex-col overflow-hidden font-sans">
      <header className="bg-white shadow-sm border-b border-[#e8e6e0] px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="p-2 rounded-lg hover:bg-greyed-blue/20 text-greyed-navy transition-all flex items-center gap-2"
              title="Back to chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/teach" className="flex items-center gap-3 min-w-0">
              <Logo className="h-10 flex-none" />
              <span className="hidden sm:block h-8 w-px bg-[#e8e6e0]" />
              <span className="hidden sm:block min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-greyed-faint">{bar.bread}</span>
                <span className="block font-display font-semibold text-[19px] text-greyed-navy leading-none mt-0.5">{bar.title}</span>
              </span>
            </Link>
          </div>
          {bar.action && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(bar.action!.event))}
              className="inline-flex items-center gap-[7px] px-4 py-[9px] rounded-12 bg-greyed-navy text-white font-semibold text-[13.5px] hover:bg-greyed-navy/90"
            >
              <Plus size={16} />
              {bar.action.label}
            </button>
          )}
        </div>

        <nav className="flex items-center gap-2 mt-4 border-b border-[#e8e6e0] overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              to={item.path}
              className={`px-4 py-2 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                active
                  ? 'border-greyed-navy text-greyed-navy'
                  : 'border-transparent text-greyed-black/70 hover:text-greyed-navy'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default TeacherShell;
