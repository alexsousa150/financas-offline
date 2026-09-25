import React, { Suspense } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { DATABASE_NAME, inicializarBanco } from './src/database/db';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import { MainLayout } from './src/components/MainLayout';

function TelaCarregamento() {
  return (
    <View style={styles.carregamentoContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.textoCarregamento}>Inicializando banco local seguro...</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<TelaCarregamento />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={inicializarBanco} useSuspense={false}>
          <ThemeProvider>
            <AppProvider>
              <MainLayout />
            </AppProvider>
          </ThemeProvider>
        </SQLiteProvider>
      </Suspense>
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
