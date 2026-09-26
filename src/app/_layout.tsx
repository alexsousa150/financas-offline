import React, { Suspense } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { DATABASE_NAME, inicializarBanco } from '../database/db';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AppProvider, useApp } from '../context/AppContext';

import { TransactionModal } from '../components/TransactionModal';
import { CategoryModal } from '../components/CategoryModal';
import { RecurringModal } from '../components/RecurringModal';
import { BiometricLockScreen } from '../components/BiometricLockScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

function TelaCarregamento() {
  return (
    <View style={styles.carregamentoContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.textoCarregamento}>Inicializando banco local seguro...</Text>
    </View>
  );
}

function RootProvidersAndModals() {
  const { theme } = useTheme();
  const {
    modalTransacaoAberto,
    modalTransacaoTipoInicial,
    transacaoParaEdicao,
    transacaoParaDuplicacao,
    fecharModalTransacao,
    modalCategoriaAberto,
    categoriaParaEdicao,
    fecharModalCategoria,
    modalRecorrentesAberto,
    fecharModalRecorrentes,
    biometriaHabilitada,
    autenticado,
    setAutenticado,
  } = useApp();

  return (
    <>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="settings" 
          options={{ 
            presentation: 'modal', 
            headerShown: true, 
            title: 'Ajustes',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }} 
        />
        <Stack.Screen 
          name="categories" 
          options={{ 
            presentation: 'modal', 
            headerShown: true, 
            title: 'Categorias',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }} 
        />
      </Stack>

      {/* Modais Globais */}
      <TransactionModal
        visivel={modalTransacaoAberto}
        tipoInicial={modalTransacaoTipoInicial}
        transacaoParaEdicao={transacaoParaEdicao}
        transacaoParaDuplicacao={transacaoParaDuplicacao}
        onFechar={fecharModalTransacao}
      />

      <CategoryModal
        visivel={modalCategoriaAberto}
        categoriaParaEdicao={categoriaParaEdicao}
        onFechar={fecharModalCategoria}
      />

      <RecurringModal
        visivel={modalRecorrentesAberto}
        onFechar={fecharModalRecorrentes}
      />

      {/* Tela de Bloqueio por Biometria */}
      {biometriaHabilitada && !autenticado && (
        <BiometricLockScreen onAutenticado={() => setAutenticado(true)} />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Suspense fallback={<TelaCarregamento />}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={inicializarBanco} useSuspense={false}>
            <ThemeProvider>
              <AppProvider>
                <RootProvidersAndModals />
              </AppProvider>
            </ThemeProvider>
          </SQLiteProvider>
        </Suspense>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  carregamentoContainer: {
    flex: 1,
    backgroundColor: '#121214',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  textoCarregamento: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
});
