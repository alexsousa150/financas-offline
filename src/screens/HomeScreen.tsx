import { IoniconsName } from '../types';
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
import EmptyState from '../components/EmptyState';
import { Transacao } from '../types';

interface HomeScreenProps {
  onNavegarParaHistorico: () => void;
  onNavegarParaAnalise?: () => void;
  onNavegarParaImportacao?: () => void;
  onNavegarParaCategorias?: () => void;
  onNavegarParaAjustes?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavegarParaHistorico,
  onNavegarParaCategorias,
  onNavegarParaAjustes,
}) => {
  const { theme } = useTheme();
  const {
    mesSelecionado,
    setMesSelecionado,
    resumoMes,
    rankingGastos,
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

  const handleAlternarPago = React.useCallback(async (item: Transacao) => {
    await alternarStatusPago(item.id, item.pago === 0 ? 1 : 0);
  }, [alternarStatusPago]);

  const handleExcluir = React.useCallback(async (item: Transacao) => {
    await transactionsRepo.excluir(item.id);
    await notificarMudancaDados();
  }, [transactionsRepo, notificarMudancaDados]);

  const categoriasComOrcamento = rankingGastos.filter(c => c.limiteMensal && c.limiteMensal > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* Cabeçalho com seletor de mês e ações rápidas */}
      <View style={styles.cabecalho}>
        <MonthSelector
          mesAno={mesSelecionado}
          onMesChange={setMesSelecionado}
          style={styles.seletorMes}
        />
        <View style={styles.iconesCabecalho}>
          <TouchableOpacity
            onPress={onNavegarParaCategorias}
            style={[styles.botaoCabecalho, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityLabel="Categorias"
          >
            <Ionicons name="grid-outline" size={19} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNavegarParaAjustes}
            style={[styles.botaoCabecalho, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityLabel="Configurações"
          >
            <Ionicons name="settings-outline" size={19} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero do Saldo — card refinado com borda e sombra sutil */}
      <View
        style={[
          styles.heroSaldo,
          {
            backgroundColor: theme.heroSurface,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <View style={styles.linhaLabelSaldo}>
          <Text style={[styles.labelSaldo, { color: theme.textSecondary }]}>Saldo em caixa</Text>
          <TouchableOpacity
            onPress={alternarModoPrivacidade}
            style={[styles.botaoOlho, { backgroundColor: theme.isDark ? '#20222C' : '#F1F2F6' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            accessibilityLabel={modoPrivacidade ? 'Mostrar valores' : 'Ocultar valores'}
          >
            <Ionicons
              name={modoPrivacidade ? 'eye-off-outline' : 'eye-outline'}
              size={17}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.valorSaldo,
            {
              color: modoPrivacidade
                ? theme.text
                : resumoMes.saldoRealizado >= 0
                ? theme.text
                : theme.danger,
            },
          ]}
        >
          {formatarValor(resumoMes.saldoRealizado)}
        </Text>

        {/* Receitas e Despesas em cards simétricos */}
        <View style={styles.linhaMetricas}>
          <View
            style={[
              styles.cardMetrica,
              {
                backgroundColor: theme.successLight,
                borderColor: theme.isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(5, 150, 105, 0.15)',
              },
            ]}
          >
            <View style={styles.linhaRotuloMetrica}>
              <Ionicons name="arrow-up-circle" size={15} color={theme.success} />
              <Text style={[styles.labelMetrica, { color: theme.success }]}>Recebido</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.success }]} numberOfLines={1}>
              {formatarValor(resumoMes.receitasRealizadas)}
            </Text>
          </View>

          <View
            style={[
              styles.cardMetrica,
              {
                backgroundColor: theme.dangerLight,
                borderColor: theme.isDark ? 'rgba(248, 113, 113, 0.2)' : 'rgba(225, 29, 72, 0.15)',
              },
            ]}
          >
            <View style={styles.linhaRotuloMetrica}>
              <Ionicons name="arrow-down-circle" size={15} color={theme.danger} />
              <Text style={[styles.labelMetrica, { color: theme.danger }]}>Pago</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.danger }]} numberOfLines={1}>
              {formatarValor(resumoMes.despesasRealizadas)}
            </Text>
          </View>
        </View>
      </View>

      {/* Orçamentos (Budgets) */}
      {categoriasComOrcamento.length > 0 && (
        <View style={styles.secaoOrcamentos}>
          <View style={styles.cabecalhoSecaoOrcamentos}>
            <Text style={[styles.tituloSecao, { color: theme.text }]}>Orçamentos do mês</Text>
            <Text style={[styles.badgeContagemOrcamento, { color: theme.textSecondary }]}>
              {categoriasComOrcamento.length} {categoriasComOrcamento.length === 1 ? 'ativo' : 'ativos'}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollOrcamentos}
          >
            {categoriasComOrcamento.map((cat) => {
              const estourou = (cat.percentualLimite || 0) >= 100;
              const alerta = (cat.percentualLimite || 0) >= 80 && !estourou;

              const corBarra = estourou ? theme.danger : alerta ? theme.warning : cat.cor;
              const percentualLimitado = Math.min(cat.percentualLimite || 0, 100);

              return (
                <View
                  key={cat.categoriaId}
                  style={[
                    styles.cardOrcamento,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}
                >
                  <View style={styles.headerOrcamento}>
                    <View style={styles.iconeOrcamentoContainer}>
                      <View style={[styles.circuloIconeOrcamento, { backgroundColor: cat.cor + '1A' }]}>
                        <Ionicons name={cat.icone as IoniconsName} size={15} color={cat.cor} />
                      </View>
                      <Text style={[styles.nomeOrcamento, { color: theme.text }]} numberOfLines={1}>
                        {cat.nome}
                      </Text>
                    </View>
                    <View style={[styles.pillPercentual, { backgroundColor: corBarra + '1A' }]}>
                      <Text style={[styles.percentualOrcamento, { color: corBarra }]}>
                        {Math.round(cat.percentualLimite || 0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.barraFundo, { backgroundColor: theme.isDark ? '#23242C' : '#EEF0F4' }]}>
                    <View
                      style={[
                        styles.barraPreenchimento,
                        { width: `${percentualLimitado}%`, backgroundColor: corBarra },
                      ]}
                    />
                  </View>

                  <View style={styles.footerOrcamento}>
                    <Text style={[styles.textoRestanteOrcamento, { color: estourou ? theme.danger : theme.textSecondary }]} numberOfLines={1}>
                      {estourou
                        ? `Excedeu ${formatarValor(Math.abs(cat.restanteLimite || 0))}`
                        : `Restam ${formatarValor(cat.restanteLimite || 0)}`}
                    </Text>
                    <Text style={[styles.textoLimiteTotal, { color: theme.textMuted }]} numberOfLines={1}>
                      de {formatarValor(cat.limiteMensal || 0)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Lançamentos Recentes */}
      <View style={styles.secaoRecentes}>
        <View style={styles.cabecalhoSecao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Lançamentos recentes</Text>
          <TouchableOpacity onPress={onNavegarParaHistorico} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.linkVerTodos, { color: theme.primary }]}>Ver tudo</Text>
          </TouchableOpacity>
        </View>

        {transacoesRecentes.length === 0 ? (
          <EmptyState
            icone="receipt-outline"
            titulo="Nenhum lançamento neste mês"
            subtitulo="Toque no botão + abaixo para registrar seus gastos ou entradas."
          />
        ) : (
          transacoesRecentes.map((t) => (
            <TransactionItem
              key={t.id}
              transacao={t}
              onEditar={abrirModalEditarLancamento}
              onDuplicar={abrirModalDuplicarLancamento}
              onAlternarPago={handleAlternarPago}
              onExcluir={handleExcluir}
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
    paddingBottom: 130,
    paddingTop: 8,
  },

  /* Cabeçalho */
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  seletorMes: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconesCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botaoCabecalho: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero do Saldo */
  heroSaldo: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  linhaLabelSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  labelSaldo: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  botaoOlho: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorSaldo: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginVertical: 10,
  },

  /* Métricas inline */
  linhaMetricas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  cardMetrica: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  linhaRotuloMetrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  labelMetrica: {
    fontSize: 12,
    fontWeight: '700',
  },
  valorMetrica: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  /* Orçamentos */
  secaoOrcamentos: {
    marginBottom: 24,
  },
  cabecalhoSecaoOrcamentos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  badgeContagemOrcamento: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollOrcamentos: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  cardOrcamento: {
    width: 250,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerOrcamento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconeOrcamentoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  circuloIconeOrcamento: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomeOrcamento: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  pillPercentual: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  percentualOrcamento: {
    fontSize: 11,
    fontWeight: '800',
  },
  barraFundo: {
    height: 7,
    borderRadius: 3.5,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 10,
  },
  barraPreenchimento: {
    height: '100%',
    borderRadius: 3.5,
  },
  footerOrcamento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  textoRestanteOrcamento: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  textoLimiteTotal: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Seção Recentes */
  secaoRecentes: {
    paddingHorizontal: 16,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tituloSecao: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  linkVerTodos: {
    fontSize: 13,
    fontWeight: '700',
  },
});
