import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { MonthSelector } from '../components/MonthSelector';
import { TransactionItem } from '../components/TransactionItem';

interface HomeScreenProps {
  onNavegarParaHistorico: () => void;
  onNavegarParaAnalise?: () => void;
  onNavegarParaImportacao?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavegarParaHistorico,
}) => {
  const { theme } = useTheme();
  const {
    mesSelecionado,
    setMesSelecionado,
    resumoMes,
    transacoesRecentes,
    carregarDadosPainel,
    abrirModalEditarLancamento,
    abrirModalDuplicarLancamento,
    transactionsRepo,
    notificarMudancaDados,
    alternarStatusPago,
    modoPrivacidade,
    alternarModoPrivacidade,
    formatarValor,
  } = useApp();

  const [atualizando, setAtualizando] = React.useState(false);

  const onRefresh = async () => {
    setAtualizando(true);
    await carregarDadosPainel();
    setAtualizando(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* Seletor de Mês */}
      <MonthSelector mesAno={mesSelecionado} onMesChange={setMesSelecionado} />

      {/* Cartão de Saldo e Movimentações Realizadas */}
      <View style={[styles.cardSaldo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.topoCardSaldo}>
          <View style={styles.linhaTituloSaldo}>
            <Text style={[styles.labelSaldo, { color: theme.textSecondary }]}>Saldo em caixa hoje</Text>
            <TouchableOpacity
              onPress={alternarModoPrivacidade}
              style={styles.botaoOlho}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={modoPrivacidade ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.badgeOffline, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={12} color={theme.primary} />
            <Text style={[styles.textoOffline, { color: theme.primary }]}>100% no aparelho</Text>
          </View>
        </View>

        {/* Valor do Saldo Realizado */}
        <Text
          style={[
            styles.valorSaldo,
            { color: resumoMes.saldoRealizado >= 0 ? theme.text : theme.danger },
          ]}
        >
          {formatarValor(resumoMes.saldoRealizado)}
        </Text>

        <View style={styles.divisor} />

        {/* Linha com Entradas Pagas e Saídas Pagas */}
        <View style={styles.linhaMetricas}>
          {/* Receitas pagas */}
          <View style={styles.colunaMetrica}>
            <View style={styles.linhaRotuloMetrica}>
              <View style={[styles.circuloMetrica, { backgroundColor: theme.successLight }]}>
                <Ionicons name="arrow-up" size={14} color={theme.success} />
              </View>
              <Text style={[styles.labelMetrica, { color: theme.textSecondary }]}>Receitas recebidas</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.success }]}>
              {formatarValor(resumoMes.receitasRealizadas)}
            </Text>
          </View>

          {/* Despesas pagas */}
          <View style={styles.colunaMetrica}>
            <View style={styles.linhaRotuloMetrica}>
              <View style={[styles.circuloMetrica, { backgroundColor: theme.dangerLight }]}>
                <Ionicons name="arrow-down" size={14} color={theme.danger} />
              </View>
              <Text style={[styles.labelMetrica, { color: theme.textSecondary }]}>Despesas pagas</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.danger }]}>
              {formatarValor(resumoMes.despesasRealizadas)}
            </Text>
          </View>
        </View>
      </View>

      {/* Lançamentos Recentes */}
      <View style={styles.secaoRecentes}>
        <View style={styles.cabecalhoSecao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Lançamentos recentes</Text>
          <TouchableOpacity onPress={onNavegarParaHistorico}>
            <Text style={[styles.linkVerTodos, { color: theme.primary }]}>Ver histórico</Text>
          </TouchableOpacity>
        </View>

        {transacoesRecentes.length === 0 ? (
          <View style={[styles.containerVazio, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="receipt-outline" size={38} color={theme.textMuted} />
            <Text style={[styles.tituloVazio, { color: theme.text }]}>Nenhum lançamento no mês</Text>
            <Text style={[styles.subtituloVazio, { color: theme.textSecondary }]}>
              Toque no botão + para adicionar seus gastos ou entradas.
            </Text>
          </View>
        ) : (
          transacoesRecentes.map((t) => (
            <TransactionItem
              key={t.id}
              transacao={t}
              onEditar={abrirModalEditarLancamento}
              onDuplicar={abrirModalDuplicarLancamento}
              onAlternarPago={(item) => alternarStatusPago(item.id, item.pago === 0 ? 1 : 0)}
              onExcluir={async (item) => {
                await transactionsRepo.excluir(item.id);
                await notificarMudancaDados();
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  cardSaldo: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
  },
  topoCardSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  linhaTituloSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelSaldo: {
    fontSize: 13,
    fontWeight: '600',
  },
  botaoOlho: {
    padding: 2,
  },
  badgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  textoOffline: {
    fontSize: 11,
    fontWeight: '600',
  },
  valorSaldo: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  divisor: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.12)',
    marginVertical: 14,
  },
  linhaMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  colunaMetrica: {
    flex: 1,
  },
  linhaRotuloMetrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  circuloMetrica: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelMetrica: {
    fontSize: 12,
    fontWeight: '600',
  },
  valorMetrica: {
    fontSize: 16,
    fontWeight: '700',
  },
  secaoRecentes: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tituloSecao: {
    fontSize: 16,
    fontWeight: '700',
  },
  linkVerTodos: {
    fontSize: 13,
    fontWeight: '600',
  },
  containerVazio: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  tituloVazio: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtituloVazio: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
