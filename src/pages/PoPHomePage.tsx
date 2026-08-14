import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Droplets,
  GraduationCap,
  HeartHandshake,
  Menu,
  School,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import ConversationList from '../components/Chat/ConversationList';
import SettingsModal from '../components/Settings/SettingsModal';
import { useLanguage } from '../context/LanguageContext';

interface PoPHomePageProps {
  onSignOut: () => void;
  userSubscription: any;
}

const pillars = [
  {
    icon: GraduationCap,
    title: 'Teacher Support',
    body: 'PoP backs public primary teachers with workshops, coaching, materials, and classroom practices that help students read with confidence.',
    color: '#0170b9',
  },
  {
    icon: Droplets,
    title: 'WASH',
    body: 'Clean water, restrooms, filters, and hygiene education help make school a healthier place to learn, especially for girls.',
    color: '#0096B3',
  },
  {
    icon: School,
    title: 'School Builds',
    body: 'Safe classrooms are built with local communities and governments, so new spaces belong to the people who use them every day.',
    color: '#f5b233',
  },
  {
    icon: Target,
    title: 'Measured Impact',
    body: 'PoP keeps learning from data, observations, and feedback so each program can improve instead of simply repeat.',
    color: '#FF6A00',
  },
];

const promiseSteps = [
  'Local leaders guide country work from within the communities they serve.',
  'Families and communities contribute labor, materials, and decision-making.',
  'Teachers receive practical support long after a classroom opens.',
];

const PoPHomePage: React.FC<PoPHomePageProps> = ({ onSignOut, userSubscription }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { interfaceLanguage, responseLanguage, setInterfaceLanguage, setResponseLanguage } = useLanguage();
  const sidebarWidth = isSidebarCollapsed ? 64 : 240;

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

        <main className="flex-1 overflow-y-auto bg-[#F9F9F8]">
          <section className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0170b9] via-[#f5b233] to-[#FF6A00]" />

            <div className="mx-auto flex max-w-7xl flex-col gap-8">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="grid min-h-[42vh] items-center gap-8 pt-8 lg:grid-cols-[1.05fr_0.95fr]"
              >
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#0170b9]/20 bg-white px-3 py-1.5 text-sm font-semibold text-[#0170b9] shadow-sm">
                    <Sparkles className="h-4 w-4 text-[#f5b233]" />
                    Pencils of Promise
                  </div>
                  <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#19324A] sm:text-5xl lg:text-6xl">
                    Education works best when a whole community holds the pencil.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-[#475766] sm:text-lg">
                    PoP partners with communities in Ghana, Guatemala, and Laos to create safe, healthy, and engaging public primary school environments. The work blends school infrastructure, teacher support, clean water, and careful measurement.
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
                  className="relative min-h-[320px] overflow-hidden rounded-16 border border-[#E5E7EB] bg-white shadow-card"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(1,112,185,0.08),rgba(245,178,51,0.14),rgba(255,255,255,0.7))]" />
                  <motion.div
                    className="absolute left-8 top-8 h-20 w-20 rounded-full border-[14px] border-[#0170b9]/20"
                    animate={{ y: [0, -8, 0], rotate: [0, 6, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute bottom-8 right-8 h-24 w-24 rounded-16 bg-[#f5b233]/25"
                    animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative z-10 grid h-full min-h-[320px] place-items-center p-7">
                    <div className="w-full max-w-sm space-y-4">
                      {promiseSteps.map((step, index) => (
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: 0.25 + index * 0.12 }}
                          className="flex items-start gap-3 rounded-12 border border-white/80 bg-white/90 p-4 shadow-sm"
                        >
                          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#0170b9] text-sm font-bold text-white">
                            {index + 1}
                          </div>
                          <p className="text-sm font-medium leading-6 text-[#19324A]">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18, ease: [0.4, 0, 0.2, 1] }}
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                {pillars.map((pillar, index) => {
                  const Icon = pillar.icon;

                  return (
                    <motion.article
                      key={pillar.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.25 + index * 0.08 }}
                      whileHover={{ y: -4 }}
                      className="rounded-16 border border-[#E5E7EB] bg-white p-5 shadow-sm"
                    >
                      <div
                        className="mb-4 grid h-11 w-11 place-items-center rounded-12"
                        style={{ backgroundColor: `${pillar.color}1A`, color: pillar.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mb-2 text-lg font-bold text-[#19324A]">{pillar.title}</h2>
                      <p className="text-sm leading-6 text-[#475766]">{pillar.body}</p>
                    </motion.article>
                  );
                })}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="grid gap-4 pb-10 lg:grid-cols-[0.8fr_1.2fr]"
              >
                <div className="rounded-16 border border-[#E5E7EB] bg-[#19324A] p-6 text-white shadow-sm">
                  <BookOpen className="mb-4 h-7 w-7 text-[#f5b233]" />
                  <h2 className="mb-3 text-2xl font-bold">The short version</h2>
                  <p className="text-sm leading-6 text-white/80">
                    PoP does not just build a classroom and leave. It builds with communities, supports teachers inside those classrooms, helps students stay healthy, and keeps checking what is working.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-16 border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <Users className="mb-4 h-6 w-6 text-[#0170b9]" />
                    <h3 className="mb-2 text-lg font-bold text-[#19324A]">Local by design</h3>
                    <p className="text-sm leading-6 text-[#475766]">
                      Country leadership comes from the countries where PoP works, keeping decisions close to the lived realities of schools and families.
                    </p>
                  </div>

                  <div className="rounded-16 border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <HeartHandshake className="mb-4 h-6 w-6 text-[#f5b233]" />
                    <h3 className="mb-2 text-lg font-bold text-[#19324A]">Built together</h3>
                    <p className="text-sm leading-6 text-[#475766]">
                      Communities, governments, and partners share responsibility, which is why the work is meant to last beyond one project cycle.
                    </p>
                  </div>
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
