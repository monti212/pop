import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setAppTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always default to 'light' instead of checking for system preference
  const [theme, setTheme] = useState<Theme>('light');
  
  // Apply theme class to document - only light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Simple toggle function (though we'll only use light mode)
  const toggleTheme = () => {
    setTheme('light'); // Always set to light
  };
  
  const setAppTheme = () => {
    setTheme('light'); // Always set to light
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;