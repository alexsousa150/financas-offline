import React, { useState, useEffect } from 'react';
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
import { DonutChart, FatiaGrafico } from '../components/DonutChart';
import { CategoryProgressBar } from '../components/CategoryProgressBar';
import { formatarMoeda, formatarVariacao } from '../utils/formatters';
import { ComprometimentoFuturo } from '../types';

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
  } = useApp();

  const [atualizando, setAtualizando] = useState(false);
  const [modoPeriodo, setModoPeriodo] = useState<'mes' | 'ano'>('mes');
  const [comprometimentoFuturo, setComprometimentoFuturo] = useState<ComprometimentoFuturo[]>([]);
  const [resumoAno, setResumoAno] = useState<{
    receitas: number;
    despesas: number;
    saldo: number;
    taxaEconomia: number;
    mesesComDados: number;
  } | null>(null);

  const anoSelecionado = parseInt(mesSelecionado.split('-')[0], 10);

  const carregarDadosExtras = async () => {
    try {
      const [futuro, anoRes] = await Promise.all([
        transactionsRepo.obterComprometimentoFuturo(6),
        transactionsRepo.obterResumoAno(anoSelecionado),
      ]);
      setComprometimentoFuturo(futuro);
      setResumoAno(anoRes);
    } catch (e) {
      console.error('Erro ao carregar dados extras:', e);
    }
  };

  useEffect(() => {
    carregarDadosExtras();
  }, [mesSelecionado]);

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

  const maiorSangria = rankingGastos.length > 0 ? rankingGastos[0] : null;
  const variacaoSangria = maiorSangria ? formatarVariacao(maiorSangria.variacaoPercentual) : null;

  const taxaEconomia =
    resumoMes.receitas > 0
      ? ((resumoMes.receitas - resumoMes.despesas) / resumoMes.receitas) * 100
      : 0;

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
            📈 <Text style={{ fontWeight: '700' }}>Evolução de Longo Prazo:</Text> Você movimentou suas finanças em {resumoAno.mesesComDados} mês(es) de {anoSelecionado}.
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
            Balanço do Período
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
      </View>

      {/* Diagnóstico 50/30/20 (Essencial vs Estilo de Vida) */}
      {analiseEssencial && (analiseEssencial.totalEssencial > 0 || analiseEssencial.totalEstiloDeVida > 0) && (
        <View style={[styles.cardDiagnosticoEssencial, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cabecalhoDiagnostico}>
            <View style={[styles.circuloIcone, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="pie-chart" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloSecao, { color: theme.text }]}>Diagnóstico: Essencial vs Estilo de Vida</Text>
              <Text style={[styles.subtituloDiagnostico, { color: theme.textSecondary }]}>
                Regra 50/30/20 de Saúde Financeira
              </Text>
            </View>
          </View>

          {/* Barra Comparativa Bicolor */}
          <View style={styles.barraComparativaContainer}>
            <View
              style={[
                styles.barraSegmento,
                {
                  backgroundColor: theme.success,
                  flex: Math.max(1, analiseEssencial.percentualEssencial),
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                  borderTopRightRadius: analiseEssencial.percentualEstiloDeVida === 0 ? 8 : 0,
                  borderBottomRightRadius: analiseEssencial.percentualEstiloDeVida === 0 ? 8 : 0,
                },
              ]}
            />
            <View
              style={[
                styles.barraSegmento,
                {
                  backgroundColor: theme.warning,
                  flex: Math.max(1, analiseEssencial.percentualEstiloDeVida),
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                  borderTopLeftRadius: analiseEssencial.percentualEssencial === 0 ? 8 : 0,
                  borderBottomLeftRadius: analiseEssencial.percentualEssencial === 0 ? 8 : 0,
                },
              ]}
            />
          </View>

          <View style={styles.linhaDetalheEssencial}>
            <View style={styles.colunaEssencial}>
              <View style={styles.linhaIndicadorCor}>
                <View style={[styles.bolinhaCor, { backgroundColor: theme.success }]} />
                <Text style={[styles.labelClassificacao, { color: theme.text }]}>Essencial (Sobrevivência)</Text>
              </View>
              <Text style={[styles.valorClassificacao, { color: theme.success }]}>
                {formatarMoeda(analiseEssencial.totalEssencial)} ({analiseEssencial.percentualEssencial.toFixed(0)}%)
              </Text>
            </View>

            <View style={styles.colunaEssencial}>
              <View style={styles.linhaIndicadorCor}>
                <View style={[styles.bolinhaCor, { backgroundColor: theme.warning }]} />
                <Text style={[styles.labelClassificacao, { color: theme.text }]}>Estilo de Vida (Lazer)</Text>
              </View>
              <Text style={[styles.valorClassificacao, { color: theme.warning }]}>
                {formatarMoeda(analiseEssencial.totalEstiloDeVida)} ({analiseEssencial.percentualEstiloDeVida.toFixed(0)}%)
              </Text>
            </View>
          </View>

          <Text style={[styles.dicaFinanceira, { color: theme.textSecondary }]}>
            💡 <Text style={{ fontWeight: '700' }}>Dica do Analista:</Text> O ideal é manter os gastos essenciais abaixo de 50-60% da sua renda, reservando o restante para qualidade de vida e poupança.
          </Text>
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
              <Text style={[styles.tituloSecao, { color: theme.text }]}>Renda Futura Comprometida</Text>
              <Text style={[styles.subtituloDiagnostico, { color: theme.textSecondary }]}>
                Parcelas e contas fixas agendadas para os próximos 6 meses
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

      {/* Diagnóstico de Sangria Financeira */}
      {maiorSangria && maiorSangria.total > 0 && (
        <View
          style={[
            styles.cardSangriaDestaque,
            { backgroundColor: theme.card, borderColor: theme.danger },
          ]}
        >
          <View style={styles.cabecalhoSangriaDestaque}>
            <View style={[styles.iconeFogo, { backgroundColor: theme.dangerLight }]}>
              <Ionicons name="flame" size={22} color={theme.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tagAlerta, { color: theme.danger }]}>
                Onde você está mais gastando
              </Text>
              <Text style={[styles.tituloMaiorGasto, { color: theme.text }]}>
                {maiorSangria.nome} é o seu maior dreno financeiro
              </Text>
            </View>
          </View>

          <View style={styles.dadosSangria}>
            <Text style={[styles.textoExplicativo, { color: theme.textSecondary }]}>
              Representa <Text style={{ fontWeight: '800', color: theme.text }}>{maiorSangria.percentual.toFixed(1)}%</Text> de todas as suas saídas do mês, somando{' '}
              <Text style={{ fontWeight: '800', color: theme.danger }}>{formatarMoeda(maiorSangria.total)}</Text>.
            </Text>

            {variacaoSangria && (
              <View style={[styles.boxVariacao, { backgroundColor: theme.inputBg }]}>
                <Ionicons
                  name={variacaoSangria.tipo === 'aumento' ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={variacaoSangria.tipo === 'aumento' ? theme.danger : theme.success}
                />
                <Text
                  style={[
                    styles.textoBoxVariacao,
                    { color: variacaoSangria.tipo === 'aumento' ? theme.danger : theme.success },
                  ]}
                >
                  {variacaoSangria.tipo === 'aumento'
                    ? `Cresceu ${variacaoSangria.texto} em relação ao mês anterior`
                    : `Reduziu ${variacaoSangria.texto} em relação ao mês anterior`}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Gráfico de Rosca / Donut */}
      {rankingGastos.length > 0 && (
        <View style={[styles.cardGrafico, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>
            Distribuição dos Gastos por Categoria
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
          Ranking de Gastos no Mês
        </Text>

        {rankingGastos.length === 0 ? (
          <View style={[styles.containerVazio, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="pie-chart-outline" size={42} color={theme.textMuted} />
            <Text style={[styles.tituloVazio, { color: theme.text }]}>
              Sem despesas para análise neste período
            </Text>
            <Text style={[styles.subtituloVazio, { color: theme.textSecondary }]}>
              Adicione lançamentos de despesa para visualizar seu diagnóstico e gráficos.
            </Text>
          </View>
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
  cardSangriaDestaque: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  cabecalhoSangriaDestaque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconeFogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagAlerta: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tituloMaiorGasto: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  dadosSangria: {
    marginTop: 4,
  },
  textoExplicativo: {
    fontSize: 13,
    lineHeight: 19,
  },
  boxVariacao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  textoBoxVariacao: {
    fontSize: 12,
    fontWeight: '700',
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
  containerVazio: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloVazio: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  subtituloVazio: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
