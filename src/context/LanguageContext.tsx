import React, { createContext, useContext, useState, useCallback } from 'react';

export type SupportedLanguage = 'english' | 'setswana' | 'french' | 'twi' | 'ewe' | 'fante' | 'ga';

interface LanguageContextType {
  interfaceLanguage: SupportedLanguage;
  responseLanguage: SupportedLanguage;
  setInterfaceLanguage: (lang: SupportedLanguage) => void;
  setResponseLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const UI_TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  english: {
    newChat: 'New chat',
    search: 'Search',
    settings: 'Settings',
    today: 'Today',
    yesterday: 'Yesterday',
    older: 'Older',
    signOut: 'Sign out',
    searchPlaceholder: 'Search conversations...',
    noConversationsFound: 'No conversations found matching',
    searchResults: 'Search Results',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: 'Admin Dashboard',
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Website Builder',
    rename: 'Rename',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
  },
  setswana: {
    newChat: 'Puisano e ntšha',
    search: 'Batla',
    settings: 'Ditlhophiso',
    today: 'Gompieno',
    yesterday: 'Maabane',
    older: 'Bogologolo',
    signOut: 'Tswa',
    searchPlaceholder: 'Batla dipuisano...',
    noConversationsFound: 'Ga go na dipuisano tse di bonweng tse di tsamaelanang le',
    searchResults: 'Diphitlhelelo tsa Patlisiso',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: 'Tafolokgolo ya Motsamaisi',
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Sebopiwa sa Websaete',
    rename: 'Fetola leina',
    delete: 'Phimola',
    save: 'Boloka',
    cancel: 'Khansela',
  },
  french: {
    newChat: 'Nouvelle discussion',
    search: 'Rechercher',
    settings: 'Paramètres',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    older: 'Plus anciens',
    signOut: 'Se déconnecter',
    searchPlaceholder: 'Rechercher des discussions...',
    noConversationsFound: 'Aucune discussion trouvée pour',
    searchResults: 'Résultats de recherche',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: "Tableau de bord admin",
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Créateur de site web',
    rename: 'Renommer',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
  },
  twi: {
    newChat: 'Nsɛm foforɔ',
    search: 'Hwehwɛ',
    settings: 'Nhyehyɛe',
    today: 'Ɛnnɛ',
    yesterday: 'Ɛnnɛ twaa so',
    older: 'Tete',
    signOut: 'Pue fii',
    searchPlaceholder: 'Hwehwɛ nsɛm...',
    noConversationsFound: 'Ɛnnhuu nsɛm biara a ɛfa',
    searchResults: 'Hwehwɛ Nneɛma',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: 'Adminfoo Dashboard',
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Website Siesie',
    rename: 'Di din foforɔ',
    delete: 'Yi fi hɔ',
    save: 'Sie',
    cancel: 'Gyae',
  },
  ewe: {
    newChat: 'Ɖoɖo yeye',
    search: 'Saɖe',
    settings: 'Ɖoɖowo',
    today: 'Egbe',
    yesterday: 'Etsɔ',
    older: 'Gbã tɔtrɔ',
    signOut: 'Yi egbe',
    searchPlaceholder: 'Saɖe ɖoɖowo...',
    noConversationsFound: 'Ɖoɖo aɖeke mefoa o dzi',
    searchResults: 'Saɖe Ŋutinya',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: 'Admin Dashboard',
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Website Wɔla',
    rename: 'Ŋkɔ yeye',
    delete: 'Ɖe',
    save: 'Dzra',
    cancel: 'Ɖe ɖe eme',
  },
  fante: {
    newChat: 'Nsɛm foforɔ',
    search: 'Hwehwɛ',
    settings: 'Nhyehyɛe',
    today: 'Ndɛ',
    yesterday: 'Ndɛ a etwa to',
    older: 'Tete',
    signOut: 'Pue',
    searchPlaceholder: 'Hwehwɛ nsɛm...',
    noConversationsFound: 'Ɛnnhuu nsɛm biara a ɛfa',
    searchResults: 'Hwehwɛ Nneɛma',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: 'Admin Dashboard',
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Website Siesie',
    rename: 'Di din foforɔ',
    delete: 'Yi fi hɔ',
    save: 'Sie',
    cancel: 'Gyae',
  },
  ga: {
    newChat: 'Nyemɔ foforɔ',
    search: 'Hewalɔ',
    settings: 'Hewale gbɔɔ',
    today: 'Gbɛkɛ',
    yesterday: 'Gbɛkɛ yɛ',
    older: 'Gbãŋ',
    signOut: 'Ba wɔ',
    searchPlaceholder: 'Hewalɔ nyemɔ...',
    noConversationsFound: 'Nyemɔ fɛɛ lɛ eba',
    searchResults: 'Hewalɔ Ŋutinya',
    greyedTeach: 'GreyEd Teach',
    uDocs: 'U Docs',
    adminDashboard: 'Admin Dashboard',
    supaAdmin: 'Supa Admin',
    websiteBuilder: 'Website Wɔla',
    rename: 'Ŋkɔ yeye',
    delete: 'Ɖe',
    save: 'Dzra',
    cancel: 'Sɔ',
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY_INTERFACE = 'uhuru-interface-language';
const STORAGE_KEY_RESPONSE = 'uhuru-response-language';

function readStoredLanguage(key: string): SupportedLanguage {
  try {
    const stored = localStorage.getItem(key);
    const valid: SupportedLanguage[] = ['english', 'setswana', 'french', 'twi', 'ewe', 'fante', 'ga'];
    if (stored && valid.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }
  } catch {}
  return 'english';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interfaceLanguage, setInterfaceLanguageState] = useState<SupportedLanguage>(
    () => readStoredLanguage(STORAGE_KEY_INTERFACE)
  );
  const [responseLanguage, setResponseLanguageState] = useState<SupportedLanguage>(
    () => readStoredLanguage(STORAGE_KEY_RESPONSE)
  );

  const setInterfaceLanguage = useCallback((lang: SupportedLanguage) => {
    setInterfaceLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY_INTERFACE, lang); } catch {}
  }, []);

  const setResponseLanguage = useCallback((lang: SupportedLanguage) => {
    setResponseLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY_RESPONSE, lang); } catch {}
  }, []);

  const t = useCallback((key: string): string => {
    return (
      UI_TRANSLATIONS[interfaceLanguage]?.[key] ??
      UI_TRANSLATIONS.english[key] ??
      key
    );
  }, [interfaceLanguage]);

  return (
    <LanguageContext.Provider value={{ interfaceLanguage, responseLanguage, setInterfaceLanguage, setResponseLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
