import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

export type TelaAtiva = 'inicio' | 'historico' | 'analise' | 'extrato' | 'categorias' | 'ajustes';

export const MainLayout: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    modalTransacaoAberto,
    transacaoParaEdicao,
    transacaoParaDuplicacao,
    abrirModalNovoLancamento,
    fecharModalTransacao,
    modalCategoriaAberto,
    categoriaParaEdicao,
    fecharModalCategoria,
  } = useApp();

  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>('inicio');

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
            onNavegarParaHistorico={() => setTelaAtiva('historico')}
            onNavegarParaAnalise={() => setTelaAtiva('analise')}
            onNavegarParaImportacao={() => setTelaAtiva('extrato')}
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
          onPress={() => setTelaAtiva('inicio')}
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
          onPress={() => setTelaAtiva('historico')}
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
          onPress={() => setTelaAtiva('analise')}
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
          onPress={() => setTelaAtiva('extrato')}
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

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTelaAtiva('categorias')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={telaAtiva === 'categorias' ? 'grid' : 'grid-outline'}
            size={22}
            color={telaAtiva === 'categorias' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: telaAtiva === 'categorias' ? theme.tabBarActive : theme.tabBarInactive },
            ]}
          >
            Categorias
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTelaAtiva('ajustes')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={telaAtiva === 'ajustes' ? 'settings' : 'settings-outline'}
            size={22}
            color={telaAtiva === 'ajustes' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: telaAtiva === 'ajustes' ? theme.tabBarActive : theme.tabBarInactive },
            ]}
          >
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Global de Novo / Editar Lançamento */}
      <TransactionModal
        visivel={modalTransacaoAberto}
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
