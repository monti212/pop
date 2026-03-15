import React, { useState, useEffect } from 'react';
import { Save, Check, AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface PersonalizationSettingsProps {
  darkMode?: boolean;
  onSaveSuccess?: () => void;
  interfaceLanguage?: string;
}

const PersonalizationSettings: React.FC<PersonalizationSettingsProps> = ({ 
  darkMode = false,
  onSaveSuccess,
  interfaceLanguage = 'english'
}) => {
  const { user } = useAuth();
  const [personalContext, setPersonalContext] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Translations
  const translations: Record<string, Record<string, string>> = {
    english: {
      personalization: "Personalization",
      personalContext: "Personal Context",
      personalContextDescription: "Tell Uhuru about yourself, your role, organization, preferences, or any other information you'd like the AI to consider when responding to you.",
      placeholder: "Example: I'm a marketing manager at a tech startup in Gaborone. I work primarily with B2B software companies and prefer direct, actionable advice. I'm interested in African market trends and digital transformation strategies.",
      savePersonalContext: "Save Personal Context",
      saving: "Saving...",
      saved: "Saved",
      error: "Error",
      failedToSave: "Failed to save personal context",
      failedToLoad: "Failed to load personal context",
      helpText: "This information will be used to personalize Uhuru's responses across all your conversations.",
      characterCount: "characters"
    },
    setswana: {
      personalization: "Go Iketla",
      personalContext: "Seemo sa Motho",
      personalContextDescription: "Bolelela Uhuru ka ga wena, tiro ya gago, mokgatlho, dikgetho, kgotsa tshedimosetso engwe e o batlang gore AI e e akanyetse fa e go araba.",
      placeholder: "Sekao: Ke molaodi wa papatso wa khampani ya thekenoloji kwa Gaborone. Ke dira thata le dikhampani tsa software tsa B2B mme ke rata kgakololo e e tobane le e e diragalang. Ke na le kgatlhego mo mekgweng ya mebaraka ya Afrika le maano a diphetogo tsa dijithale.",
      savePersonalContext: "Boloka Seemo sa Motho",
      saving: "E a boloka...",
      saved: "E bolokegile",
      error: "Phoso",
      failedToSave: "Go palegile go boloka seemo sa motho",
      failedToLoad: "Go palegile go lesa seemo sa motho",
      helpText: "Tshedimosetso e e tla dirisiwa go iketla dikarabo tsa Uhuru mo dipuisanong tsotlhe tsa gago.",
      characterCount: "ditlhaka"
    },
    swahili: {
      personalization: "Ubinafsishaji",
      personalContext: "Muktadha wa Kibinafsi",
      personalContextDescription: "Mwambie Uhuru kuhusu wewe, kazi yako, shirika, mapendeleo, au habari nyingine yoyote ungependa AI izingatia inapojibu.",
      placeholder: "Mfano: Mimi ni meneja wa uuzaji katika kampuni ya teknolojia huko Gaborone. Ninafanya kazi hasa na makampuni ya programu za B2B na ninapendelea ushauri wa moja kwa moja na wa vitendo. Nina nia katika mienendo ya soko la Afrika na mikakati ya mabadiliko ya kidijitali.",
      savePersonalContext: "Hifadhi Muktadha wa Kibinafsi",
      saving: "Inahifadhi...",
      saved: "Imehifadhiwa",
      error: "Hitilafu",
      failedToSave: "Imeshindwa kuhifadhi muktadha wa kibinafsi",
      failedToLoad: "Imeshindwa kupakia muktadha wa kibinafsi",
      helpText: "Habari hii itatumika kubinafsisha majibu ya Uhuru katika mazungumzo yako yote.",
      characterCount: "vibambo"
    }
  };

  const getTranslation = (key: string): string => {
    return translations[interfaceLanguage]?.[key] || translations.english[key] || key;
  };

  // Load user's personal context on component mount
  useEffect(() => {
    const loadPersonalContext = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('personal_context')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setPersonalContext(data.personal_context || '');
        }
      } catch (error) {
        console.error('Error loading personal context:', error);
        setSaveError(getTranslation('failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPersonalContext();
  }, [user, interfaceLanguage]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          personal_context: personalContext.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setSaveSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving personal context:', error);
      setSaveError(error.message || getTranslation('failedToSave'));
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
      <div className={`p-4 rounded-lg ${
        darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        <h4 className={`text-base font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {getTranslation('personalContext')}
        </h4>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="personalContext" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
              {getTranslation('personalContextDescription')}
            </label>
            <textarea
              id="personalContext"
              value={personalContext}
              onChange={(e) => setPersonalContext(e.target.value)}
              rows={8}
              className={`w-full px-3 py-3 rounded-lg resize-none ${
                darkMode 
                  ? 'bg-navy/70 border border-white/10 text-white placeholder-white/50' 
                  : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-teal focus:border-transparent`}
              placeholder={getTranslation('placeholder')}
              maxLength={2000}
            />
            <div className={`flex justify-between items-center mt-1 text-xs ${
              darkMode ? 'text-white/70' : 'text-gray-500'
            }`}>
              <span>{getTranslation('helpText')}</span>
              <span>{personalContext.length}/2000 {getTranslation('characterCount')}</span>
            </div>
          </div>
        </div>
      </div>
      
      {saveError && (
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-100'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
              darkMode ? 'text-red-400' : 'text-red-500'
            }`} />
            <div>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                {getTranslation('error')}
              </h3>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-red-300/80' : 'text-red-600/80'}`}>{saveError}</p>
            </div>
          </div>
        </div>
      )}
      
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
              <Loader className="w-4 h-4 animate-spin" />
              {getTranslation('saving')}
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              {getTranslation('saved')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {getTranslation('savePersonalContext')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PersonalizationSettings;