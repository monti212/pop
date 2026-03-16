import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  User,
  Shield,
  Globe,
  HelpCircle,
  Save,
  Check,
  LogOut,
  Search,
  Zap,
  CreditCard
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PasswordChangeForm from './PasswordChangeForm';
import PrivacySettings from './PrivacySettings';
import { supabase } from '../../services/authService';

interface SettingsModalProps {
  onClose: () => void;
  darkMode?: boolean; 
  onSignOut?: () => void;
  interfaceLanguage?: string;
  responseLanguage?: string;
  onLanguageChange?: (type: 'interface' | 'response', language: string) => void;
  onUpgradeClick?: () => void;
  userSubscription?: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  darkMode = false, // Ensure light mode by default for readability
  onSignOut = () => {},
  interfaceLanguage = 'english',
  responseLanguage = 'english',
  onLanguageChange = () => {},
  userSubscription
}) => {
  const { user } = useAuth();
  const { setAppTheme } = useTheme();
  const { t } = useLanguage();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);
  const [nameUpdateError, setNameUpdateError] = useState<string | null>(null);
  const [, _setShowMobileMenu] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'account' | 'language' | 'subscription' | 'upgrade' | 'privacy' | 'help'>('account');
  
  // Check if URL has tab parameter
  useEffect(() => {
  }, [userSubscription]);

  // Translations for the UI — kept only for FAQ fallback strings not yet in LanguageContext
  const translations: Record<string, Record<string, string>> = {
    english: {
      settings: "Settings",
      account: "Account",
      notifications: "Notifications",
      privacy: "Privacy",
      language: "Language",
      canvas: "Canvas",
      uhuruPro: "Uhuru Pro",
      uhuruDocs: "Uhuru Docs",
      apiKeys: "API Keys",
      help: "Help",
      upgrade: "Upgrade",
      billing: "Billing",
      signOut: "Sign Out",
      accountSettings: "Account Settings",
      name: "Name",
      email: "Email",
      changePassword: "Change Password",
      change: "Change",
      thisIsTheName: "This is the name you provided during signup",
      yourAccountEmail: "Your account email address",
      updateYourAccount: "Update your account password",
      notificationPreferences: "Notification Preferences",
      emailUpdates: "Email Updates",
      receiveEmailNotifications: "Receive email notifications about your account",
      productNews: "Product News",
      receiveUpdates: "Receive updates about new features and improvements",
      chatResponses: "Chat Responses",
      receiveEmailForChat: "Receive email notifications for chat responses when you're away",
      languageSettings: "Language Settings",
      interfaceLanguage: "Interface Language",
      controlsMenus: "This controls the language of menus and system messages",
      defaultResponse: "Default Response Language",
      uhuruWillRespond: "Uhuru will respond in this language by default",
      helpSupport: "Help & Support",
      contactSupport: "Contact Support",
      needHelp: "Need help? Our support team is ready to assist you.",
      contactUs: "Contact Support",
      frequentlyAsked: "Frequently Asked Questions",
      searchResults: "Search results",
      noFaqsFound: "No FAQs found matching",
      tryDifferent: "Try a different search term",
      aboutUhuru: "About Uhuru",
      version: "Version",
      madeWith: "Made with",
      botswana: "in Botswana",
      saveChanges: "Save Changes",
      settingsSaved: "Settings saved",
      searchFaqs: "Search FAQs...",
      close: "Close",
      upgradeToProPlan: "Upgrade to Pro Plan",
      canvasSettings: "Canvas Settings",
      uhuruProSettings: "Uhuru Pro Customization",
      uhuruDocsSettings: "Uhuru Docs Settings",
      billingSettings: "Billing & Subscription",
      manageBilling: "Manage your subscription and payment methods"
    },
    setswana: {
      settings: "Ditlhophiso",
      account: "Akhaonto",
      notifications: "Dikitsiso",
      privacy: "Sephiri",
      language: "Puo",
      canvas: "Khanvase",
      uhuruPro: "Uhuru Pro",
      uhuruDocs: "Uhuru Docs",
      apiKeys: "Dinotlolo tsa API",
      help: "Thuso",
      upgrade: "Tokafatsa",
      billing: "Dituelo",
      signOut: "Tswa",
      accountSettings: "Ditlhophiso tsa Akhaonto",
      name: "Leina",
      email: "Imeile",
      changePassword: "Fetola Khunololamoraba",
      change: "Fetola",
      thisIsTheName: "Ke leina le o le neileng fa o ikwadisa",
      yourAccountEmail: "Aterese ya imeile ya akhaonto ya gago",
      updateYourAccount: "Fetola khunololamoraba ya akhaonto ya gago",
      notificationPreferences: "Ditlhopho tsa Dikitsiso",
      emailUpdates: "Dikitsiso tsa Imeile",
      receiveEmailNotifications: "Amogela dikitsiso ka imeile ka akhaonto ya gago",
      productNews: "Dikgang tsa Ditlhagiswa",
      receiveUpdates: "Amogela dikgang ka ditlhabololo le ditshekatsheko",
      chatResponses: "Dikarabo tsa Puisano",
      receiveEmailForChat: "Amogela dikitsiso ka imeile ka dikarabo tsa puisano fa o seyo",
      languageSettings: "Ditlhophiso tsa Puo",
      interfaceLanguage: "Puo ya Tirisano",
      controlsMenus: "Se se laola puo ya dimenu le melaetsa ya thulaganyo",
      defaultResponse: "Puo ya Dikarabo tsa Tlwaelo",
      uhuruWillRespond: "Uhuru e tla araba ka puo e ka tlwaelo",
      helpSupport: "Thuso & Tshegetso",
      contactSupport: "Ikgolaganye le Thuso",
      needHelp: "O tlhoka thuso? Setlhopha sa rona sa thuso se ipaakanyeditse go go thusa.",
      contactUs: "Ikgolaganye le Thuso",
      frequentlyAsked: "Dipotso tse Di Botswang Gantsi",
      searchResults: "Diphitlhelelo tsa patlisiso",
      noFaqsFound: "Ga go na dipotso tse di bonweng tse di tsamaelanang le",
      tryDifferent: "Leka lefoko le lengwe la patlisiso",
      aboutUhuru: "Ka ga Uhuru",
      version: "Mofuta",
      madeWith: "E dirilwe ka",
      botswana: "kwa Botswana",
      saveChanges: "Boloka Diphetogo",
      settingsSaved: "Ditlhophiso di bolokegile",
      searchFaqs: "Batla Dipotso tse di botswang gantsi...",
      close: "Tswala",
      upgradeToProPlan: "Tokafatsa go Maemo a Pro",
      canvasSettings: "Ditlhophiso tsa Khanvase",
      uhuruProSettings: "Go fetola Uhuru Pro",
      uhuruDocsSettings: "Ditlhophiso tsa Uhuru Docs",
      billingSettings: "Dituelo le Peeletso",
      manageBilling: "Laola tuelo ya gago le mekgwa ya tuelo"
    },
    swahili: {
      settings: "Mipangilio",
      account: "Akaunti",
      notifications: "Arifa",
      privacy: "Faragha",
      language: "Lugha",
      canvas: "Kanvasi",
      uhuruPro: "Uhuru Pro",
      uhuruDocs: "Uhuru Docs",
      apiKeys: "Funguo za API",
      help: "Usaidizi",
      upgrade: "Boresha",
      billing: "Malipo",
      signOut: "Toka",
      accountSettings: "Mipangilio ya Akaunti",
      name: "Jina",
      email: "Barua pepe",
      changePassword: "Badilisha Nenosiri",
      change: "Badilisha",
      thisIsTheName: "Hili ni jina ulilotoa wakati wa kusajili",
      yourAccountEmail: "Barua pepe ya akaunti yako",
      updateYourAccount: "Sasisha nenosiri la akaunti yako",
      notificationPreferences: "Mapendeleo ya Arifa",
      emailUpdates: "Masasisho ya Barua Pepe",
      receiveEmailNotifications: "Pokea arifa za barua pepe kuhusu akaunti yako",
      productNews: "Habari za Bidhaa",
      receiveUpdates: "Pokea masasisho kuhusu vipengele vipya na maboresho",
      chatResponses: "Majibu ya Gumzo",
      receiveEmailForChat: "Pokea arifa za barua pepe kwa majibu ya gumzo ukiwa mbali",
      languageSettings: "Mipangilio ya Lugha",
      interfaceLanguage: "Lugha ya Kiolesura",
      controlsMenus: "Hii inadhibiti lugha ya menyu na ujumbe wa mfumo",
      defaultResponse: "Lugha ya Majibu ya Chaguo-Msingi",
      uhuruWillRespond: "Uhuru itajibu kwa lugha hii kwa chaguo-msingi",
      helpSupport: "Usaidizi na Msaada",
      contactSupport: "Wasiliana na Usaidizi",
      needHelp: "Unahitaji usaidizi? Timu yetu ya usaidizi iko tayari kukusaidia.",
      contactUs: "Wasiliana na Usaidizi",
      frequentlyAsked: "Maswali Yanayoulizwa Mara kwa Mara",
      searchResults: "Matokeo ya utafutaji",
      noFaqsFound: "Hakuna maswali yaliyopatikana yanayolingana na",
      tryDifferent: "Jaribu neno lingine la utafutaji",
      aboutUhuru: "Kuhusu Uhuru",
      version: "Toleo",
      madeWith: "Imetengenezwa kwa",
      botswana: "katika Botswana",
      saveChanges: "Hifadhi Mabadiliko",
      settingsSaved: "Mipangilio imehifadhiwa",
      searchFaqs: "Tafuta Maswali Yanayoulizwa Mara kwa Mara...",
      close: "Funga",
      upgradeToProPlan: "Boresha Kwenda Mpango wa Pro",
      canvasSettings: "Mipangilio ya Kanvasi",
      uhuruProSettings: "Mipangilio ya Uhuru Pro",
      uhuruDocsSettings: "Mipangilio ya Uhuru Docs",
      billingSettings: "Malipo na Usajili",
      manageBilling: "Simamia usajili wako na njia za malipo"
    }
  };

  // getTranslation now delegates to the LanguageContext t() function,
  // falling back to the local translations object for FAQ-only strings.
  const getTranslation = (key: string): string => {
    const fromContext = t(key);
    if (fromContext !== key) return fromContext;
    if (!translations[interfaceLanguage]) {
      return translations.english[key] || key;
    }
    return translations[interfaceLanguage][key] || translations.english[key] || key;
  };
  
  // Update user data when it becomes available
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        account: {
          ...prev.account,
          name: user.user_metadata?.name || 'User',
          email: user.email || '',
        }
      }));
    }
  }, [user]);
  
  // Update language when props change
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      language: {
        interfaceLanguage: interfaceLanguage,
        defaultResponseLang: responseLanguage,
      }
    }));
  }, [interfaceLanguage, responseLanguage]);
  
  // Settings state
  const [settings, setSettings] = useState({
    account: {
      name: user?.user_metadata?.name || 'User',
      email: user?.email || '',
    },
    language: {
      interfaceLanguage: interfaceLanguage,
      defaultResponseLang: responseLanguage,
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
    }
  });
  
  // Handle name update
  const handleUpdateName = async () => {
    if (!user || !settings.account.name.trim()) {
      setNameUpdateError('Please enter a valid name');
      return;
    }

    setIsUpdatingName(true);
    setNameUpdateError(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: settings.account.name.trim() })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setNameUpdateSuccess(true);
      setTimeout(() => setNameUpdateSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating name:', error);
      setNameUpdateError(error.message || 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSave = () => {
    // Apply language changes if they were modified
    if (onLanguageChange && settings.language.interfaceLanguage !== interfaceLanguage) {
      onLanguageChange('interface', settings.language.interfaceLanguage);
    }
    
    if (onLanguageChange && settings.language.defaultResponseLang !== responseLanguage) {
      onLanguageChange('response', settings.language.defaultResponseLang);
    }
    
    // Apply theme change if it was modified
    setAppTheme('light');
    
    // In a real app, this would save to a database or localStorage
    setSaveSuccess(true);
    
    // Reset the success message after a delay
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };
  
  const handleChange = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Filter FAQ questions based on search
  const filterFaqs = (faqs: {question: string; answer: string}[], term: string) => {
    if (!term) return faqs;
    const lowerTerm = term.toLowerCase();
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(lowerTerm) || 
      faq.answer.toLowerCase().includes(lowerTerm)
    );
  };

  const faqs = [
    {
      question: getTranslation("changePassword"),
      answer: translations[interfaceLanguage]?.howDoIResetPassword || "You can reset your password in the Account tab of Settings. Click on 'Change' next to Password, then enter your current password and your new password twice to confirm."
    },
    {
      question: translations[interfaceLanguage]?.canIExportHistory || "Can I export my chat history?",
      answer: translations[interfaceLanguage]?.currentlyNoExport || "Currently, there's no direct export feature for chat history. We're working on adding this functionality in a future update. Stay tuned for announcements about new features."
    },
    {
      question: translations[interfaceLanguage]?.whatLanguagesSupported || "What languages are supported?",
      answer: translations[interfaceLanguage]?.uhuruSupports || "Uhuru supports English, Setswana, French, Twi, Ewe, Fante, and Ga. You can select your preferred language in the Language tab of Settings."
    },
    {
      question: translations[interfaceLanguage]?.howCanIDeleteAccount || "How can I delete my account?",
      answer: translations[interfaceLanguage]?.toDeleteAccount || "To delete your account, please contact our support team at support@orionx.xyz with the subject 'Account Deletion Request'."
    },
    {
      question: translations[interfaceLanguage]?.isMyDataPrivate || "Is my data private?",
      answer: translations[interfaceLanguage]?.yesYourData || "Yes, your data privacy is important to us. By default, your conversations are private and not used to train our AI. You can control your privacy settings in the Privacy tab, including whether to save chat history and allow data collection for service improvements."
    }
  ];
  
  const filteredFaqs = filterFaqs(faqs, searchTerm);

  // Show upgrade tab only for free users
  const showUpgradeTab = userSubscription?.tier === 'free';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-16 shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 flex justify-between items-center border-b border-borders">
          <h2 className="text-xl font-bold text-navy font-headline">
            {getTranslation('settings')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors duration-200"
            aria-label={getTranslation('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row h-[calc(90vh-76px)]">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0 p-4 md:p-0 md:border-r border-borders bg-sand-200">
            <div className="md:sticky md:top-0 md:p-4">
              <div className="flex md:hidden mb-4 gap-4 overflow-x-auto pb-2">
                {[
                  { id: 'account', icon: <User className="w-5 h-5" />, label: getTranslation('account') },
                  { id: 'language', icon: <Globe className="w-5 h-5" />, label: getTranslation('language') },
                  { id: 'subscription', icon: <CreditCard className="w-5 h-5" />, label: 'Subscription' },
                  ...(showUpgradeTab ? [{ id: 'upgrade', icon: <Zap className="w-5 h-5" />, label: getTranslation('upgrade') }] : []),
                  { id: 'privacy', icon: <Shield className="w-5 h-5" />, label: getTranslation('privacy') },
                  { id: 'help', icon: <HelpCircle className="w-5 h-5" />, label: getTranslation('help') }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex flex-col items-center p-2 rounded-12 ${
                      activeTab === tab.id
                        ? 'bg-white text-navy shadow-sm'
                        : 'text-navy hover:bg-white/50'
                    } transition-colors duration-200`}
                  >
                    {tab.icon}
                    <span className="text-xs mt-1">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="hidden md:flex flex-col space-y-1">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-12 ${
                    activeTab === 'account'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-navy hover:bg-white/50'
                  } transition-colors duration-200 text-left`}
                >
                  <User className="w-5 h-5" />
                  <span>{getTranslation('account')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('language')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-12 ${
                    activeTab === 'language'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-navy hover:bg-white/50'
                  } transition-colors duration-200 text-left`}
                >
                  <Globe className="w-5 h-5" />
                  <span>{getTranslation('language')}</span>
                </button>
                
                {/* Personalization and API Keys tabs removed per user request */}

                {/* Show upgrade tab for free users */}
                
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-12 ${
                    activeTab === 'privacy' 
                      ? 'bg-white text-navy shadow-sm' 
                      : 'text-navy hover:bg-white/50'
                  } transition-colors duration-200 text-left`}
                >
                  <Shield className="w-5 h-5" />
                  <span>{getTranslation('privacy')}</span>
                </button>

                {/* Sign Out button */}
                <button 
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-12 text-navy hover:bg-white/50 transition-colors duration-200 text-left mt-4"
                  onClick={onSignOut}
                >
                  <LogOut className="w-5 h-5" />
                  <span>{getTranslation('signOut')}</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {/* Account tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-navy font-headline">
                  {getTranslation('accountSettings')}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-navy">
                      {getTranslation('name')}
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.account.name}
                          onChange={(e) => handleChange('account', 'name', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-12 border border-borders text-navy focus:border-teal focus:ring-1 focus:ring-teal"
                          placeholder="Enter your preferred name"
                        />
                        <button
                          onClick={handleUpdateName}
                          disabled={isUpdatingName || nameUpdateSuccess}
                          className={`px-4 py-2 rounded-12 text-sm font-medium transition-colors ${
                            nameUpdateSuccess 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-teal text-white hover:bg-teal/90'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isUpdatingName ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : nameUpdateSuccess ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            'Update'
                          )}
                        </button>
                      </div>
                      
                      {nameUpdateError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {nameUpdateError}
                        </p>
                      )}
                      
                      {nameUpdateSuccess && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Name updated! Uhuru will now address you as {settings.account.name}
                        </p>
                      )}
                      
                      <p className="text-xs text-black">
                        This is how Uhuru will address you in conversations
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-navy">
                      {getTranslation('email')}
                    </label>
                    <input
                      type="email"
                      value={settings.account.email}
                      onChange={(e) => handleChange('account', 'email', e.target.value)}
                      className="w-full px-3 py-2 rounded-12 border border-borders text-navy focus:border-teal focus:ring-1 focus:ring-teal"
                      disabled={true} // Read-only since we're using auth email
                    />
                    <p className="text-xs text-navy mt-1">
                      {getTranslation('yourAccountEmail')}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-12 bg-sand-200/50 border border-borders">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-navy">
                          {getTranslation('changePassword')}
                        </h4>
                        <p className="text-xs text-navy">
                          {getTranslation('updateYourAccount')}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="px-3 py-1.5 rounded-12 bg-white hover:bg-sand-200 text-navy transition-colors duration-200 border border-borders"
                      >
                        {getTranslation('change')}
                      </button>
                    </div>
                    
                    {showPasswordForm && (
                      <div className="mt-4 pt-4 border-t border-borders">
                        <PasswordChangeForm 
                          onCancel={() => setShowPasswordForm(false)}
                          onSuccess={() => {
                            setShowPasswordForm(false);
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 2000);
                          }}
                          interfaceLanguage={interfaceLanguage}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Sign Out button for mobile */}
                  <div className="md:hidden mt-4">
                    <button
                      onClick={onSignOut}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-12 bg-sand-200/50 text-navy hover:bg-sand-200 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{getTranslation('signOut')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Language tab */}
            {activeTab === 'language' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-navy font-headline">
                  {getTranslation('languageSettings')}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-navy">
                      {getTranslation('interfaceLanguage')}
                    </label>
                    <select
                      value={settings.language.interfaceLanguage}
                      onChange={(e) => handleChange('language', 'interfaceLanguage', e.target.value)}
                      className="w-full px-3 py-2 rounded-12 bg-white border border-borders text-navy focus:ring-1 focus:ring-teal focus:border-teal"
                    >
                      <option value="english">English</option>
                      <option value="setswana">Setswana</option>
                      <option value="french">French</option>
                      <option value="twi">Twi</option>
                      <option value="ewe">Ewe</option>
                      <option value="fante">Fante</option>
                      <option value="ga">Ga</option>
                    </select>
                    <p className="text-xs mt-1 text-navy">
                      {getTranslation('controlsMenus')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-navy">
                      {getTranslation('defaultResponse')}
                    </label>
                    <select
                      value={settings.language.defaultResponseLang}
                      onChange={(e) => handleChange('language', 'defaultResponseLang', e.target.value)}
                      className="w-full px-3 py-2 rounded-12 bg-white border border-borders text-navy focus:ring-1 focus:ring-teal focus:border-teal"
                    >
                      <option value="english">English</option>
                      <option value="setswana">Setswana</option>
                      <option value="french">French</option>
                      <option value="twi">Twi</option>
                      <option value="ewe">Ewe</option>
                      <option value="fante">Fante</option>
                      <option value="ga">Ga</option>
                    </select>
                    <p className="text-xs mt-1 text-navy">
                      {getTranslation('uhuruWillRespond')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            

            {/* API Keys tab - REMOVED per user request */}
            {/* {activeTab === 'api-keys' && (
              <div className="space-y-6">
                <ApiKeySettings
                  darkMode={false}
                  interfaceLanguage={interfaceLanguage}
                />
              </div>
            )} */}

            {/* Personalization tab - REMOVED per user request */}
            {/* {activeTab === 'personalization' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-navy font-headline">
                  Personalization Settings
                </h3>
                <p className="text-sm text-navy mb-4">
                  Help Uhuru provide more relevant and personalized responses by sharing information about yourself, your role, and your preferences.
                </p>

                <PersonalizationSettings
                  darkMode={false}
                  interfaceLanguage={interfaceLanguage}
                  onSaveSuccess={() => {
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                  }}
                />
              </div>
            )} */}

            {/* Privacy tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-navy font-headline">
                  {getTranslation('privacy')}
                </h3>
                
                <PrivacySettings darkMode={darkMode} />
              </div>
            )}

            {/* Help tab */}
            {activeTab === 'help' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-navy font-headline mb-4">
                  {getTranslation('helpSupport')}
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-12 bg-white border border-borders shadow-card">
                    <h4 className="text-sm font-medium mb-1 text-navy">
                      {getTranslation('contactSupport')}
                    </h4>
                    <p className="text-xs text-navy mb-3">
                      {getTranslation('needHelp')}
                    </p>
                    <a
                      href="mailto:support@orionx.xyz"
                      className="inline-block px-3 py-2 rounded-12 text-xs bg-teal text-white hover:bg-teal/90 transition-colors duration-200"
                    >
                      {getTranslation('contactUs')}
                    </a>
                  </div>
                  
                  <div className="p-4 rounded-12 bg-white border border-borders shadow-card">
                    <div className="mb-3 flex justify-between items-center">
                      <h4 className="text-sm font-medium text-navy">
                        {getTranslation('frequentlyAsked')}
                      </h4>
                      
                      <div className="relative">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={getTranslation('searchFaqs')}
                          className="pl-8 pr-3 py-1 rounded-12 border border-borders text-sm focus:ring-1 focus:ring-teal focus:border-teal text-navy"
                        />
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-navy" />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-navy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {filteredFaqs.length === 0 ? (
                        <p className="text-center text-sm text-navy py-4">
                          {getTranslation('noFaqsFound')} "{searchTerm}"
                        </p>
                      ) : (
                        filteredFaqs.map((faq, index) => (
                          <div 
                            key={index}
                            className={`border rounded-12 overflow-hidden ${
                              expandedFaq === index ? 'border-teal' : 'border-borders'
                            }`}
                          >
                            <button
                              onClick={() => toggleFaq(index)}
                              className={`w-full p-3 flex justify-between items-center text-left ${
                                expandedFaq === index ? 'bg-teal/5' : 'bg-sand-200/50 hover:bg-sand-200'
                              } transition-colors duration-200`}
                            >
                              <span className={`text-sm font-medium ${
                                expandedFaq === index ? 'text-teal' : 'text-navy'
                              }`}>
                                {faq.question}
                              </span>
                              <span className="text-navy">
                                {expandedFaq === index ? '−' : '+'}
                              </span>
                            </button>
                            
                            {expandedFaq === index && (
                              <div className="p-3 bg-white">
                                <p className="text-sm text-navy">{faq.answer}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-12 bg-white border border-borders shadow-card">
                    <h4 className="text-sm font-medium mb-1 text-navy">
                      {getTranslation('aboutUhuru')}
                    </h4>
                    <p className="text-xs text-navy">
                      {getTranslation('version')}: 1.0.0<br />
                      {getTranslation('madeWith')} ❤️ {getTranslation('botswana')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Save button - only show for relevant tabs */}
            {(activeTab === 'account' || activeTab === 'language') && (
              <div className={`mt-6 flex items-center ${saveSuccess ? 'justify-between' : 'justify-end'}`}>
                {saveSuccess && (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">{getTranslation('settingsSaved')}</span>
                  </div>
                )}
                
                {activeTab === 'language' && (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors duration-200 flex items-center gap-2 shadow-card"
                  >
                    <Save className="w-4 h-4" />
                    <span>{getTranslation('saveChanges')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;