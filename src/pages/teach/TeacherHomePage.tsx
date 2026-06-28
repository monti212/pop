import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, BookOpen, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * TeacherHomePage — the GreyEd teacher home (S1, in progress).
 * S0 establishes the greeting hero + layout; S1 wires today's classes,
 * quick stats, the mini Ask/Do panel, and recent lessons to the services.
 */
const TeacherHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const firstName = useMemo(() => {
    const n = (profile as any)?.name || (profile as any)?.full_name || user?.email?.split('@')[0] || 'there';
    return String(n).split(/[\s@._-]+/)[0];
  }, [profile, user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${firstName}`;
  }, [firstName]);

  const dateLine = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );

  const shortcuts = [
    { label: 'Take a register', icon: ClipboardList, to: '/teach/classes' },
    { label: 'Open lessons', icon: BookOpen, to: '/teach/lessons' },
    { label: 'Ask GreyEd', icon: MessageCircle, to: '/teach/ask' },
  ];

  return (
    <div className="p-7 animate-w-fade">
      {/* greeting hero */}
      <div className="relative overflow-hidden rounded-[20px] px-[30px] py-6 mb-[22px] text-white bg-gradient-to-br from-greyed-navy to-[#0B1640] flex items-start justify-between">
        <div className="relative z-[1]">
          <div className="font-bold text-[10px] tracking-[0.18em] uppercase opacity-55 mb-[10px]">
            {dateLine} · Kanye Primary School
          </div>
          <h2 className="font-display font-semibold text-[30px] m-0 mb-2 tracking-[-0.02em]">{greeting}</h2>
          <div className="text-[15px] opacity-75 leading-[1.5]">
            GreyEd helps. You decide. — your day, your classes, your lessons in one place.
          </div>
        </div>
        <span className="absolute -top-[60px] -right-[40px] w-[200px] h-[200px] rounded-full bg-greyed-blue/10" />
      </div>

      {/* quick shortcuts (placeholder until S1 wires today's classes + stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {shortcuts.map(({ label, icon: Icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="bg-white border border-greyed-line rounded-16 p-5 text-left flex items-center gap-3 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
          >
            <span className="w-11 h-11 rounded-[13px] bg-greyed-tile text-greyed-navy flex items-center justify-center flex-none">
              <Icon size={20} />
            </span>
            <span className="flex-1 font-display font-semibold text-[16px] text-greyed-navy">{label}</span>
            <ArrowRight size={18} className="text-greyed-ink" />
          </button>
        ))}
      </div>

      <p className="mt-6 text-[13px] text-greyed-faint">
        Today's classes, quick stats, the mini Ask/Do panel, and recent lessons land here next (S1).
      </p>
    </div>
  );
};

export default TeacherHomePage;
