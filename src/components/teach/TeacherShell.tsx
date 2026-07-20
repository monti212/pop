import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Home, Users, BookOpen, MessageCircle, Globe, Plus, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import popLogo from '../../assets/pencils-of-promise-logo.png';

/**
 * TeacherShell — the GreyEd teacher web app frame (S0).
 *
 * 240px navy sidebar (GreyEd × PoP lockup, primary nav, user card + language)
 * + a 60px top bar (breadcrumb + title + contextual action) + the routed content
 * area. Child screens render through <Outlet/>. Faithful to `GreyEd Web App.dc.html`;
 * reuses the repo's existing greyed-* tokens, Inter/Space Grotesk, and lucide-react.
 */

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home, path: '/teach' },
  { key: 'classes', label: 'Classes', icon: Users, path: '/teach/classes' },
  { key: 'lessons', label: 'Lessons', icon: BookOpen, path: '/teach/lessons' },
  { key: 'ask', label: 'Ask', icon: MessageCircle, path: '/teach/ask' },
];

// Per-route top-bar chrome. Action buttons are wired to real behaviour in the
// screen slices (S2 classes, S3 lessons); here they emit a window event the
// pages can listen for, so the shell stays decoupled from screen internals.
const TOPBAR: Record<string, { bread: string; title: string; action?: { label: string; event: string } }> = {
  '/teach': { bread: 'Today', title: 'Home' },
  '/teach/classes': { bread: 'Your classes', title: 'Classes', action: { label: 'New class', event: 'teach:new-class' } },
  '/teach/lessons': { bread: 'Lesson plans', title: 'Lessons', action: { label: 'New lesson', event: 'teach:new-lesson' } },
  '/teach/ask': { bread: 'Assistant', title: 'Ask GreyEd' },
};

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

  const displayName = (profile as any)?.name || (profile as any)?.full_name || user?.email?.split('@')[0] || 'Teacher';
  const roleLabel = (profile as any)?.occupation || 'Teacher';
  const initials = initialsFrom(displayName, user?.email);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-greyed-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[240px] flex-none bg-greyed-navy flex-col overflow-hidden">
        {/* lockup */}
        <div className="px-5 pt-[22px] pb-[14px] border-b border-white/[0.08]">
          <Link to="/teach" className="flex items-center gap-[9px]">
            <span className="font-display font-bold text-[17px] text-white tracking-[-0.01em]">GreyEd</span>
            <span className="text-white/35 font-light text-[15px]">×</span>
            <img src={popLogo} alt="Pencils of Promise" className="h-[14px] object-contain brightness-0 invert opacity-65" />
          </Link>
        </div>

        {/* nav */}
        <nav className="flex-1 px-3 py-[10px] flex flex-col gap-[2px] overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={[
                  'flex items-center gap-3 px-3 py-[11px] rounded-12 text-[14px] transition-colors',
                  active
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-white/60 font-medium hover:bg-white/[0.04] hover:text-white/90',
                ].join(' ')}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                {active && <span className="w-[6px] h-[6px] rounded-full bg-greyed-blue flex-none" />}
              </Link>
            );
          })}
        </nav>

        {/* user card */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-[10px] bg-greyed-blue/10 border border-greyed-blue/[0.18] rounded-12 px-3 py-[10px]">
            <span className="w-[34px] h-[34px] rounded-full bg-greyed-blue text-greyed-navy flex items-center justify-center font-semibold text-[13px] flex-none">
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px] text-white truncate">{displayName}</div>
              <div className="text-[11.5px] text-white/50 mt-px">{roleLabel}</div>
            </div>
            <button
              type="button"
              aria-label="Change language"
              onClick={() => window.dispatchEvent(new CustomEvent('teach:open-language'))}
              className="w-7 h-7 rounded-lg border-none bg-white/10 text-white/70 flex items-center justify-center flex-none hover:bg-white/15"
            >
              <Globe size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* top bar */}
        <div className="h-[60px] bg-white border-b border-greyed-line flex-none flex items-center px-7 gap-[14px]">
          <div className="flex-1">
            <div className="font-bold text-[10px] tracking-[0.16em] uppercase text-greyed-faint">{bar.bread}</div>
            <h1 className="font-display font-semibold text-[19px] text-greyed-navy mt-0.5 tracking-[-0.01em] leading-none">
              {bar.title}
            </h1>
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

        {/* content */}
        <div className="flex-1 overflow-y-auto bg-greyed-white relative pb-[76px] lg:pb-0">
          <Outlet />
        </div>
      </div>

      {/* mobile bottom tab bar — desktop uses the sidebar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-greyed-line flex px-1.5 pt-1.5 pb-2.5">
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
