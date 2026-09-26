import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FloatingActionButton } from './FloatingActionButton';
import { TransactionModal } from './TransactionModal';
import { CategoryModal } from './CategoryModal';
import { RecurringModal } from './RecurringModal';
import { BiometricLockScreen } from './BiometricLockScreen';
import { AppHaptics } from '../utils/haptics';

export type TelaAtiva = 'inicio' | 'historico' | 'analise' | 'extrato' | 'categorias' | 'ajustes';

export const MainLayout: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    modalTransacaoAberto,
    modalTransacaoTipoInicial,
    transacaoParaEdicao,
    transacaoParaDuplicacao,
    abrirModalNovoLancamento,
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

  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>('inicio');

  // Configura atalhos rápidos do ícone do aplicativo (App Shortcuts)
  useEffect(() => {
    try {
      QuickActions.setItems([
        {
          id: 'nova_despesa',
          title: 'Nova despesa',
          subtitle: 'Registrar gasto',
          icon: Platform.OS === 'ios' ? 'symbol:minus.circle' : undefined,
          params: { action: 'nova_despesa' },
        },
        {
          id: 'nova_receita',
          title: 'Nova receita',
          subtitle: 'Registrar entrada',
          icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : undefined,
          params: { action: 'nova_receita' },
        },
      ]);
    } catch (e) {
      console.warn('Erro ao configurar atalhos do aplicativo:', e);
    }
  }, []);

  // Ouve quando o usuário clica em um atalho ao segurar o ícone do app
  useQuickActionCallback((action) => {
    if (action?.params?.action === 'nova_despesa') {
      abrirModalNovoLancamento('despesa');
    } else if (action?.params?.action === 'nova_receita') {
      abrirModalNovoLancamento('receita');
    }
  });

  const navegarPara = (novaTela: TelaAtiva) => {
    AppHaptics.toqueSelecao();
    setTelaAtiva(novaTela);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Renderização da Tela Ativa */}
      <View style={styles.conteudoTela}>
        {telaAtiva === 'inicio' && (
          <HomeScreen
            onNavegarParaHistorico={() => navegarPara('historico')}
            onNavegarParaAnalise={() => navegarPara('analise')}
            onNavegarParaImportacao={() => navegarPara('extrato')}
            onNavegarParaCategorias={() => navegarPara('categorias')}
            onNavegarParaAjustes={() => navegarPara('ajustes')}
          />
        )}
        {telaAtiva === 'historico' && <HistoryScreen />}
        {telaAtiva === 'analise' && <AnalyticsScreen />}
        {telaAtiva === 'extrato' && <ImportScreen />}
        {telaAtiva === 'categorias' && <CategoriesScreen />}
        {telaAtiva === 'ajustes' && <SettingsScreen />}
      </View>

      {/* Botão de Ação Flutuante (FAB) visível nas telas de início e histórico */}
      {(telaAtiva === 'inicio' || telaAtiva === 'historico') && (
        <FloatingActionButton onPress={abrirModalNovoLancamento} rotulo="Novo" />
      )}

      {/* Barra de Navegação Inferior */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.tabBarBg,
            borderTopColor: theme.tabBarBorder,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navegarPara('inicio')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={telaAtiva === 'inicio' ? 'home' : 'home-outline'}
            size={22}
            color={telaAtiva === 'inicio' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: telaAtiva === 'inicio' ? theme.tabBarActive : theme.tabBarInactive },
            ]}
          >
            Início
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navegarPara('historico')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={telaAtiva === 'historico' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={telaAtiva === 'historico' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: telaAtiva === 'historico' ? theme.tabBarActive : theme.tabBarInactive },
            ]}
          >
            Histórico
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navegarPara('analise')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={telaAtiva === 'analise' ? 'pie-chart' : 'pie-chart-outline'}
            size={22}
            color={telaAtiva === 'analise' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: telaAtiva === 'analise' ? theme.tabBarActive : theme.tabBarInactive },
            ]}
          >
            Análise
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navegarPara('extrato')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={telaAtiva === 'extrato' ? 'document-text' : 'document-text-outline'}
            size={22}
            color={telaAtiva === 'extrato' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: telaAtiva === 'extrato' ? theme.tabBarActive : theme.tabBarInactive },
            ]}
          >
            Extrato
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Global de Novo / Editar Lançamento */}
      <TransactionModal
        visivel={modalTransacaoAberto}
        tipoInicial={modalTransacaoTipoInicial}
        transacaoParaEdicao={transacaoParaEdicao}
        transacaoParaDuplicacao={transacaoParaDuplicacao}
        onFechar={fecharModalTransacao}
      />

      {/* Modal Global de Nova / Editar Categoria */}
      <CategoryModal
        visivel={modalCategoriaAberto}
        categoriaParaEdicao={categoriaParaEdicao}
        onFechar={fecharModalCategoria}
      />

      {/* Modal de Gastos e Rendas Fixas Recorrentes */}
      <RecurringModal
        visivel={modalRecorrentesAberto}
        onFechar={fecharModalRecorrentes}
      />

      {/* Tela de Bloqueio por Biometria se ativada e ainda não autenticado */}
      {biometriaHabilitada && !autenticado && (
        <BiometricLockScreen onAutenticado={() => setAutenticado(true)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudoTela: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
