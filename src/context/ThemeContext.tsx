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
  background: '#0D0D11',
  card: '#17181E',
  cardBorder: '#23242C',
  heroSurface: '#14151B',
  text: '#EDEDF0',
  textSecondary: '#8E909A',
  textMuted: '#5A5C65',
  primary: '#34D399',
  primaryLight: 'rgba(52, 211, 153, 0.12)',
  success: '#34D399',
  successLight: 'rgba(52, 211, 153, 0.14)',
  danger: '#F87171',
  dangerLight: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.14)',
  inputBg: '#1E1F26',
  inputBorder: '#2E2F38',
  tabBarBg: '#0D0D11',
  tabBarBorder: '#1A1B22',
  tabBarActive: '#34D399',
  tabBarInactive: '#5A5C65',
  chipBg: '#1E1F26',
  chipActiveBg: '#34D399',
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
      } catch (e) {
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
