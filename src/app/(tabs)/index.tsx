import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { HomeScreen as OriginalHomeScreen } from '../../screens/HomeScreen';
import { FloatingActionButton } from '../../components/FloatingActionButton';

export default function HomeRoute() {
  const router = useRouter();
  const { abrirModalNovoLancamento } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <OriginalHomeScreen
        onNavegarParaHistorico={() => router.push('/history')}
        onNavegarParaCategorias={() => router.push('/categories')}
        onNavegarParaAjustes={() => router.push('/settings')}
      />
      <FloatingActionButton onPress={abrirModalNovoLancamento} />
    </View>
  );
}
