import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Lightbulb,
  Megaphone,
  Menu,
  School,
  Sparkles,
  Users,
} from 'lucide-react';
import ConversationList from '../components/Chat/ConversationList';
import SettingsModal from '../components/Settings/SettingsModal';
import { useLanguage } from '../context/LanguageContext';
import {
  getPublishedTeacherAnnouncements,
  TeacherAnnouncement,
} from '../services/announcementService';
import popLogo from '../assets/pencils-of-promise-logo.png';

interface PoPHomePageProps {
  onSignOut: () => void;
  userSubscription: any;
}

const missionStatement =
  'Pencils of Promise believes every child should have access to quality education. We create Schools, Programs and Global Communities around the common goal of education for all.';

const visionStatement =
  'We know that we can create a better world through education.';

const educationFunFacts = [
  {
    label: 'Fun fact',
    title: 'A trained teacher can shape hundreds of futures.',
    body: 'Across African classrooms, steady teacher support can ripple through many learners, families, and communities over time.',
  },
  {
    label: 'Education in Africa',
    title: 'Reading grows faster when stories feel local.',
    body: 'Lessons that connect to familiar places, names, and languages help learners build confidence and meaning.',
  },
  {
    label: 'Bright idea',
    title: 'Community turns schools into shared spaces.',
    body: 'When families, local leaders, and teachers move together, schools become places where whole communities invest in learning.',
  },
  {
    label: 'Did you know?',
    title: 'Girls education strengthens communities.',
    body: 'Supporting girls to stay in school is linked with stronger health, leadership, and opportunity across generations.',
  },
  {
    label: 'Classroom spark',
    title: 'Technology works best beside teachers.',
    body: 'Digital tools make the biggest difference when they support teachers, local context, and everyday classroom needs.',
  },
];

const missionPillars = [
  {
    icon: School,
    title: 'Schools',
    body: 'Spaces where learners feel ready to read, think, and participate.',
    color: '#0170b9',
    bg: '#E6F2FA',
  },
  {
    icon: GraduationCap,
    title: 'Programs',
    body: 'Teacher support, coaching, and materials close to daily lessons.',
    color: '#0096B3',
    bg: '#E6F7FA',
  },
  {
    icon: Users,
    title: 'Communities',
    body: 'Families, local leaders, and schools moving toward education for all.',
    color: '#FF6A00',
    bg: '#FFF0E6',
  },
];

