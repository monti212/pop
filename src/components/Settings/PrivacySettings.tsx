import React, { useState, useEffect } from 'react';
import { Shield, Database, History, Share2, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface PrivacySettingsProps {
  darkMode?: boolean;
  onSaveSuccess?: () => void;
  interfaceLanguage?: string;
}

interface PrivacyPreferences {
  share_data: boolean;
  save_history: boolean;
  data_collection: boolean;
  personalized_responses: boolean;
  third_party_sharing: boolean;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ 
  darkMode = false,
  onSaveSuccess,
  interfaceLanguage = 'english'
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    share_data: false, // Default to false for privacy
    save_history: true,
    data_collection: true,
    personalized_responses: true,
    third_party_sharing: false
  });

  // Translations
  const translations: Record<string, Record<string, string>> = {
    english: {
      shareDataForAI: "Share Data for AI Improvement",
      helpImprove: "Help improve Uhuru by sharing anonymized conversation data. Your data will never be shared with third parties.",
      saveChatHistory: "Save Chat History",
      keepRecord: "Keep a record of your conversations for future reference. Disable to use ephemeral chats that aren't saved.",
      dataCollection: "Data Collection",
      allowCollection: "Allow collection of usage data to improve your experience. This includes features used and time spent.",
      personalizedResponses: "Personalized Responses",
      allowUhuru: "Allow Uhuru to remember your preferences and previous conversations to provide more relevant responses.",
      thirdPartySharing: "Third-Party Data Sharing",
      allowSharing: "Allow sharing of anonymized data with trusted research partners to improve AI systems.",
      deleteAccountData: "Delete Account Data",
      permanentlyDelete: "Permanently delete all your account data and conversations",
      requestDeletion: "Request Data Deletion",
      error: "Error",
      failedToSave: "Failed to save privacy preferences",
      savePreferences: "Save Preferences",
      saving: "Saving...",
      saved: "Saved"
    },
    setswana: {
      shareDataForAI: "Abelana ka Data go Tokafatsa AI",
      helpImprove: "Thusa go tokafatsa Uhuru ka go abelana data ya dipuisano tse di seng mo maining. Data ya gago e ka se abelanwe le batho ba bangwe.",
      saveChatHistory: "Boloka Hisetori ya Puisano",
      keepRecord: "Boloka rekoto ya dipuisano tsa gago go di tlhoka mo nakong e e tlang. Tima go dirisa dipuisano tse di sa bolokelweng.",
      dataCollection: "Kgobokanyo ya Data",
      allowCollection: "Letlelela kgobokanyo ya data ya tiriso go tokafatsa maitemogelo a gago. Se se akaretsa dikarolo tse o di dirisitseng le nako e o e dirisitseng.",
      personalizedResponses: "Dikarabo tse di Tsamaelanang",
      allowUhuru: "Letlelela Uhuru go gakologelwa ditlhopho tsa gago le dipuisano tse di fetileng go neelana ka dikarabo tse di maleba.",
      thirdPartySharing: "Go Abelana Data le Batho ba Bangwe",
      allowSharing: "Letlelela go abelana data e e seng mo maining le badiri-mmogo ba dipatlisiso go tokafatsa dithulaganyo tsa AI.",
      deleteAccountData: "Phimola Data ya Akhaonto",
      permanentlyDelete: "Phimola ruri data yotlhe ya akhaonto ya gago le dipuisano",
      requestDeletion: "Kopa Phimolo ya Data",
      error: "Phoso",
      failedToSave: "Go paletswe go boloka ditlhopho tsa sephiri",
      savePreferences: "Boloka Ditlhopho",
      saving: "E a boloka...",
      saved: "E bolokegile"
    },
    swahili: {
      shareDataForAI: "Shiriki Data kwa Ajili ya Kuboresha AI",
      helpImprove: "Saidia kuboresha Uhuru kwa kushiriki data isiyotambulika ya mazungumzo. Data yako kamwe haitashirikiwa na watu wengine.",
      saveChatHistory: "Hifadhi Historia ya Gumzo",
      keepRecord: "Weka rekodi ya mazungumzo yako kwa matumizi ya baadaye. Zima ili kutumia gumzo za muda ambazo hazihifadhiwi.",
      dataCollection: "Ukusanyaji wa Data",
      allowCollection: "Ruhusu ukusanyaji wa data ya matumizi ili kuboresha uzoefu wako. Hii inajumuisha vipengele ulivyotumia na muda uliotumia.",
      personalizedResponses: "Majibu ya Kibinafsi",
      allowUhuru: "Ruhusu Uhuru kukumbuka mapendeleo yako na mazungumzo ya awali ili kutoa majibu zaidi yanayofaa.",
      thirdPartySharing: "Kushiriki Data na Watu Wengine",
      allowSharing: "Ruhusu kushiriki data isiyotambulika na washirika wa utafiti wanaoaminika ili kuboresha mifumo ya AI.",
      deleteAccountData: "Futa Data ya Akaunti",
      permanentlyDelete: "Futa kabisa data yote ya akaunti yako na mazungumzo",
      requestDeletion: "Omba Kufutwa kwa Data",
      error: "Hitilafu",
      failedToSave: "Imeshindwa kuhifadhi mapendeleo ya faragha",
      savePreferences: "Hifadhi Mapendeleo",
      saving: "Inahifadhi...",
      saved: "Imehifadhiwa"
    }
  };

  const getTranslation = (key: string): string => {
    if (!translations[interfaceLanguage]) {
      return translations.english[key] || key;
    }
    return translations[interfaceLanguage][key] || translations.english[key] || key;
  };

  // Load user's privacy preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('privacy_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setPreferences({
            share_data: data.share_data,
            save_history: data.save_history,
            data_collection: data.data_collection,
            personalized_responses: data.personalized_responses,
            third_party_sharing: data.third_party_sharing
          });
        }
      } catch (error) {
        console.error('Error loading privacy preferences:', error);
        setSaveError('Uhuru could not load your privacy preferences. Please try again.');
        setSaveError('I couldn\'t load your privacy settings. Want to try again?');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, [user]);

  const handleToggle = (key: keyof PrivacyPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const { error } = await supabase
        .from('privacy_preferences')
        .upsert({
          user_id: user.id,
          share_data: preferences.share_data,
          save_history: preferences.save_history,
          data_collection: preferences.data_collection,
          personalized_responses: preferences.personalized_responses,
          third_party_sharing: preferences.third_party_sharing,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      setSaveSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving privacy preferences:', error);
      setSaveError(error.message || 'Uhuru could not save your privacy preferences. Please try again.');
      setSaveError(error.message || 'Privacy settings aren\'t saving right now. Try again?');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-teal border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Share2 className={`w-4 h-4 ${darkMode ? 'text-teal' : 'text-teal'}`} />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {getTranslation('shareDataForAI')}
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.share_data}
                onChange={() => handleToggle('share_data')}
              />
              <div className={`w-11 h-6 rounded-full peer ${
                darkMode 
                  ? 'bg-white/10 peer-checked:bg-teal' 
                  : 'bg-gray-200 peer-checked:bg-teal'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}></div>
            </label>
          </div>
          <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
            {getTranslation('helpImprove')}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <History className={`w-4 h-4 ${darkMode ? 'text-teal' : 'text-teal'}`} />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {getTranslation('saveChatHistory')}
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.save_history}
                onChange={() => handleToggle('save_history')}
              />
              <div className={`w-11 h-6 rounded-full peer ${
                darkMode 
                  ? 'bg-white/10 peer-checked:bg-teal' 
                  : 'bg-gray-200 peer-checked:bg-teal'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}></div>
            </label>
          </div>
          <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
            {getTranslation('keepRecord')}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${darkMode ? 'text-teal' : 'text-teal'}`} />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {getTranslation('dataCollection')}
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.data_collection}
                onChange={() => handleToggle('data_collection')}
              />
              <div className={`w-11 h-6 rounded-full peer ${
                darkMode 
                  ? 'bg-white/10 peer-checked:bg-teal' 
                  : 'bg-gray-200 peer-checked:bg-teal'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}></div>
            </label>
          </div>
          <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
            {getTranslation('allowCollection')}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${darkMode ? 'text-teal' : 'text-teal'}`} />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {getTranslation('personalizedResponses')}
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.personalized_responses}
                onChange={() => handleToggle('personalized_responses')}
              />
              <div className={`w-11 h-6 rounded-full peer ${
                darkMode 
                  ? 'bg-white/10 peer-checked:bg-teal' 
                  : 'bg-gray-200 peer-checked:bg-teal'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}></div>
            </label>
          </div>
          <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
            {getTranslation('allowUhuru')}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${darkMode ? 'text-teal' : 'text-teal'}`} />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {getTranslation('thirdPartySharing')}
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.third_party_sharing}
                onChange={() => handleToggle('third_party_sharing')}
              />
              <div className={`w-11 h-6 rounded-full peer ${
                darkMode 
                  ? 'bg-white/10 peer-checked:bg-teal' 
                  : 'bg-gray-200 peer-checked:bg-teal'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}></div>
            </label>
          </div>
          <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
            {getTranslation('allowSharing')}
          </p>
        </div>
      </div>
      
      {saveError && (
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-100'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 dark:text-red-300 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                {getTranslation('error')}
              </h3>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-red-300/80' : 'text-red-600/80'}`}>{saveError}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className={`p-4 rounded-lg ${
        darkMode ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-100'
      }`}>
        <h4 className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-600'} mb-1`}>
          {getTranslation('deleteAccountData')}
        </h4>
        <p className={`text-xs ${darkMode ? 'text-red-300/80' : 'text-red-600/80'} mb-2`}>
          {getTranslation('permanentlyDelete')}
        </p>
        <button
          className={`px-3 py-1 text-xs rounded-lg ${
            darkMode ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600'
          } transition-colors duration-200`}
        >
          {getTranslation('requestDeletion')}
        </button>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
          className={`px-4 py-2 rounded-lg ${
            darkMode ? 'bg-teal text-white' : 'bg-teal text-white'
          } hover:bg-teal/90 transition-colors duration-200 flex items-center gap-2 ${
            (isSaving || saveSuccess) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {getTranslation('saving')}
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              {getTranslation('saved')}
            </>
          ) : (
            getTranslation('savePreferences')
          )}
        </button>
      </div>
    </div>
  );
};

export default PrivacySettings;