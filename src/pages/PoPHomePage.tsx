import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Megaphone,
  Menu,
  Sparkles,
} from 'lucide-react';
import ConversationList from '../components/Chat/ConversationList';
import SettingsModal from '../components/Settings/SettingsModal';
import { useLanguage } from '../context/LanguageContext';
import {
  getPublishedTeacherAnnouncements,
  TeacherAnnouncement,
} from '../services/announcementService';

interface PoPHomePageProps {
  onSignOut: () => void;
  userSubscription: any;
}

const missionStatement =
  'We believe every child should have access to quality education. We create schools, programs and global communities around the common goal of education for all.';

const funFact = {
  label: 'Fun fact',
  title: 'Teacher support works best when it stays close to the lesson.',
  body: 'PoP pairs practical workshops with coaching, materials, and classroom follow-up so new methods can become daily teaching habits.',
};

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
  const { interfaceLanguage, responseLanguage, setInterfaceLanguage, setResponseLanguage } = useLanguage();
  const sidebarWidth = isSidebarCollapsed ? 64 : 240;

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#F9F9F8]">
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

        <main className="flex-1 overflow-y-auto bg-[#F9F9F8]">
          <div className="h-1 bg-gradient-to-r from-[#0170b9] via-[#f5b233] to-[#FF6A00]" />

          <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0170b9]/20 bg-white px-3 py-1.5 text-sm font-semibold text-[#0170b9] shadow-sm">
                  <Sparkles className="h-4 w-4 text-[#f5b233]" />
                  Pencils of Promise
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#19324A] sm:text-5xl">
                    One PoP promise at a time.
                  </h1>
                  <p className="max-w-3xl text-lg font-medium leading-8 text-[#475766]">
                    {missionStatement}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {['Quality education', 'Supported teachers', 'Stronger readers'].map((item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-[#EAE7E3] bg-white px-4 py-3 text-sm font-semibold text-[#19324A]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-lg border border-[#EAE7E3] bg-white p-5 shadow-sm">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-[#0170b9] text-white">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#0170b9]">
                  {funFact.label}
                </p>
                <h2 className="mt-2 text-xl font-bold leading-7 text-[#19324A]">
                  {funFact.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#475766]">
                  {funFact.body}
                </p>
              </aside>
            </div>

            <section className="mt-10 border-t border-[#EAE7E3] pt-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#0170b9]">
                    PoP Updates
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#19324A]">
                    Announcements for teachers
                  </h2>
                </div>
                <div className="hidden h-10 w-10 place-items-center rounded-lg bg-[#FEF7E8] text-[#FF6A00] sm:grid">
                  <Megaphone className="h-5 w-5" />
                </div>
              </div>

              {announcementsLoading ? (
                <div className="rounded-lg border border-[#EAE7E3] bg-white p-5 text-sm text-[#475766]">
                  Loading updates...
                </div>
              ) : announcements.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {announcements.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="rounded-lg border border-[#EAE7E3] bg-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0170b9]">
                          <BookOpen className="h-4 w-4" />
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
                <div className="rounded-lg border border-[#EAE7E3] bg-white p-5 text-sm text-[#475766]">
                  No PoP updates have been published yet.
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
