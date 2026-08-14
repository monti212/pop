import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Droplets,
  GraduationCap,
  Menu,
  School,
  Sparkles,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ConversationList from '../components/Chat/ConversationList';
import SettingsModal from '../components/Settings/SettingsModal';
import { useLanguage } from '../context/LanguageContext';

interface PoPHomePageProps {
  onSignOut: () => void;
  userSubscription: any;
}

const snapshots = [
  {
    icon: GraduationCap,
    label: 'Teacher Support',
    title: 'PoP helps teachers turn ordinary classrooms into stronger reading spaces.',
    fact: 'Coaching, materials, and practical training keep the work close to daily lessons.',
    color: '#0170b9',
  },
  {
    icon: Droplets,
    label: 'Healthy Schools',
    title: 'Clean water and safe restrooms help students stay present and ready to learn.',
    fact: 'WASH programs connect health, dignity, and attendance in one school day.',
    color: '#0096B3',
  },
  {
    icon: School,
    label: 'Built Together',
    title: 'PoP builds with communities, not around them.',
    fact: 'Families, local leaders, and governments help shape school projects from the ground up.',
    color: '#f5b233',
  },
];

const PoPHomePage: React.FC<PoPHomePageProps> = ({ onSignOut, userSubscription }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { interfaceLanguage, responseLanguage, setInterfaceLanguage, setResponseLanguage } = useLanguage();
  const location = useLocation();
  const sidebarWidth = isSidebarCollapsed ? 64 : 240;
  const entryIndex = useMemo(() => {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] % snapshots.length;
  }, [location.key]);
  const [activeIndex, setActiveIndex] = useState(entryIndex);
  const activeSnapshot = snapshots[activeIndex];
  const ActiveIcon = activeSnapshot.icon;

  useEffect(() => {
    setActiveIndex(entryIndex);
  }, [entryIndex]);

  useEffect(() => {
    const rotateSnapshot = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % snapshots.length);
    }, 6500);

    return () => window.clearInterval(rotateSnapshot);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#F9F9F8] z-50 flex flex-col overflow-hidden">
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-12 text-[#002F4B] bg-white hover:bg-[#FEF7E8] transition-colors duration-150 ease-out md:hidden border border-[#f5b233]/20 shadow-sm"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative inset-y-0 left-0 z-40 flex-shrink-0 transition-all duration-700 ease-in-out border-r border-[#f5b233]/20 bg-white`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <ConversationList
            onClose={() => setShowSidebar(false)}
            onSignOut={onSignOut}
            isCollapsed={isSidebarCollapsed}
            onOpenSettings={() => setShowSettings(true)}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        <main className="flex-1 overflow-hidden bg-[#F9F9F8]">
          <section className="relative grid min-h-screen overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0170b9] via-[#f5b233] to-[#FF6A00]" />
            <motion.div
              className="absolute left-[12%] top-[16%] h-24 w-24 rounded-16 border-8 border-[#0170b9]/20"
              animate={{ rotate: [0, 14, -8, 0], x: [0, 18, -10, 0], y: [0, -14, 10, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-[8%] top-[18%] h-28 w-20 rounded-16 bg-[#f5b233]/25"
              animate={{ rotate: [8, -12, 10, 8], y: [0, 24, -12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[13%] left-[24%] h-4 w-44 rounded-full bg-[#0170b9]/20"
              animate={{ scaleX: [0.6, 1.15, 0.75, 0.6], x: [-40, 30, 0, -40] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[18%] right-[16%] h-4 w-56 rounded-full bg-[#f5b233]/30"
              animate={{ scaleX: [1, 0.5, 1.2, 1], x: [24, -36, 16, 24] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 self-center lg:grid-cols-[0.95fr_1.05fr]">
              <motion.div
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-5"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0170b9]/20 bg-white px-3 py-1.5 text-sm font-semibold text-[#0170b9] shadow-sm">
                  <Sparkles className="h-4 w-4 text-[#f5b233]" />
                  Pencils of Promise
                </div>
                <h1 className="max-w-2xl text-4xl font-bold leading-tight text-[#19324A] sm:text-5xl lg:text-6xl">
                  One PoP promise at a time.
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                className="relative min-h-[410px] overflow-hidden rounded-16 border border-[#E5E7EB] bg-white shadow-card"
              >
                <motion.div
                  className="absolute inset-0 bg-[linear-gradient(135deg,rgba(1,112,185,0.10),rgba(245,178,51,0.16),rgba(255,255,255,0.85))]"
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ backgroundSize: '220% 220%' }}
                />
                <motion.div
                  className="absolute -right-12 top-8 h-36 w-36 rounded-16 border-[18px] border-[#0170b9]/10"
                  animate={{ rotate: [0, 180, 360], scale: [1, 0.85, 1] }}
                  transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute bottom-9 left-8 h-16 w-32 rounded-16 bg-[#f5b233]/25"
                  animate={{ x: [0, 24, -12, 0], rotate: [-3, 8, -6, -3] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="relative z-10 flex min-h-[410px] flex-col justify-center p-7 sm:p-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSnapshot.title}
                      initial={{ opacity: 0, y: 24, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -22, scale: 0.96 }}
                      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                      className="space-y-6"
                    >
                      <motion.div
                        className="grid h-16 w-16 place-items-center rounded-16 text-white shadow-card"
                        style={{ backgroundColor: activeSnapshot.color }}
                        animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ActiveIcon className="h-8 w-8" />
                      </motion.div>
                      <div>
                        <p className="mb-3 text-sm font-bold uppercase text-[#0170b9]">
                          {activeSnapshot.label}
                        </p>
                        <h2 className="max-w-xl text-3xl font-bold leading-tight text-[#19324A] sm:text-4xl">
                          {activeSnapshot.title}
                        </h2>
                      </div>
                      <p className="max-w-lg text-base font-medium leading-7 text-[#475766]">
                        {activeSnapshot.fact}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          interfaceLanguage={interfaceLanguage}
          responseLanguage={responseLanguage}
          onLanguageChange={(type, language) => {
            if (type === 'interface') setInterfaceLanguage(language as any);
            else if (type === 'response') setResponseLanguage(language as any);
          }}
          onSignOut={onSignOut}
          userSubscription={userSubscription}
        />
      )}
    </div>
  );
};

export default PoPHomePage;
