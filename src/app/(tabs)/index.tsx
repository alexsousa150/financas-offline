import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { HomeScreen as OriginalHomeScreen } from '../../screens/HomeScreen';
import { FloatingActionButton } from '../../components/FloatingActionButton';

export default function HomeRoute() {
  const router = useRouter();
  const { abrirModalNovoLancamento } = useApp();
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OriginalHomeScreen
        onNavegarParaHistorico={() => router.push('/history')}
        onNavegarParaAnalise={() => router.push('/analytics')}
        onNavegarParaImportacao={() => router.push('/import')}
        onNavegarParaCategorias={() => router.push('/categories')}
        onNavegarParaAjustes={() => router.push('/settings')}
      />
      <FloatingActionButton onPress={abrirModalNovoLancamento} rotulo="Novo" />
    </View>
  );
}
