import React, { createContext, useContext, useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import AuthButtons from './components/AuthButtons';
import Logo from './components/Logo'; // Keep this import if it's used elsewhere
import NewFooter from './components/NewFooter';
import Hero from './components/Hero';
import LoginModal from './components/LoginModal';
import SignUpModal from './components/SignUpModal';
const ChatInterface = lazy(() => import('./components/Chat/ChatInterface'));
import { ConversationProvider } from './context/ConversationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { logger } from './utils/logger';
import { HeroSkeleton, LoadingSpinner } from './components/SkeletonLoader';
import DemoChatLogin from './components/DemoChatLogin';
import MeetHilousAI from './components/MeetHilousAI';
import WhatHilousCanDo from './components/WhatHilousCanDo';
import HowItWorksSection from './components/HowItWorksSection';
import GrowingWithContinentSection from './components/GrowingWithContinentSection';
import CommunityImpactSection from './components/CommunityImpactSection';
import DigitizingKnowledgeSection from './components/DigitizingKnowledgeSection';
import MeetPaxSection from './components/MeetPaxSection';
import FAQSection from './components/FAQSection';
import WhyUhuruSection from './components/WhyUhuruSection';
import ProductTiersSection from './components/ProductTiersSection';
import UhuruLLMSection from './components/UhuruLLMSection';
import TermsAndConditions from './pages/TermsAndConditions';
import HowPaxPowersHilous from './pages/HowPaxPowersHilous';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { User, LogIn } from 'lucide-react';
import { supabase } from './services/authService';
import { signIn, signUp, signOut } from './services/authService';
import ProtectedRoute from './components/ProtectedRoute';
import FreemiumCheckoutRedirect from './components/FreemiumCheckoutRedirect';
import PricingSection from './components/PricingSection';
import ApiDocumentation from './pages/ApiDocumentation';
import { createCheckoutSession } from './services/stripeService';
import AdminLogin from './pages/AdminLogin';
const DashboardOverview = lazy(() => import('./pages/admin/DashboardOverview'));
const UserAnalytics = lazy(() => import('./pages/admin/UserAnalytics'));
const MessageAnalytics = lazy(() => import('./pages/admin/MessageAnalytics'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth'));
import AdminRoute from './components/AdminRoute'; // Keep this import if it's used elsewhere
const ComprehensiveAdminDashboard = lazy(() => import('./pages/admin/ComprehensiveAdminDashboard'));
const WhatsAppMessages = lazy(() => import('./pages/admin/WhatsAppMessages'));
const CostBreakdownMaker = lazy(() => import('./pages/admin/CostBreakdownMaker'));
const UhuruDocsPage = lazy(() => import('./pages/UhuruOfficePage'));
const UhuruSheetsPage = lazy(() => import('./pages/UhuruSheetsPage'));
const UhuruFilesPage = lazy(() => import('./pages/UhuruFilesPage'));
const TechnicalDocumentationSystem = lazy(() => import('./pages/TechnicalDocumentationSystem'));
import DocumentMigrationPrompt from './components/DocumentMigrationPrompt';
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContentInner />
      </ThemeProvider>
    </AuthProvider>
  );
}

const AppContentInner: React.FC = () => {
  const { user, profile, isLoading, isAuthenticated, refreshProfile } = useAuth();
  
  // Define userSubscription from profile or default
  const userSubscription = profile?.subscription_tier || 'free';
  
  // Add states for initial chat question flow
  const [initialChatQuestion, setInitialChatQuestion] = useState<string | null>(null);
  const [shouldShowSignUpAfterInitialMessage, setShouldShowSignUpAfterInitialMessage] = useState(false);

  // Add states for initial chat question flow
  const [showSignupModalForHeroInput, setShowSignupModalForHeroInput] = useState(false);
  const [postSignupInitialQuestion, setPostSignupInitialQuestion] = useState<string | null>(null);

  const [authState, setAuthState] = useState({
    showLoginModal: false,
    showSignUpModal: false,
    showChatInterface: false
  });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track if chat should remain open based on user intent
  const [chatIntentOpen, setChatIntentOpen] = useState(false);

  // Page detection - must be defined before useEffect hooks that reference them
  const isTermsPage = location.pathname === '/terms';
  const isHowPaxPowersHilousPage = location.pathname === '/how-pax-powers-hilous';
  const isPrivacyPolicyPage = location.pathname === '/privacy';
  const isResetPasswordPage = location.pathname === '/reset-password';
  const isApiDocsPage = location.pathname === '/api-docs';
  const isAdminLoginPage = location.pathname === '/admin/login';
  const isAdminDashboardPage = location.pathname.startsWith('/admin/dashboard');
  const isChatPage = location.pathname === '/chat';

  // U Pages detection
  const isUFilesPage = location.pathname === '/uhuru-files';
  const isUOfficePage = location.pathname === '/uhuru-office';
  const isUSheetsPage = location.pathname === '/uhuru-sheets';
  const isTechnicalDocsPage = location.pathname.startsWith('/technical-docs');
  const isUPage = isUFilesPage || isUOfficePage || isUSheetsPage || isTechnicalDocsPage;

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
                              isAdminLoginPage || isAdminDashboardPage;

      if (!isOnSpecialPage && location.pathname !== '/chat') {
        // Use navigate to go to chat route instead of modal
        navigate('/chat');
        sessionStorage.setItem('uhuru_chat_open', 'true');
      }
    }
  }, [isAuthenticated, isLoading, chatIntentOpen, navigate, location.pathname, isUPage, isTermsPage, isPrivacyPolicyPage, isResetPasswordPage, isApiDocsPage, isAdminLoginPage, isAdminDashboardPage]);

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
    setShouldShowSignUpAfterInitialMessage(false);
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
      <DocumentMigrationPrompt />
      <Routes>
        {/* Dedicated Chat Route - Protected */}
        <Route path="/chat" element={
          isAuthenticated ? (
            <Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}>
              <ChatInterface
                onClose={handleSignOut}
                userSubscription={userSubscription}
                initialChatQuestion={initialChatQuestion}
                shouldShowSignUpAfterInitialMessage={shouldShowSignUpAfterInitialMessage}
                onShowSignUpModal={handleOpenSignUpModal}
                onInitialMessageProcessed={() => {
                  logger.debug('onInitialMessageProcessed called - clearing initial chat state');
                  setInitialChatQuestion(null);
                  setShouldShowSignUpAfterInitialMessage(false);
                }}
                postSignupInitialQuestion={postSignupInitialQuestion}
                onPostSignupMessageSent={() => {
                  logger.debug('onPostSignupMessageSent called - clearing postSignupInitialQuestion');
                  setPostSignupInitialQuestion(null);
                }}
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
        {/* U Pages Routes */}
        <Route path="/uhuru-office" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UhuruDocsPage /></Suspense>} />
        <Route path="/uhuru-sheets" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UhuruSheetsPage /></Suspense>} />
        <Route path="/uhuru-files" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UhuruFilesPage /></Suspense>} />
        <Route path="/technical-docs" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><TechnicalDocumentationSystem /></Suspense>} />
        <Route path="/technical-docs/:pageId" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><TechnicalDocumentationSystem /></Suspense>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Protected Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><ComprehensiveAdminDashboard /></Suspense>} />
          <Route path="/admin/dashboard" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><DashboardOverview /></Suspense>} />
          <Route path="/admin/users" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><UserAnalytics /></Suspense>} />
          <Route path="/admin/messages" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><MessageAnalytics /></Suspense>} />
          <Route path="/admin/health" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><SystemHealth /></Suspense>} />
          <Route path="/admin/whatsapp" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><WhatsAppMessages /></Suspense>} />
          <Route path="/admin/cost-breakdown" element={<Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}><CostBreakdownMaker /></Suspense>} />
        </Route>
        
        <Route path="/*" element={
          <>
            {isLoading ? (
              <HeroSkeleton />
            ) : (
              <div className="min-h-screen bg-sand-200 text-navy">
                {(isAuthenticated || authState.showChatInterface) && !isTermsPage && !isPrivacyPolicyPage && !isResetPasswordPage && !isApiDocsPage && !isAdminLoginPage && !isAdminDashboardPage && !isChatPage && !isUPage ? (
                  <Suspense fallback={<div className="min-h-screen bg-sand-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div></div>}>
                    <ChatInterface
                    onClose={handleSignOut}
                    userSubscription={userSubscription} // Keep this prop for now, will be removed later
                    initialChatQuestion={initialChatQuestion}
                    shouldShowSignUpAfterInitialMessage={shouldShowSignUpAfterInitialMessage}
                    onShowSignUpModal={handleOpenSignUpModal}
                    onInitialMessageProcessed={() => {
                      logger.debug('onInitialMessageProcessed called - clearing initial chat state');
                      setInitialChatQuestion(null);
                      setShouldShowSignUpAfterInitialMessage(false);
                    }}
                    postSignupInitialQuestion={postSignupInitialQuestion}
                    onPostSignupMessageSent={() => {
                      logger.debug('onPostSignupMessageSent called - clearing postSignupInitialQuestion');
                      setPostSignupInitialQuestion(null);
                    }}
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