import React from 'react';

/** Shared on-brand placeholder for teacher screens still being built out. */
const TeacherComingSoon: React.FC<{ icon: React.ReactNode; title: string; note: string; slice: string }> = ({
  icon,
  title,
  note,
  slice,
}) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8">
    <span className="w-16 h-16 rounded-[18px] bg-greyed-tile text-greyed-navy flex items-center justify-center mb-4">
      {icon}
    </span>
    <div className="font-display font-semibold text-[20px] text-greyed-navy mb-2">{title}</div>
    <div className="text-[14px] text-greyed-faint max-w-[320px] leading-[1.5]">{note}</div>
    <span className="mt-4 text-[11px] font-bold tracking-[0.14em] uppercase text-greyed-ink bg-white border border-greyed-line rounded-full px-3 py-1">
      {slice}
    </span>
  </div>
);

export default TeacherComingSoon;
