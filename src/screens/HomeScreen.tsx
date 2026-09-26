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

  const categoriasComOrcamento = rankingGastos.filter(c => c.limiteMensal && c.limiteMensal > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* Cabeçalho com ícones de navegação */}
      <View style={styles.cabecalho}>
        <MonthSelector mesAno={mesSelecionado} onMesChange={setMesSelecionado} />
        <View style={styles.iconesCabecalho}>
          <TouchableOpacity
            onPress={onNavegarParaCategorias}
            style={styles.botaoCabecalho}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNavegarParaAjustes}
            style={styles.botaoCabecalho}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero do Saldo — sem borda, respiro amplo */}
      <View style={[styles.heroSaldo, { backgroundColor: theme.heroSurface }]}>
        <View style={styles.linhaLabelSaldo}>
          <Text style={[styles.labelSaldo, { color: theme.textSecondary }]}>Saldo em caixa</Text>
          <TouchableOpacity
            onPress={alternarModoPrivacidade}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={modoPrivacidade ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.valorSaldo,
            { color: resumoMes.saldoRealizado >= 0 ? theme.text : theme.danger },
          ]}
        >
          {formatarValor(resumoMes.saldoRealizado)}
        </Text>

        {/* Receitas e Despesas em linha, sem card interno */}
        <View style={styles.linhaMetricas}>
          <View style={styles.colunaMetrica}>
            <View style={styles.linhaRotuloMetrica}>
              <View style={[styles.circuloMetrica, { backgroundColor: theme.successLight }]}>
                <Ionicons name="arrow-up" size={12} color={theme.success} />
              </View>
              <Text style={[styles.labelMetrica, { color: theme.textSecondary }]}>Recebido</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.success }]}>
              {formatarValor(resumoMes.receitasRealizadas)}
            </Text>
          </View>

          <View style={[styles.divisorVertical, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.colunaMetrica}>
            <View style={styles.linhaRotuloMetrica}>
              <View style={[styles.circuloMetrica, { backgroundColor: theme.dangerLight }]}>
                <Ionicons name="arrow-down" size={12} color={theme.danger} />
              </View>
              <Text style={[styles.labelMetrica, { color: theme.textSecondary }]}>Pago</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.danger }]}>
              {formatarValor(resumoMes.despesasRealizadas)}
            </Text>
          </View>
        </View>
      </View>

      {/* Orçamentos (Budgets) */}
      {categoriasComOrcamento.length > 0 && (
        <View style={styles.secaoOrcamentos}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Orçamentos do mês</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollOrcamentos}>
            {categoriasComOrcamento.map((cat) => {
              const estourou = (cat.percentualLimite || 0) >= 100;
              const alerta = (cat.percentualLimite || 0) >= 80 && !estourou;
              
              const corBarra = estourou ? theme.danger : (alerta ? theme.warning : cat.cor);
              const percentualLimitado = Math.min(cat.percentualLimite || 0, 100);

              return (
                <View key={cat.categoriaId} style={[styles.cardOrcamento, { backgroundColor: theme.card }]}>
                  <View style={styles.headerOrcamento}>
                    <View style={styles.iconeOrcamentoContainer}>
                      <Ionicons name={cat.icone as any} size={16} color={cat.cor} />
                      <Text style={[styles.nomeOrcamento, { color: theme.text }]} numberOfLines={1}>
                        {cat.nome}
                      </Text>
                    </View>
                    <Text style={[styles.percentualOrcamento, { color: corBarra }]}>
                      {Math.round(cat.percentualLimite || 0)}%
                    </Text>
                  </View>

                  <View style={[styles.barraFundo, { backgroundColor: theme.cardBorder }]}>
                    <View 
                      style={[
                        styles.barraPreenchimento, 
                        { width: `${percentualLimitado}%`, backgroundColor: corBarra }
                      ]} 
                    />
                  </View>

                  <Text style={[styles.textoRestanteOrcamento, { color: theme.textSecondary }]}>
                    {estourou 
                      ? `Excedeu ${formatarValor(Math.abs(cat.restanteLimite || 0))}` 
                      : `Restam ${formatarValor(cat.restanteLimite || 0)} de ${formatarValor(cat.limiteMensal || 0)}`
                    }
                  </Text>
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
          <TouchableOpacity onPress={onNavegarParaHistorico} activeOpacity={0.7}>
            <Text style={[styles.linkVerTodos, { color: theme.primary }]}>Ver tudo</Text>
          </TouchableOpacity>
        </View>

        {transacoesRecentes.length === 0 ? (
          <View style={styles.containerVazio}>
            <Ionicons name="receipt-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.tituloVazio, { color: theme.textSecondary }]}>
              Nenhum lançamento neste mês
            </Text>
            <Text style={[styles.subtituloVazio, { color: theme.textMuted }]}>
              Toque no + para registrar um gasto ou entrada.
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
    paddingBottom: 100,
  },

  /* Cabeçalho */
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  iconesCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botaoCabecalho: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero do Saldo */
  heroSaldo: {
    marginHorizontal: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    borderRadius: 20,
    marginTop: 4,
  },
  linhaLabelSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  labelSaldo: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  valorSaldo: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: 20,
  },

  /* Métricas inline */
  linhaMetricas: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colunaMetrica: {
    flex: 1,
  },
  divisorVertical: {
    width: 1,
    height: 32,
    marginHorizontal: 14,
    opacity: 0.5,
  },
  linhaRotuloMetrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  circuloMetrica: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelMetrica: {
    fontSize: 12,
    fontWeight: '500',
  },
  valorMetrica: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  /* Orçamentos */
  secaoOrcamentos: {
    marginTop: 24,
  },
  scrollOrcamentos: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  cardOrcamento: {
    width: 200,
    padding: 14,
    borderRadius: 16,
  },
  headerOrcamento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconeOrcamentoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  nomeOrcamento: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  percentualOrcamento: {
    fontSize: 12,
    fontWeight: '700',
  },
  barraFundo: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barraPreenchimento: {
    height: '100%',
    borderRadius: 3,
  },
  textoRestanteOrcamento: {
    fontSize: 12,
  },

  /* Seção Recentes */
  secaoRecentes: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tituloSecao: {
    fontSize: 15,
    fontWeight: '700',
  },
  linkVerTodos: {
    fontSize: 13,
    fontWeight: '600',
  },
  containerVazio: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tituloVazio: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  subtituloVazio: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
