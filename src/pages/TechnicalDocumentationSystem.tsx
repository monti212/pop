import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Menu, X, ChevronRight, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavigationSidebar from '../components/TechnicalDocs/NavigationSidebar';
import ContentArea from '../components/TechnicalDocs/ContentArea';
import AIAssistantPanel from '../components/TechnicalDocs/AIAssistantPanel';
import { getPageById, getPageBySlug, incrementViewCount, logActivity } from '../services/documentationService';
import type { DocumentationPage } from '../services/documentationService';

const TechnicalDocumentationSystem: React.FC = () => {
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId?: string }>();
  const { user } = useAuth();

  const [currentPage, setCurrentPage] = useState<DocumentationPage | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false); // Sidebar now hidden by default
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsNavOpen(false);
        setIsAIOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load page or create new one based on 10-minute session logic
  useEffect(() => {
    const loadOrCreatePage = async () => {
      if (!user) return;

      const LAST_PAGE_SESSION_KEY = 'upages_last_page_id';
      const LAST_OPENED_TIME_KEY = 'upages_last_opened_time';
      const TEN_MINUTES_MS = 10 * 60 * 1000;

      setIsLoading(true);
      try {
        // If there's a specific pageId in URL, load that page
        if (pageId) {
          const page = await getPageById(pageId);
          if (page) {
            setCurrentPage(page);
            await incrementViewCount(pageId);
            await logActivity(pageId, user.id, 'view', {});
            // Update session storage
            sessionStorage.setItem(LAST_PAGE_SESSION_KEY, pageId);
            sessionStorage.setItem(LAST_OPENED_TIME_KEY, Date.now().toString());
          }
        } else {
          // No pageId in URL - check session logic
          const lastPageId = sessionStorage.getItem(LAST_PAGE_SESSION_KEY);
          const lastOpenedTime = sessionStorage.getItem(LAST_OPENED_TIME_KEY);
          const now = Date.now();

          let shouldLoadLastPage = false;
          if (lastPageId && lastOpenedTime) {
            const timeSinceLastOpen = now - parseInt(lastOpenedTime, 10);
            shouldLoadLastPage = timeSinceLastOpen < TEN_MINUTES_MS;
          }

          if (shouldLoadLastPage && lastPageId) {
            // Load last page if within 10 minutes
            const page = await getPageById(lastPageId);
            if (page) {
              setCurrentPage(page);
              navigate(`/technical-docs/${lastPageId}`, { replace: true });
              await incrementViewCount(lastPageId);
              await logActivity(lastPageId, user.id, 'view', {});
            }
          } else {
            // Create new page if more than 10 minutes or no last page
            // For now, just set currentPage to null to show empty state
            // The ContentArea component should handle creating a new page
            setCurrentPage(null);
          }

          // Update last opened time
          sessionStorage.setItem(LAST_OPENED_TIME_KEY, now.toString());
        }
      } catch (error) {
        console.error('Error loading page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrCreatePage();
  }, [pageId, user, navigate]);

  const handlePageSelect = (page: DocumentationPage) => {
    navigate(`/technical-docs/${page.id}`);
    if (isMobile) {
      setIsNavOpen(false);
    }
  };

  const handlePageUpdate = (updatedPage: DocumentationPage) => {
    setCurrentPage(updatedPage);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal Header - Notion-style */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-200"
              aria-label="Toggle navigation"
              title="Pages menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-200"
              aria-label="Back to home"
              title="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentPage && (
              <div className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1 rounded-md bg-gray-50">
                <Eye className="w-3.5 h-3.5" />
                <span className="font-medium">{currentPage.view_count} views</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout - Full screen content only */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar - Overlay style */}
        <AnimatePresence>
          {isNavOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-30"
                style={{ top: '49px' }}
                onClick={() => setIsNavOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 z-40 w-full sm:w-80 bg-white border-r border-gray-200 overflow-hidden flex flex-col shadow-2xl"
                style={{ top: '49px', bottom: 0 }}
              >
                <NavigationSidebar
                  currentPageId={currentPage?.id}
                  onPageSelect={handlePageSelect}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Full Screen Content Area - Notion-style */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 sm:px-12 py-8">
            <ContentArea
              page={currentPage}
              isLoading={isLoading}
              onPageUpdate={handlePageUpdate}
            />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobile && (isNavOpen || isAIOpen) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-30"
          style={{ top: '57px' }}
          onClick={() => {
            setIsNavOpen(false);
            setIsAIOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TechnicalDocumentationSystem;
