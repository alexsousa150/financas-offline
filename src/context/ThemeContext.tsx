import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  heroSurface: string;
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
  background: '#0D0E11',
  card: '#16181D',
  cardBorder: '#1F222A',
  heroSurface: '#16181D',
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  primary: '#10B981',
  primaryLight: 'rgba(16, 185, 129, 0.15)',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  inputBg: '#1A1C23',
  inputBorder: '#262833',
  tabBarBg: '#0D0E11',
  tabBarBorder: '#1A1C23',
  tabBarActive: '#10B981',
  tabBarInactive: '#71717A',
  chipBg: '#1A1C23',
  chipActiveBg: '#10B981',
  isDark: true,
};

const lightTheme: ThemeColors = {
  background: '#F7F8FA',
  card: '#FFFFFF',
  cardBorder: '#E8E9ED',
  heroSurface: '#FFFFFF',
  text: '#1A1B1E',
  textSecondary: '#6B6D76',
  textMuted: '#9B9DA6',
  primary: '#059669',
  primaryLight: 'rgba(5, 150, 105, 0.10)',
  success: '#059669',
  successLight: 'rgba(5, 150, 105, 0.12)',
  danger: '#E11D48',
  dangerLight: 'rgba(225, 29, 72, 0.12)',
  warning: '#CA8A04',
  warningLight: 'rgba(202, 138, 4, 0.12)',
  inputBg: '#F2F3F5',
  inputBorder: '#E0E1E5',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#EEEFF2',
  tabBarActive: '#059669',
  tabBarInactive: '#9B9DA6',
  chipBg: '#F0F1F3',
  chipActiveBg: '#059669',
  isDark: false,
};

interface ThemeContextType {
  theme: ThemeColors;
  modo: 'escuro' | 'claro' | 'sistema';
  setModo: (modo: 'escuro' | 'claro' | 'sistema') => Promise<void>;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  modo: 'escuro',
  setModo: async () => {},
  alternarTema: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const db = useSQLiteContext();
  const [modo, setModoState] = useState<'escuro' | 'claro' | 'sistema'>('escuro');

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const row = await db.getFirstAsync<{ valor: string }>(
          'SELECT valor FROM configuracoes WHERE chave = ?;',
          'tema_modo'
        );
        if (ativo && row && (row.valor === 'escuro' || row.valor === 'claro' || row.valor === 'sistema')) {
          setModoState(row.valor as any);
        }
      } catch {
        // Silencioso se der erro na inicialização
      }
    })();
    return () => {
      ativo = false;
    };
  }, [db]);

  const setModo = async (novoModo: 'escuro' | 'claro' | 'sistema') => {
    setModoState(novoModo);
    try {
      await db.runAsync(
        `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
         ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;`,
        'tema_modo',
        novoModo
      );
    } catch (e) {
      console.warn('Erro ao salvar tema no banco:', e);
    }
  };

  const isDark = modo === 'sistema' ? scheme === 'dark' : modo === 'escuro';
  const theme = isDark ? darkTheme : lightTheme;

  const alternarTema = () => {
    const proximo = modo === 'escuro' ? 'claro' : 'escuro';
    setModo(proximo);
  };

  return (
    <ThemeContext.Provider value={{ theme, modo, setModo, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
