import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import NewFooter from './components/NewFooter';
import Hero from './components/Hero';
import LoginModal from './components/LoginModal';
import SignUpModal from './components/SignUpModal';
const ChatInterface = lazy(() => import('./components/Chat/ChatInterface'));
import { ConversationProvider } from './context/ConversationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { logger } from './utils/logger';
import { HeroSkeleton } from './components/SkeletonLoader';
import WhyUhuruSection from './components/WhyUhuruSection';
import ProductTiersSection from './components/ProductTiersSection';
import UhuruLLMSection from './components/UhuruLLMSection';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { signOut } from './services/authService';
import ApiDocumentation from './pages/ApiDocumentation';
import AdminLogin from './pages/AdminLogin';
import AdminRoute from './components/AdminRoute';
import SupaAdminRoute from './components/SupaAdminRoute';
const WhatsAppMessages = lazy(() => import('./pages/admin/WhatsAppMessages'));
const CostBreakdownMaker = lazy(() => import('./pages/admin/CostBreakdownMaker'));
const ComprehensiveAdminDashboard = lazy(() => import('./pages/admin/ComprehensiveAdminDashboard'));
const AIKnowledgeBase = lazy(() => import('./pages/admin/AIKnowledgeBase'));
const TokenUsage = lazy(() => import('./pages/admin/TokenUsage'));
const UhuruDocsPage = lazy(() => import('./pages/UhuruOfficePage'));
const UhuruSheetsPage = lazy(() => import('./pages/UhuruSheetsPage'));
const UClassPage = lazy(() => import('./pages/UhuruFilesPage'));
const ClassroomHomePage = lazy(() => import('./pages/ClassroomHomePage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const TechnicalDocumentationSystem = lazy(() => import('./pages/TechnicalDocumentationSystem'));
const SupaAdmin = lazy(() => import('./pages/SupaAdmin'));
const EnhancedSupaAdmin = lazy(() => import('./pages/EnhancedSupaAdmin'));
const LiveSystemMonitor = lazy(() => import('./pages/admin/LiveSystemMonitor'));
const PerformanceMetrics = lazy(() => import('./pages/admin/PerformanceMetrics'));
const TokenCostBreakdown = lazy(() => import('./pages/admin/TokenCostBreakdown'));
const ErrorLogsDashboard = lazy(() => import('./pages/admin/ErrorLogsDashboard'));

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppContentInner />
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const AppContentInner: React.FC = () => {
  const { profile, isLoading, isAuthenticated, refreshProfile } = useAuth();

  // Define userSubscription from profile or default
  const userSubscription = profile?.team_role || 'free';
  
  // Add states for initial chat question flow
  const [initialChatQuestion, setInitialChatQuestion] = useState<string | null>(null);

  // Add states for initial chat question flow
  const [showSignupModalForHeroInput, setShowSignupModalForHeroInput] = useState(false);
  const [postSignupInitialQuestion, setPostSignupInitialQuestion] = useState<string | null>(null);

  const [authState, setAuthState] = useState({
    showLoginModal: false,
    showSignUpModal: false,
    showChatInterface: false
  });
  
  const [, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track if chat should remain open based on user intent
  const [chatIntentOpen, setChatIntentOpen] = useState(false);

  // Page detection - must be defined before useEffect hooks that reference them
  const isTermsPage = location.pathname === '/terms';
  const isPrivacyPolicyPage = location.pathname === '/privacy';
  const isResetPasswordPage = location.pathname === '/reset-password';
  const isApiDocsPage = location.pathname === '/api-docs';
  const isAdminLoginPage = location.pathname === '/admin/login';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isSupaAdminPage = location.pathname.startsWith('/supa-admin');
  const isChatPage = location.pathname === '/chat';

  // GreyEd Pages detection
  const isGreyEdClassPage = location.pathname === '/uhuru-files' || location.pathname === '/greyed-class' || location.pathname === '/u-class';
  const isUOfficePage = location.pathname === '/uhuru-office';
  const isUSheetsPage = location.pathname === '/uhuru-sheets';
  const isClassPage = location.pathname.startsWith('/greyed-class') || location.pathname.startsWith('/u-class');
  const isTechnicalDocsPage = location.pathname.startsWith('/technical-docs');
  const isUPage = isGreyEdClassPage || isUOfficePage || isUSheetsPage || isClassPage || isTechnicalDocsPage;

  // Restore chat state from session storage on mount
  useEffect(() => {
    const savedChatState = sessionStorage.getItem('uhuru_chat_open');
    if (savedChatState === 'true' && isAuthenticated) {
      setChatIntentOpen(true);
      setAuthState(prev => ({
        ...prev,
        showChatInterface: true
      }));
    }
  }, []);

  // Open chat interface for authenticated users only if they intend to use it
  useEffect(() => {
    if (isAuthenticated && !isLoading && chatIntentOpen) {
      // Only navigate to chat if not already on a U page or other special page
      const isOnSpecialPage = isUPage || isTermsPage || isPrivacyPolicyPage ||
                              isResetPasswordPage || isApiDocsPage ||
                              isAdminLoginPage || isAdminPage || isSupaAdminPage;

      if (!isOnSpecialPage && location.pathname !== '/chat') {
        // Use navigate to go to chat route instead of modal
        navigate('/chat');
        sessionStorage.setItem('uhuru_chat_open', 'true');
      }
    }
  }, [isAuthenticated, isLoading, chatIntentOpen, navigate, location.pathname, isUPage, isTermsPage, isPrivacyPolicyPage, isResetPasswordPage, isApiDocsPage, isAdminLoginPage, isAdminPage, isSupaAdminPage]);

  // Clear chat intent when navigating to U pages
  useEffect(() => {
    if (isUPage) {
      setChatIntentOpen(false);
      // Don't clear sessionStorage completely, just ensure we don't auto-navigate
    }
  }, [isUPage]);
  
  // Prevent body scrolling when modals are open
  useEffect(() => {
    const hasOpenModal = authState.showLoginModal || 
                          authState.showSignUpModal ||
                          authState.showChatInterface;
    
    if (hasOpenModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [authState]);
  
  const handleOpenLoginModal = () => {
    setAuthState(prev => ({
      ...prev,
      showLoginModal: true,
      showSignUpModal: false
    }));
    setIsMobileMenuOpen(false);
  };

  const handleOpenSignUpModal = () => {
    setAuthState(prev => ({
      ...prev,
      showLoginModal: false,
      showSignUpModal: true
    }));
    setIsMobileMenuOpen(false);
  };
  
  
  const handleLoginSuccess = async () => {
    logger.debug('handleLoginSuccess called with state:', {
      initialChatQuestion,
      showSignupModalForHeroInput,
      postSignupInitialQuestion
    });

    setAuthState(prev => ({
      ...prev,
      showLoginModal: false
    }));

    if (showSignupModalForHeroInput && initialChatQuestion) {
      logger.debug('Login success - hero input flow detected, setting postSignupInitialQuestion:', initialChatQuestion);
      setChatIntentOpen(true);
      setPostSignupInitialQuestion(initialChatQuestion);
      navigate('/chat');
      setShowSignupModalForHeroInput(false);
      setInitialChatQuestion(null);
    } else {
      logger.debug('Login success - normal login flow, opening chat');
      setChatIntentOpen(true);
    }

    await refreshProfile();
  };

  const handleSignUpSuccess = async () => {
    logger.debug('handleSignUpSuccess called');
    setAuthState(prev => ({ ...prev, showSignUpModal: false }));
    setChatIntentOpen(true);
    await refreshProfile();
  };
  
  const handleCloseModal = () => {
    setAuthState(prev => ({
      ...prev,
      showLoginModal: false,
      showSignUpModal: false
    }));
  };

  const handleSignOut = async () => {
    logger.debug('handleSignOut called - clearing all chat state');
    await signOut();
    setAuthState({
      showLoginModal: false,
      showSignUpModal: false,
      showChatInterface: false
    });

    setInitialChatQuestion(null);
    setPostSignupInitialQuestion(null);
    setShowSignupModalForHeroInput(false);
    setChatIntentOpen(false);
    sessionStorage.removeItem('uhuru_chat_open');

    await refreshProfile();
    navigate('/');
  };

  const handleInitialQuestionSubmit = (question: string) => {
    logger.debug('handleInitialQuestionSubmit called with question:', question);
    setInitialChatQuestion(question);
    setShowSignupModalForHeroInput(true);
    setAuthState(prev => ({
      ...prev,
      showSignUpModal: true
    }));
  };

  // Listen for the custom event to open signup modal
  useEffect(() => {
    const handleCustomSignupEvent = () => {
      handleOpenSignUpModal();
    };
    
    document.addEventListener('openSignUpModal', handleCustomSignupEvent);
    
    return () => {
      document.removeEventListener('openSignUpModal', handleCustomSignupEvent);
    };
  }, []);

  return (
    <ConversationProvider>
      <Routes>
        {/* Dedicated Chat Route - Protected */}
        <Route path="/chat" element={
          isAuthenticated ? (
            <Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}>
              <ChatInterface
                onClose={handleSignOut}
                userSubscription={userSubscription}
              />
            </Suspense>
          ) : (
            <Navigate to="/" replace />
          )
        } />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/api-docs" element={<ApiDocumentation />} />
        {/* GreyEd Pages Routes */}
        <Route path="/uhuru-office" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UhuruDocsPage /></Suspense>} />
        <Route path="/uhuru-sheets" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UhuruSheetsPage /></Suspense>} />
        <Route path="/greyed-class" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UClassPage /></Suspense>} />
        <Route path="/u-class" element={<Navigate to="/greyed-class" replace />} />
        <Route path="/uhuru-files" element={<Navigate to="/greyed-class" replace />} />
        <Route path="/greyed-class/classroom/:classId" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><ClassroomHomePage /></Suspense>} />
        <Route path="/greyed-class/student/:studentId" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><StudentProfilePage /></Suspense>} />
        <Route path="/u-class/classroom/:classId" element={<Navigate to="/greyed-class/classroom/:classId" replace />} />
        <Route path="/u-class/student/:studentId" element={<Navigate to="/greyed-class/student/:studentId" replace />} />
        <Route path="/technical-docs" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><TechnicalDocumentationSystem /></Suspense>} />
        <Route path="/technical-docs/:pageId" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><TechnicalDocumentationSystem /></Suspense>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Protected Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><ComprehensiveAdminDashboard /></Suspense>} />
          <Route path="/admin/token-usage" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><TokenUsage /></Suspense>} />
          <Route path="/admin/whatsapp" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><WhatsAppMessages /></Suspense>} />
          <Route path="/admin/cost-breakdown" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><CostBreakdownMaker /></Suspense>} />
          <Route path="/admin/knowledge-base" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><AIKnowledgeBase /></Suspense>} />
        </Route>

        {/* Protected Supa Admin Route - Only for monti@orionx.xyz */}
        <Route element={<SupaAdminRoute />}>
          <Route path="/supa-admin" element={<Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center"><div className="text-white text-xl">Loading...</div></div>}><SupaAdmin /></Suspense>} />
          <Route path="/supa-admin/live" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><EnhancedSupaAdmin /></Suspense>} />
          <Route path="/supa-admin/monitor" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><LiveSystemMonitor /></Suspense>} />
          <Route path="/supa-admin/performance" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><PerformanceMetrics /></Suspense>} />
          <Route path="/supa-admin/token-cost" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><TokenCostBreakdown /></Suspense>} />
          <Route path="/supa-admin/error-logs" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><ErrorLogsDashboard /></Suspense>} />
        </Route>
        
        <Route path="/*" element={
          <>
            {isLoading ? (
              <HeroSkeleton />
            ) : (
              <div className="min-h-screen bg-sand-200 text-navy">
                {(isAuthenticated || authState.showChatInterface) && !isTermsPage && !isPrivacyPolicyPage && !isResetPasswordPage && !isApiDocsPage && !isAdminLoginPage && !isAdminPage && !isSupaAdminPage && !isChatPage && !isUPage ? (
                  <Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}>
                    <ChatInterface
                      onClose={handleSignOut}
                      userSubscription={userSubscription}
                    />
                  </Suspense>
                ) : (
                  <>
                    
                    {/* Login Modal */}
                    {authState.showLoginModal && (
                      <LoginModal 
                        onClose={handleCloseModal}
                        onSuccess={handleLoginSuccess}
                        onSignUp={handleOpenSignUpModal}
                      />
                    )}
                    
                    {/* Sign Up Modal */}
                    {authState.showSignUpModal && (
                      <SignUpModal 
                        onClose={handleCloseModal}
                        onSuccess={handleSignUpSuccess}
                        onSignIn={handleOpenLoginModal}
                        isHeroInputSignup={showSignupModalForHeroInput}
                        initialQuestion={initialChatQuestion}
                      />
                    )}


                    {/* Hero Section and other home page content */}
                    <Hero
                      onInitialQuestionSubmit={handleInitialQuestionSubmit}
                      onSignIn={handleOpenLoginModal}
                      onSignUp={handleOpenSignUpModal}
                      isAuthenticated={isAuthenticated}
                    />

                    {/* Why Uhuru Section - Hidden */}
                    <div style={{ display: 'none' }}>
                      <WhyUhuruSection />
                    </div>

                    {/* Uhuru LLM Section - Hidden */}
                    <div style={{ display: 'none' }}>
                      <UhuruLLMSection />
                    </div>

                    {/* Product Tiers Section - Hidden */}
                    <div style={{ display: 'none' }}>
                      <ProductTiersSection />
                    </div>

                    {/* Footer - Hidden */}
                    <div style={{ display: 'none' }}>
                      <NewFooter />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        } />
      </Routes>
    </ConversationProvider>
  );
};

export default App;