const formatAnnouncementDate = (value: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const PoPHomePage: React.FC<PoPHomePageProps> = ({ onSignOut, userSubscription }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [announcements, setAnnouncements] = useState<TeacherAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [currentFunFactIndex, setCurrentFunFactIndex] = useState(0);
  const { interfaceLanguage, responseLanguage, setInterfaceLanguage, setResponseLanguage } = useLanguage();
  const sidebarWidth = isSidebarCollapsed ? 64 : 240;
  const currentFunFact = educationFunFacts[currentFunFactIndex];
  const requestNewChat = () => {
    sessionStorage.setItem('uhuru_start_new_conversation', '1');
  };

  useEffect(() => {
    let isMounted = true;

    const loadAnnouncements = async () => {
      setAnnouncementsLoading(true);
      const result = await getPublishedTeacherAnnouncements();
      if (isMounted && result.success) {
        setAnnouncements(result.announcements || []);
      }
      if (isMounted) {
        setAnnouncementsLoading(false);
      }
    };

    loadAnnouncements();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentFunFactIndex((index) => (index + 1) % educationFunFacts.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#F7F5F2]">
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg text-[#002F4B] bg-white hover:bg-[#FEF7E8] transition-colors duration-150 ease-out md:hidden border border-[#f5b233]/20 shadow-sm"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative inset-y-0 left-0 z-40 flex-shrink-0 transition-all duration-300 ease-in-out border-r border-[#f5b233]/20 bg-white`}
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

        <main className="flex-1 overflow-y-auto bg-[#F7F5F2]">
          <div className="h-1.5 bg-gradient-to-r from-[#0170b9] via-[#f5b233] to-[#FF6A00]" />

          <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="pop-home-reveal relative overflow-hidden rounded-lg border border-[#E8DFD3] bg-white shadow-sm">
                <div className="grid min-h-[430px] gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-10">
                  <div className="relative z-10 flex flex-col justify-between gap-8">
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#0170b9]/20 bg-[#E6F2FA] px-3 py-1.5 text-sm font-bold text-[#0170b9]">
                          <Sparkles className="h-4 w-4 text-[#f5b233]" />
                          Pencils of Promise
                        </span>
                        <span className="rounded-full border border-[#E8DFD3] bg-[#F7F5F2] px-3 py-1.5 text-sm font-semibold text-[#19324A]">
                          Quality education for all
                        </span>
                      </div>

                      <div className="max-w-3xl">
                        <h1 className="text-4xl font-bold leading-tight text-[#19324A] sm:text-5xl lg:text-6xl">
                          One PoP promise at a time.
                        </h1>
                        <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-[#475766]">
                          {missionStatement}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to="/chat?new=1"
                        onClick={requestNewChat}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0170b9] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#005F9E]"
                      >
                        Start a new chat
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/teach"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E8DFD3] bg-white px-5 py-3 text-sm font-bold text-[#19324A] transition-colors hover:bg-[#FEF7E8]"
                      >
                        Open GreyEd Teach
                        <BookOpen className="h-4 w-4 text-[#FF6A00]" />
                      </Link>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="pop-home-reveal pop-home-delay-1 rounded-lg border border-[#E8DFD3] bg-[#19324A] p-5 text-white shadow-sm">
                      <img
                        src={popLogo}
                        alt="Pencils of Promise"
                        className="mb-8 h-10 w-auto brightness-0 invert"
                      />
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#f5b233]">
                        Vision
                      </p>
                      <p className="mt-3 text-2xl font-bold leading-8">
                        {visionStatement}
                      </p>
                    </div>

                    <aside className="pop-home-reveal pop-home-delay-2 pop-fun-fact-card rounded-lg border border-[#F1D7A4] bg-[#FFF7E8] p-5 shadow-sm">
                      <div
                        key={`fun-fact-bulb-${currentFunFactIndex}`}
                        className="pop-fun-fact-bulb mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#FF6A00] text-white"
                        aria-hidden="true"
                      >
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div
                        key={`fun-fact-copy-${currentFunFactIndex}`}
                        className="pop-fun-fact-copy"
                        aria-live="polite"
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
                          {currentFunFact.label}
                        </p>
                        <h2 className="mt-2 text-xl font-bold leading-7 text-[#19324A]">
                          {currentFunFact.title}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-[#475766]">
                          {currentFunFact.body}
                        </p>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {missionPillars.map((pillar, index) => {
                  const Icon = pillar.icon;
                  return (
                    <article
                      key={pillar.title}
                      className="pop-home-reveal rounded-lg border border-[#E8DFD3] bg-white p-5 shadow-sm"
                      style={{ animationDelay: `${120 + index * 70}ms` }}
                    >
                      <div
                        className="mb-4 grid h-11 w-11 place-items-center rounded-lg"
                        style={{ background: pillar.bg, color: pillar.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-lg font-bold text-[#19324A]">
                        {pillar.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#475766]">
                        {pillar.body}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>

            <section className="pop-home-reveal pop-home-delay-3 mt-6 rounded-lg border border-[#E8DFD3] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#0170b9]">
                    PoP Updates
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#19324A]">
                    Announcements
                  </h2>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#FEF7E8] text-[#FF6A00]">
                  <Megaphone className="h-5 w-5" />
                </div>
              </div>

              {announcementsLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="h-32 rounded-lg border border-[#E8DFD3] bg-[#F7F5F2]"
                    />
                  ))}
                </div>
              ) : announcements.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {announcements.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="rounded-lg border border-[#E8DFD3] bg-[#F9F9F8] p-5"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0170b9]">
                          <CalendarDays className="h-4 w-4" />
                          {announcement.priority === 'high' ? 'Priority update' : 'Update'}
                        </span>
                        {announcement.published_at && (
                          <span className="text-xs font-medium text-[#687684]">
                            {formatAnnouncementDate(announcement.published_at)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-[#19324A]">
                        {announcement.title}
                      </h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#475766]">
                        {announcement.body}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-[#F9F9F8] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#E6F2FA] text-[#0170b9]">
                      <Megaphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#19324A]">
                        No PoP updates have been published yet.
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[#475766]">
                        When PoP shares training dates, classroom guidance, or programme updates, they will appear here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
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
