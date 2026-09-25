import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  chipBg: string;
  chipActiveBg: string;
  isDark: boolean;
}

const darkTheme: ThemeColors = {
  background: '#121214',
  card: '#1E1E24',
  cardBorder: '#29292E',
  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  primary: '#10B981',
  primaryLight: 'rgba(16, 185, 129, 0.15)',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.18)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.18)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.18)',
  inputBg: '#27272A',
  inputBorder: '#3F3F46',
  tabBarBg: '#18181B',
  tabBarBorder: '#27272A',
  tabBarActive: '#10B981',
  tabBarInactive: '#71717A',
  chipBg: '#27272A',
  chipActiveBg: '#10B981',
  isDark: true,
};

const lightTheme: ThemeColors = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  cardBorder: '#E4E4E7',
  text: '#18181B',
  textSecondary: '#71717A',
  textMuted: '#A1A1AA',
  primary: '#059669',
  primaryLight: 'rgba(5, 150, 105, 0.12)',
  success: '#059669',
  successLight: 'rgba(5, 150, 105, 0.15)',
  danger: '#DC2626',
  dangerLight: 'rgba(220, 38, 38, 0.15)',
  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.15)',
  inputBg: '#F4F5F7',
  inputBorder: '#E4E4E7',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
  tabBarActive: '#059669',
  tabBarInactive: '#9CA3AF',
  chipBg: '#F3F4F6',
  chipActiveBg: '#059669',
  isDark: false,
};

interface ThemeContextType {
  theme: ThemeColors;
  modo: 'escuro' | 'claro' | 'sistema';
  setModo: (modo: 'escuro' | 'claro' | 'sistema') => void;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  modo: 'escuro',
  setModo: () => {},
  alternarTema: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const [modo, setModo] = useState<'escuro' | 'claro' | 'sistema'>('escuro');

  const isDark = modo === 'sistema' ? scheme === 'dark' : modo === 'escuro';
  const theme = isDark ? darkTheme : lightTheme;

  const alternarTema = () => {
    setModo((prev) => (prev === 'escuro' ? 'claro' : 'escuro'));
  };

  return (
    <ThemeContext.Provider value={{ theme, modo, setModo, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
