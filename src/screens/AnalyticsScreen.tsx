import { IoniconsName } from '../types';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { MonthSelector } from '../components/MonthSelector';
import { DonutChart, FatiaGrafico } from '../components/DonutChart';
import { CategoryProgressBar } from '../components/CategoryProgressBar';
import { formatarMoeda } from '../utils/formatters';
import { ComprometimentoFuturo, ProjecaoFluxoMes, AnomaliaGasto } from '../types';
import EmptyState from '../components/EmptyState';

export const AnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    mesSelecionado,
    setMesSelecionado,
    resumoMes,
    rankingGastos,
    analiseEssencial,
    transactionsRepo,
    carregarDadosPainel,
    exportarRelatorioPdfMes,
  } = useApp();

  const [atualizando, setAtualizando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [modoPeriodo, setModoPeriodo] = useState<'mes' | 'ano'>('mes');
  const [comprometimentoFuturo, setComprometimentoFuturo] = useState<ComprometimentoFuturo[]>([]);
  const [projecaoFluxo, setProjecaoFluxo] = useState<ProjecaoFluxoMes[]>([]);
  const [anomaliasGastos, setAnomaliasGastos] = useState<AnomaliaGasto[]>([]);
  const [resumoAno, setResumoAno] = useState<{
    receitas: number;
    despesas: number;
    saldo: number;
    taxaEconomia: number;
    mesesComDados: number;
  } | null>(null);

  const anoSelecionado = parseInt(mesSelecionado.split('-')[0], 10);

  const carregarDadosExtras = useCallback(async () => {
    try {
      const [futuro, anoRes, fluxo, anomalias] = await Promise.all([
        transactionsRepo.obterComprometimentoFuturo(6),
        transactionsRepo.obterResumoAno(anoSelecionado),
        transactionsRepo.obterProjecaoFluxoCaixa(3),
        transactionsRepo.obterAnomaliasGastos(mesSelecionado),
      ]);
      setComprometimentoFuturo(futuro);
      setResumoAno(anoRes);
      setProjecaoFluxo(fluxo);
      setAnomaliasGastos(anomalias);
    } catch (e) {
      console.error('Erro ao carregar dados extras:', e);
    }
  }, [transactionsRepo, anoSelecionado, mesSelecionado]);

  useEffect(() => {
    carregarDadosExtras();
  }, [carregarDadosExtras]);

  const onRefresh = async () => {
    setAtualizando(true);
    await Promise.all([carregarDadosPainel(), carregarDadosExtras()]);
    setAtualizando(false);
  };

  // Prepara fatias para o Donut Chart
  const fatiasGrafico: FatiaGrafico[] = rankingGastos.map((item) => ({
    nome: item.nome,
    valor: item.total,
    cor: item.cor,
    percentual: item.percentual,
  }));

  const taxaEconomia =
    resumoMes.receitas > 0
      ? ((resumoMes.receitas - resumoMes.despesas) / resumoMes.receitas) * 100
      : 0;

  const handleExportarPdf = async () => {
    try {
      setGerandoPdf(true);
      await exportarRelatorioPdfMes(mesSelecionado);
    } catch (e: any) {
      Alert.alert('Erro ao gerar PDF', 'Não foi possível gerar o relatório. ' + (e.message || ''));
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* Alternador de Visão: Mês vs Ano */}
      <View style={[styles.containerTogglePeriodo, { backgroundColor: theme.inputBg }]}>
        <TouchableOpacity
          onPress={() => setModoPeriodo('mes')}
          style={[
            styles.botaoTogglePeriodo,
            modoPeriodo === 'mes' && { backgroundColor: theme.primary },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={modoPeriodo === 'mes' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.textoTogglePeriodo,
              { color: modoPeriodo === 'mes' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Visão Mensal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModoPeriodo('ano')}
          style={[
            styles.botaoTogglePeriodo,
            modoPeriodo === 'ano' && { backgroundColor: theme.primary },
          ]}
        >
          <Ionicons
            name="trending-up-outline"
            size={14}
            color={modoPeriodo === 'ano' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.textoTogglePeriodo,
              { color: modoPeriodo === 'ano' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Visão Anual ({anoSelecionado})
          </Text>
        </TouchableOpacity>
      </View>

      {modoPeriodo === 'ano' && resumoAno && (
        <View style={[styles.cardResumo, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginBottom: 12 }]}>
          <View style={styles.linhaResumoCabecalho}>
            <Text style={[styles.tituloResumo, { color: theme.textSecondary }]}>
              Balanço Acumulado de {anoSelecionado}
            </Text>
            <View
              style={[
                styles.badgeTaxa,
                { backgroundColor: resumoAno.taxaEconomia >= 0 ? theme.successLight : theme.dangerLight },
              ]}
            >
              <Ionicons
                name={resumoAno.taxaEconomia >= 0 ? 'shield-checkmark' : 'alert-circle'}
                size={13}
                color={resumoAno.taxaEconomia >= 0 ? theme.success : theme.danger}
              />
              <Text
                style={[
                  styles.textoTaxa,
                  { color: resumoAno.taxaEconomia >= 0 ? theme.success : theme.danger },
                ]}
              >
                {resumoAno.taxaEconomia >= 0 ? `Poupança: ${resumoAno.taxaEconomia}%` : 'Déficit anual'}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.saldoDestaque,
              { color: resumoAno.saldo >= 0 ? theme.text : theme.danger },
            ]}
          >
            {formatarMoeda(resumoAno.saldo)}
          </Text>

          <View style={styles.gridMetricas}>
            <View style={[styles.itemMetrica, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.rotuloMetrica, { color: theme.textSecondary }]}>Entradas no Ano</Text>
              <Text style={[styles.valorMetrica, { color: theme.success }]}>
                {formatarMoeda(resumoAno.receitas)}
              </Text>
            </View>

            <View style={[styles.itemMetrica, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.rotuloMetrica, { color: theme.textSecondary }]}>Saídas no Ano</Text>
              <Text style={[styles.valorMetrica, { color: theme.danger }]}>
                {formatarMoeda(resumoAno.despesas)}
              </Text>
            </View>
          </View>

          <Text style={[styles.dicaFinanceira, { color: theme.textSecondary, marginTop: 12 }]}>
            Você registrou movimentações em {resumoAno.mesesComDados} mês(es) de {anoSelecionado}.
          </Text>
        </View>
      )}

      {/* Seletor de Mês (apenas no modo mensal) */}
      {modoPeriodo === 'mes' && (
        <MonthSelector mesAno={mesSelecionado} onMesChange={setMesSelecionado} />
      )}

      {/* Card Resumo do Período */}
      <View style={[styles.cardResumo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.linhaResumoCabecalho}>
          <Text style={[styles.tituloResumo, { color: theme.textSecondary }]}>
            Balanço do período
          </Text>
          <View
            style={[
              styles.badgeTaxa,
              { backgroundColor: taxaEconomia >= 0 ? theme.successLight : theme.dangerLight },
            ]}
          >
            <Ionicons
              name={taxaEconomia >= 0 ? 'shield-checkmark' : 'alert-circle'}
              size={13}
              color={taxaEconomia >= 0 ? theme.success : theme.danger}
            />
            <Text
              style={[
                styles.textoTaxa,
                { color: taxaEconomia >= 0 ? theme.success : theme.danger },
              ]}
            >
              {taxaEconomia >= 0 ? `Economia: ${taxaEconomia.toFixed(0)}%` : 'Déficit no mês'}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.saldoDestaque,
            { color: resumoMes.saldo >= 0 ? theme.text : theme.danger },
          ]}
        >
          {formatarMoeda(resumoMes.saldo)}
        </Text>

        <View style={styles.gridMetricas}>
          <View style={[styles.itemMetrica, { backgroundColor: theme.inputBg }]}>
            <Text style={[styles.rotuloMetrica, { color: theme.textSecondary }]}>Receitas</Text>
            <Text style={[styles.valorMetrica, { color: theme.success }]}>
              {formatarMoeda(resumoMes.receitas)}
            </Text>
          </View>

          <View style={[styles.itemMetrica, { backgroundColor: theme.inputBg }]}>
            <Text style={[styles.rotuloMetrica, { color: theme.textSecondary }]}>Despesas</Text>
            <Text style={[styles.valorMetrica, { color: theme.danger }]}>
              {formatarMoeda(resumoMes.despesas)}
            </Text>
          </View>
        </View>

        {modoPeriodo === 'mes' && (
          <TouchableOpacity
            style={[styles.botaoExportarPdf, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
            onPress={handleExportarPdf}
            disabled={gerandoPdf}
            activeOpacity={0.8}
          >
            {gerandoPdf ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={17} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.textoBotaoExportarPdf, { color: theme.text }]}>
                  Exportar fechamento em PDF
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Diagnóstico Essencial vs Estilo de Vida (Regra 50/30/20) */}
      {analiseEssencial && (analiseEssencial.totalEssencial > 0 || analiseEssencial.totalEstiloDeVida > 0 || analiseEssencial.totalPoupanca > 0) && (
        <View style={[styles.cardDiagnosticoEssencial, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cabecalhoDiagnostico}>
            <View style={[styles.circuloIcone, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="pie-chart" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloSecao, { color: theme.text }]}>Regra 50 / 30 / 20</Text>
              <Text style={[styles.subtituloDiagnostico, { color: theme.textSecondary }]}>
                Divisão dos seus gastos: Essencial, Estilo e Poupança
              </Text>
            </View>
          </View>

          {/* Barra Comparativa Tricolor */}
          <View style={[styles.barraComparativaContainer, { borderRadius: 8 }]}>
            {analiseEssencial.totalEssencial > 0 && (
              <View
                style={[
                  styles.barraSegmento,
                  {
                    backgroundColor: theme.success,
                    flex: Math.max(1, analiseEssencial.percentualEssencial),
                  },
                ]}
              />
            )}
            {analiseEssencial.totalEstiloDeVida > 0 && (
              <View
                style={[
                  styles.barraSegmento,
                  {
                    backgroundColor: theme.warning,
                    flex: Math.max(1, analiseEssencial.percentualEstiloDeVida),
                  },
                ]}
              />
            )}
            {analiseEssencial.totalPoupanca > 0 && (
              <View
                style={[
                  styles.barraSegmento,
                  {
                    backgroundColor: theme.primary,
                    flex: Math.max(1, analiseEssencial.percentualPoupanca),
                  },
                ]}
              />
            )}
          </View>

          <View style={styles.linhaDetalheEssencial}>
            <View style={styles.colunaEssencial}>
              <View style={styles.linhaIndicadorCor}>
                <View style={[styles.bolinhaCor, { backgroundColor: theme.success }]} />
                <Text style={[styles.labelClassificacao, { color: theme.text }]}>Essencial</Text>
              </View>
              <Text style={[styles.valorClassificacao, { color: theme.success }]}>
                {formatarMoeda(analiseEssencial.totalEssencial)} ({analiseEssencial.percentualEssencial.toFixed(0)}%)
              </Text>
            </View>

            <View style={styles.colunaEssencial}>
              <View style={styles.linhaIndicadorCor}>
                <View style={[styles.bolinhaCor, { backgroundColor: theme.warning }]} />
                <Text style={[styles.labelClassificacao, { color: theme.text }]}>Estilo</Text>
              </View>
              <Text style={[styles.valorClassificacao, { color: theme.warning }]}>
                {formatarMoeda(analiseEssencial.totalEstiloDeVida)} ({analiseEssencial.percentualEstiloDeVida.toFixed(0)}%)
              </Text>
            </View>

            <View style={styles.colunaEssencial}>
              <View style={styles.linhaIndicadorCor}>
                <View style={[styles.bolinhaCor, { backgroundColor: theme.primary }]} />
                <Text style={[styles.labelClassificacao, { color: theme.text }]}>Poupança</Text>
              </View>
              <Text style={[styles.valorClassificacao, { color: theme.primary }]}>
                {formatarMoeda(analiseEssencial.totalPoupanca)} ({analiseEssencial.percentualPoupanca.toFixed(0)}%)
              </Text>
            </View>
          </View>

          <Text style={[styles.dicaFinanceira, { color: theme.textSecondary }]}>
            Ref.: 50% necessidades · 30% conforto · 20% reservas
          </Text>
        </View>
      )}

      {/* Alerta de Gastos Atípicos (Detecção de Anomalias) */}
      {anomaliasGastos.length > 0 && (
        <View style={[styles.cardAnomalias, { backgroundColor: theme.card, borderColor: theme.warning }]}>
          <View style={styles.cabecalhoDiagnostico}>
            <View style={[styles.circuloIcone, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="warning-outline" size={20} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloSecao, { color: theme.text }]}>Gastos atípicos detectados</Text>
              <Text style={[styles.subtituloDiagnostico, { color: theme.textSecondary }]}>
                Categorias acima da média nos últimos meses
              </Text>
            </View>
          </View>

          <View style={styles.listaAnomalias}>
            {anomaliasGastos.map((anomalia) => (
              <View
                key={anomalia.categoriaId}
                style={[styles.itemAnomalia, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
              >
                <View style={styles.linhaTopoAnomalia}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons
                      name={(anomalia.categoriaIcone as IoniconsName) || 'pricetag-outline'}
                      size={16}
                      color={anomalia.categoriaCor || theme.primary}
                    />
                    <Text style={[styles.nomeCategoriaAnomalia, { color: theme.text }]}>
                      {anomalia.categoriaNome}
                    </Text>
                  </View>
                  <View style={[styles.badgeAumento, { backgroundColor: theme.dangerLight }]}>
                    <Ionicons name="arrow-up" size={11} color={theme.danger} />
                    <Text style={[styles.textoBadgeAumento, { color: theme.danger }]}>
                      +{anomalia.percentualAcima}%
                    </Text>
                  </View>
                </View>

                <Text style={[styles.textoDetalheAnomalia, { color: theme.textSecondary }]}>
                  Gasto atual de <Text style={{ fontWeight: '700', color: theme.text }}>{formatarMoeda(anomalia.valorAtual)}</Text> contra média histórica de{' '}
                  <Text style={{ fontWeight: '600', color: theme.textMuted }}>{formatarMoeda(anomalia.mediaHistorica)}</Text> (+{formatarMoeda(anomalia.diferenca)}).
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Projeção de Fluxo de Caixa (Próximos 3 Meses) */}
      {projecaoFluxo.length > 0 && (
        <View style={[styles.cardComprometimento, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cabecalhoDiagnostico}>
            <View style={[styles.circuloIcone, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloSecao, { color: theme.text }]}>Fluxo de caixa projetado</Text>
              <Text style={[styles.subtituloDiagnostico, { color: theme.textSecondary }]}>
                Estimativa baseada no histórico recente
              </Text>
            </View>
          </View>

          <View style={styles.listaMesesFuturos}>
            {projecaoFluxo.map((p) => {
              const positivo = p.saldoMesEstimado >= 0;
              return (
                <View
                  key={p.mesAno}
                  style={[styles.itemMesFuturo, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nomeMesFuturo, { color: theme.text }]}>{p.nomeMes}</Text>
                    <Text style={[styles.detalhesMesFuturo, { color: theme.textSecondary }]}>
                      Entradas: {formatarMoeda(p.receitasEsperadas)} • Saídas: {formatarMoeda(p.despesasComprometidas)}
                    </Text>
                    <Text style={[styles.detalhesMesFuturo, { color: theme.textMuted, marginTop: 2 }]}>
                      Saldo estimado acumulado: {formatarMoeda(p.saldoAcumuladoEstimado)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.valorTotalFuturo, { color: positivo ? theme.success : theme.danger }]}>
                      {positivo ? '+' : ''}{formatarMoeda(p.saldoMesEstimado)}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: positivo ? theme.success : theme.danger }}>
                      {positivo ? 'Margem Livre' : 'Déficit Previsto'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Projeção de Comprometimento Futuro (Próximos 6 meses) */}
      {comprometimentoFuturo.length > 0 && (
        <View style={[styles.cardComprometimento, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cabecalhoDiagnostico}>
            <View style={[styles.circuloIcone, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="trending-up" size={20} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloSecao, { color: theme.text }]}>Comprometimento futuro</Text>
              <Text style={[styles.subtituloDiagnostico, { color: theme.textSecondary }]}>
                Despesas fixas e parcelas previstas
              </Text>
            </View>
          </View>

          <View style={styles.listaMesesFuturos}>
            {comprometimentoFuturo.map((f, i) => (
              <View
                key={f.mesAno}
                style={[
                  styles.itemMesFuturo,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nomeMesFuturo, { color: theme.text }]}>{f.nomeMes}</Text>
                  <Text style={[styles.detalhesMesFuturo, { color: theme.textSecondary }]}>
                    {f.qtdParcelas > 0 ? `${f.qtdParcelas} parcelas (${formatarMoeda(f.totalParcelas)})` : 'Sem parcelas'}
                    {f.totalRecorrentes > 0 ? ` + Fixos (${formatarMoeda(f.totalRecorrentes)})` : ''}
                  </Text>
                </View>

                <Text style={[styles.valorTotalFuturo, { color: theme.danger }]}>
                  {formatarMoeda(f.totalComprometido)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Gráfico de Rosca / Donut */}
      {rankingGastos.length > 0 && (
        <View style={[styles.cardGrafico, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>
            Distribuição dos gastos por categoria
          </Text>

          <DonutChart
            dados={fatiasGrafico}
            tamanho={230}
            espessura={30}
            subtituloCentro="Total Saídas"
            tituloCentro={formatarMoeda(resumoMes.despesas)}
          />

          {/* Legenda compacta das fatias */}
          <View style={styles.gridLegenda}>
            {rankingGastos.slice(0, 6).map((item) => (
              <View key={item.categoriaId} style={styles.itemLegenda}>
                <View style={[styles.pontoCor, { backgroundColor: item.cor }]} />
                <Text style={[styles.textoLegenda, { color: theme.text }]} numberOfLines={1}>
                  {item.nome} ({item.percentual.toFixed(0)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Ranking Detalhado com Barras de Progresso e Comparação */}
      <View style={styles.secaoRanking}>
        <Text style={[styles.tituloSecao, { color: theme.text, marginBottom: 12 }]}>
          Ranking de gastos no mês
        </Text>

        {rankingGastos.length === 0 ? (
          <EmptyState
            icone="pie-chart-outline"
            titulo="Sem despesas para análise neste período"
            subtitulo="Adicione lançamentos de despesa para visualizar seu diagnóstico e gráficos."
          />
        ) : (
          rankingGastos.map((cat, idx) => (
            <CategoryProgressBar
              key={cat.categoriaId}
              item={cat}
              isMaiorGasto={idx === 0}
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
  containerTogglePeriodo: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 3,
  },
  botaoTogglePeriodo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  textoTogglePeriodo: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardResumo: {
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  linhaResumoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tituloResumo: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTaxa: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  textoTaxa: {
    fontSize: 11,
    fontWeight: '700',
  },
  saldoDestaque: {
    fontSize: 30,
    fontWeight: '900',
    marginVertical: 4,
  },
  gridMetricas: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  itemMetrica: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  rotuloMetrica: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  valorMetrica: {
    fontSize: 16,
    fontWeight: '800',
  },
  botaoExportarPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  textoBotaoExportarPdf: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardDiagnosticoEssencial: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  cabecalhoDiagnostico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  circuloIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtituloDiagnostico: {
    fontSize: 11,
    marginTop: 1,
  },
  barraComparativaContainer: {
    height: 14,
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 12,
  },
  barraSegmento: {
    height: '100%',
  },
  linhaDetalheEssencial: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  colunaEssencial: {
    flex: 1,
  },
  linhaIndicadorCor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  bolinhaCor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelClassificacao: {
    fontSize: 11,
    fontWeight: '600',
  },
  valorClassificacao: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 14,
  },
  dicaFinanceira: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  cardAnomalias: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  cabecalhoAnomalia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  listaAnomalias: {
    gap: 8,
  },
  itemAnomalia: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linhaTopoAnomalia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nomeCategoriaAnomalia: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeAumento: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  textoBadgeAumento: {
    fontSize: 11,
    fontWeight: '800',
  },
  textoDetalheAnomalia: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardComprometimento: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  listaMesesFuturos: {
    gap: 8,
  },
  itemMesFuturo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  nomeMesFuturo: {
    fontSize: 13,
    fontWeight: '700',
  },
  detalhesMesFuturo: {
    fontSize: 11,
    marginTop: 1,
  },
  valorTotalFuturo: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardGrafico: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  tituloSecao: {
    fontSize: 16,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  gridLegenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    justifyContent: 'center',
  },
  itemLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pontoCor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textoLegenda: {
    fontSize: 12,
    fontWeight: '600',
  },
  secaoRanking: {
    marginHorizontal: 16,
    marginTop: 20,
  },
});
