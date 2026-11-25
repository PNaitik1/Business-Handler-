import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n/i18n';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('supplysync_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('supplysync_token') || null;
  });

  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem('supplysync_lang') || 'en';
    return stored.toUpperCase().includes('HI') ? 'HI' : 'EN';
  });

  useEffect(() => {
    const langCode = language === 'HI' ? 'hi' : 'en';
    if (i18n.language !== langCode) {
      i18n.changeLanguage(langCode);
    }
  }, [language]);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('supplysync_user', JSON.stringify(userData));
    localStorage.setItem('supplysync_token', jwtToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('supplysync_user');
    localStorage.removeItem('supplysync_token');
  };

  const setAppLanguage = (lang) => {
    const next = lang.toUpperCase().includes('HI') ? 'HI' : 'EN';
    setLanguage(next);
    const code = next === 'HI' ? 'hi' : 'en';
    i18n.changeLanguage(code);
    localStorage.setItem('supplysync_lang', code);
  };

  const toggleLanguage = () => {
    const next = language === 'EN' ? 'HI' : 'EN';
    setAppLanguage(next);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      language,
      isAuthenticated: !!user,
      login,
      logout,
      toggleLanguage,
      setAppLanguage
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
