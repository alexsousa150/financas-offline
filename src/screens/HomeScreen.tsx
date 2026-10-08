import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { MonthSelector } from '../components/MonthSelector';
import { TransactionItem } from '../components/TransactionItem';
import EmptyState from '../components/EmptyState';
import {
  Transacao,
  ResumoFinanceiro,
  FaturaCartao,
  IoniconsName,
} from '../types';
import { getDataHojeIso, formatarMoeda } from '../utils/formatters';
import { AppHaptics } from '../utils/haptics';

interface HomeScreenProps {
  onNavegarParaHistorico: () => void;
  onNavegarParaCategorias?: () => void;
  onNavegarParaAjustes?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavegarParaHistorico,
  onNavegarParaCategorias,
  onNavegarParaAjustes,
}) => {
  const { theme, alternarTema } = useTheme();
  const {
    mesSelecionado,
    setMesSelecionado,
    abrirModalEditarLancamento,
    abrirModalDuplicarLancamento,
    transactionsRepo,
    recurringRepo,
    creditCardEngine,
    faturasRepo,
    settingsRepo,
    notificarMudancaDados,
    alternarStatusPago,
    pagarFatura,
    contas,
    modoPrivacidade,
    alternarModoPrivacidade,
    formatarValor,
    favoritos,
    executarLancamentoFavorito,
    refreshKey,
  } = useApp();

  const [resumoMes, setResumoMes] = React.useState<ResumoFinanceiro>({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    saldoRealizado: 0,
    receitasRealizadas: 0,
    despesasRealizadas: 0,
    receitasPendentes: 0,
    despesasPendentes: 0,
    contasPendentesQtd: 0,
    contasPendentesValor: 0,
  });
  const [transacoesRecentes, setTransacoesRecentes] = React.useState<Transacao[]>([]);
  const [faturasPendentes, setFaturasPendentes] = React.useState<FaturaCartao[]>([]);
  const [gastoHojeCents, setGastoHojeCents] = React.useState<number>(0);
  const [tetoDiarioMetaCents, setTetoDiarioMetaCents] = React.useState<number>(10000);
  const [modalTetoAberto, setModalTetoAberto] = React.useState<boolean>(false);
  const [tetoInputCentavos, setTetoInputCentavos] = React.useState<string>('10000');
  const [atualizando, setAtualizando] = React.useState(false);

  const carregarDadosLocais = React.useCallback(async () => {
    try {
      await creditCardEngine.processarFechamentos();
      await recurringRepo.processarRecorrentesDoMes(mesSelecionado);

      const hojeIso = getDataHojeIso();
      const [resumo, recentes, faturas, txHoje, tetoSalvo] = await Promise.all([
        transactionsRepo.obterResumoMes(mesSelecionado),
        transactionsRepo.listar({ mesAno: mesSelecionado, limite: 8 }),
        faturasRepo.buscarPorStatus('fechada'),
        transactionsRepo.listar({ dataInicio: hojeIso, dataFim: hojeIso }),
        settingsRepo.obter('teto_diario_cents', '10000'),
      ]);

      setResumoMes(resumo);
      setTransacoesRecentes(recentes);
      setFaturasPendentes(faturas);

      const totalHoje = txHoje
        .filter((t) => t.tipo === 'despesa')
        .reduce((acc, t) => acc + t.valor, 0);
      setGastoHojeCents(totalHoje);

      const tetoNum = parseInt(tetoSalvo, 10);
      if (!isNaN(tetoNum) && tetoNum > 0) {
        setTetoDiarioMetaCents(tetoNum);
      }
    } catch (e) {
      console.error('Erro ao carregar dados da HomeScreen:', e);
    }
  }, [mesSelecionado, transactionsRepo, recurringRepo, creditCardEngine, faturasRepo, settingsRepo]);

  React.useEffect(() => {
    carregarDadosLocais();
  }, [carregarDadosLocais, refreshKey]);

  const onRefresh = async () => {
    setAtualizando(true);
    await carregarDadosLocais();
    setAtualizando(false);
  };

  const handleAlternarPago = React.useCallback(
    async (item: Transacao) => {
      await alternarStatusPago(item.id, item.pago === 0 ? 1 : 0);
    },
    [alternarStatusPago]
  );

  const handleExcluir = React.useCallback(
    async (item: Transacao) => {
      await transactionsRepo.excluir(item.id);
      await notificarMudancaDados();
    },
    [transactionsRepo, notificarMudancaDados]
  );

  const abrirModalTeto = () => {
    AppHaptics.toqueLeve();
    setTetoInputCentavos(tetoDiarioMetaCents.toString());
    setModalTetoAberto(true);
  };

  const handleSalvarTeto = async () => {
    const cents = parseInt(tetoInputCentavos.replace(/\D/g, '') || '0', 10);
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Por favor, digite um teto diário maior que zero.');
      return;
    }
    try {
      await settingsRepo.definir('teto_diario_cents', cents.toString());
      setTetoDiarioMetaCents(cents);
      await AppHaptics.toqueSucesso();
      setModalTetoAberto(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o novo teto diário.');
    }
  };

  // Saudação dinâmica baseada no horário
  const horaAtual = new Date().getHours();
  const saudacao =
    horaAtual < 12 ? 'Bom dia!' : horaAtual < 18 ? 'Boa tarde!' : 'Boa noite!';

  // Métricas de teto diário
  const hoje = new Date();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaAtual = hoje.getDate();
  const diasRestantes = Math.max(1, ultimoDiaMes - diaAtual);

  const pctTetoDiario = Math.min(100, Math.round((gastoHojeCents / tetoDiarioMetaCents) * 100));
  const saldoDisponivel = Math.max(0, resumoMes.saldo);
  const disponivelPorDia = Math.round(saldoDisponivel / diasRestantes);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Top Bar: Saudação + Toggle Tema */}
      <View style={styles.topoContainer}>
        <View style={styles.textosTopo}>
          <Text style={[styles.tituloApp, { color: theme.text }]}>Finanças Offline</Text>
          <Text style={[styles.subtituloApp, { color: theme.textSecondary }]}>
            {saudacao} Aqui está seu resumo
          </Text>
        </View>

        <View style={styles.acoesTopo}>
          <TouchableOpacity
            onPress={() => {
              AppHaptics.toqueLeve();
              alternarTema();
            }}
            style={[
              styles.botaoCircularTopo,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.75}
            accessibilityLabel="Alternar tema"
          >
            <Ionicons
              name={theme.isDark ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.isDark ? '#FBBF24' : theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Seletor de Mês Horizontal */}
      <View style={styles.wrapperSeletorMes}>
        <MonthSelector
          mesAno={mesSelecionado}
          onMesChange={setMesSelecionado}
          style={styles.seletorMes}
        />
      </View>

      {/* Hero Saldo Previsto */}
      <View
        style={[
          styles.heroSaldo,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        <View style={styles.linhaTopoHero}>
          <Text style={[styles.labelSaldoPrevisto, { color: theme.textMuted }]}>
            SALDO PREVISTO
          </Text>
          <TouchableOpacity
            onPress={() => {
              AppHaptics.toqueLeve();
              alternarModoPrivacidade();
            }}
            style={[styles.botaoOlho, { backgroundColor: theme.inputBg }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.75}
            accessibilityLabel={modoPrivacidade ? 'Mostrar valores' : 'Ocultar valores'}
          >
            <Ionicons
              name={modoPrivacidade ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.valorSaldoGigante,
            {
              color: modoPrivacidade
                ? theme.text
                : resumoMes.saldo >= 0
                ? '#FFFFFF'
                : theme.danger,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {modoPrivacidade ? '•••••' : formatarValor(resumoMes.saldo)}
        </Text>

        <Text style={[styles.textoSaldoRealizado, { color: theme.textSecondary }]}>
          Já realizado em conta:{' '}
          <Text style={{ color: theme.text, fontWeight: '700' }}>
            {modoPrivacidade ? '•••••' : formatarValor(resumoMes.saldoRealizado)}
          </Text>
        </Text>

        {/* Métricas Receitas e Despesas */}
        <View style={styles.linhaMetricasHero}>
          <View
            style={[
              styles.cardPequenoMetrica,
              { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
            ]}
          >
            <View style={styles.linhaTagMetrica}>
              <Ionicons name="arrow-up-circle" size={14} color={theme.success} />
              <Text style={[styles.labelTagMetrica, { color: theme.textSecondary }]}>
                Receitas
              </Text>
            </View>
            <Text style={[styles.valorTagMetrica, { color: theme.success }]} numberOfLines={1}>
              {modoPrivacidade ? '•••••' : `+ ${formatarValor(resumoMes.receitas)}`}
            </Text>
          </View>

          <View
            style={[
              styles.cardPequenoMetrica,
              { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
            ]}
          >
            <View style={styles.linhaTagMetrica}>
              <Ionicons name="arrow-down-circle" size={14} color={theme.danger} />
              <Text style={[styles.labelTagMetrica, { color: theme.textSecondary }]}>
                Despesas
              </Text>
            </View>
            <Text style={[styles.valorTagMetrica, { color: theme.danger }]} numberOfLines={1}>
              {modoPrivacidade ? '•••••' : `- ${formatarValor(resumoMes.despesas)}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Card Teto Diário com Botão ao Lado para Alteração */}
      <View
        style={[
          styles.cardTetoDiario,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        <View style={styles.linhaTopoTeto}>
          <View style={styles.identificadorTeto}>
            <View
              style={[
                styles.iconeTetoContainer,
                { backgroundColor: theme.primaryLight },
              ]}
            >
              <Ionicons name="locate-outline" size={16} color={theme.primary} />
            </View>
            <Text style={[styles.tituloTeto, { color: theme.text }]}>Teto diário</Text>
          </View>

          {/* Valor atual vs Meta + Botão de Edição ao Lado */}
          <View style={styles.linhaValoresEBotaoTeto}>
            <Text style={[styles.valoresTeto, { color: theme.textSecondary }]}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {modoPrivacidade ? '•••••' : formatarValor(gastoHojeCents)}
              </Text>{' '}
              de {modoPrivacidade ? '•••••' : formatarValor(tetoDiarioMetaCents)}
            </Text>

            <TouchableOpacity
              onPress={abrirModalTeto}
              style={[
                styles.botaoEditarTeto,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Alterar meta de teto diário"
            >
              <Ionicons name="pencil" size={12} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Progresso do Teto */}
        <View style={[styles.trilhoProgressoTeto, { backgroundColor: theme.inputBg }]}>
          <View
            style={[
              styles.barraPreenchimentoTeto,
              {
                width: `${pctTetoDiario}%`,
                backgroundColor:
                  pctTetoDiario > 90
                    ? theme.danger
                    : pctTetoDiario > 70
                    ? theme.warning
                    : theme.primary,
              },
            ]}
          />
        </View>

        <View style={styles.linhaRodapeTeto}>
          <Text style={[styles.textoDiasRestantes, { color: theme.textMuted }]}>
            Restam {diasRestantes} dias no mês
          </Text>
          <Text style={[styles.textoDisponivelDia, { color: theme.primary }]}>
            {modoPrivacidade ? '•••••' : formatarValor(disponivelPorDia)} /dia disponível
          </Text>
        </View>
      </View>

      {/* Atalhos Rápidos Carousel */}
      <View style={styles.secaoAtalhos}>
        <View style={styles.cabecalhoSecao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>
            ⚡ Atalhos rápidos
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollAtalhos}
        >
          {favoritos.length > 0 ? (
            favoritos.map((fav) => (
              <TouchableOpacity
                key={fav.id}
                onPress={async () => {
                  AppHaptics.toqueSucesso();
                  await executarLancamentoFavorito(fav);
                }}
                style={[
                  styles.cardAtalhoItem,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.iconeAtalhoWrapper,
                    {
                      backgroundColor:
                        (fav.categoria_cor || theme.primary) + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={(fav.icone as IoniconsName) || 'pricetag-outline'}
                    size={18}
                    color={fav.categoria_cor || theme.primary}
                  />
                </View>
                <Text style={[styles.nomeAtalho, { color: theme.text }]} numberOfLines={1}>
                  {fav.titulo}
                </Text>
                <Text
                  style={[
                    styles.valorAtalho,
                    { color: fav.tipo === 'despesa' ? theme.danger : theme.success },
                  ]}
                >
                  {formatarMoeda(fav.valor / 100)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            // Atalhos rápidos padrão para inicialização
            [
              { titulo: 'Café', icone: 'cafe-outline', valor: 600, cor: '#FF922B' },
              { titulo: 'Uber', icone: 'car-sport-outline', valor: 2000, cor: '#4D96FF' },
              { titulo: 'Almoço', icone: 'restaurant-outline', valor: 2500, cor: '#FF6B6B' },
              { titulo: 'Mercado', icone: 'cart-outline', valor: 15000, cor: '#20C997' },
              { titulo: 'Farmácia', icone: 'fitness-outline', valor: 3000, cor: '#9B51E0' },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  AppHaptics.toqueLeve();
                }}
                style={[
                  styles.cardAtalhoItem,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.iconeAtalhoWrapper,
                    { backgroundColor: item.cor + '20' },
                  ]}
                >
                  <Ionicons name={item.icone as IoniconsName} size={18} color={item.cor} />
                </View>
                <Text style={[styles.nomeAtalho, { color: theme.text }]} numberOfLines={1}>
                  {item.titulo}
                </Text>
                <Text style={[styles.valorAtalho, { color: theme.danger }]}>
                  {formatarMoeda(item.valor / 100)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Faturas Pendentes (se existirem) */}
      {faturasPendentes?.length > 0 && (
        <View style={styles.secaoFaturas}>
          <View style={styles.cabecalhoSecao}>
            <Text style={[styles.tituloSecao, { color: theme.text }]}>Faturas Pendentes</Text>
          </View>
          {faturasPendentes.map((fatura) => (
            <View
              key={fatura.id}
              style={[
                styles.cardFatura,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <View style={styles.infoFatura}>
                <Text style={[styles.nomeFatura, { color: theme.text }]}>
                  Fatura {fatura.mes_ano}
                </Text>
                <Text style={[styles.valorFatura, { color: theme.text }]}>
                  {formatarValor(fatura.valor_total)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.botaoPagarFatura, { backgroundColor: theme.primary }]}
                onPress={() => pagarFatura(fatura.id, contas[0]?.id || 1)}
              >
                <Text style={styles.textoBotaoPagarFatura}>Pagar Fatura</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Lançamentos Recentes */}
      <View style={styles.secaoRecentes}>
        <View style={styles.cabecalhoSecao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>
            Lançamentos recentes
          </Text>
          <TouchableOpacity
            onPress={onNavegarParaHistorico}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
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

      {/* Modal para Ajustar Teto Diário */}
      <Modal
        visible={modalTetoAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTetoAberto(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlayTeto}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalCardTeto,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.modalCabecalhoTeto}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.iconeTetoContainer,
                    { backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Ionicons name="locate-outline" size={16} color={theme.primary} />
                </View>
                <Text style={[styles.modalTituloTeto, { color: theme.text }]}>
                  Ajustar Teto Diário
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalTetoAberto(false)}
                style={[
                  styles.botaoFecharModalTeto,
                  { backgroundColor: theme.inputBg },
                ]}
              >
                <Ionicons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtituloTeto, { color: theme.textSecondary }]}>
              Defina sua meta diária de gastos para manter seu orçamento sob controle.
            </Text>

            {/* Input do Valor Formatado */}
            <View
              style={[
                styles.inputTetoContainer,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <Text style={[styles.prefixoMoedaTeto, { color: theme.primary }]}>R$</Text>
              <TextInput
                style={[styles.inputTetoTexto, { color: theme.text }]}
                value={
                  tetoInputCentavos
                    ? (parseInt(tetoInputCentavos, 10) / 100).toFixed(2).replace('.', ',')
                    : ''
                }
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                onChangeText={(txt) => {
                  const apenasDigitos = txt.replace(/\D/g, '');
                  setTetoInputCentavos(apenasDigitos);
                }}
                maxLength={8}
                autoFocus
              />
            </View>

            {/* Presets Rápidos */}
            <Text style={[styles.labelPresetsTeto, { color: theme.textMuted }]}>
              VALORES SUGERIDOS
            </Text>
            <View style={styles.linhaPresetsTeto}>
              {[5000, 8000, 10000, 15000, 20000].map((val) => {
                const selecionado = parseInt(tetoInputCentavos, 10) === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      AppHaptics.toqueLeve();
                      setTetoInputCentavos(val.toString());
                    }}
                    style={[
                      styles.chipPresetTeto,
                      {
                        backgroundColor: selecionado ? theme.primaryLight : theme.inputBg,
                        borderColor: selecionado ? theme.primary : theme.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoChipPresetTeto,
                        {
                          color: selecionado ? theme.primary : theme.textSecondary,
                          fontWeight: selecionado ? '700' : '500',
                        },
                      ]}
                    >
                      {formatarMoeda(val / 100)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botões de Ação */}
            <View style={styles.linhaAcoesModalTeto}>
              <TouchableOpacity
                onPress={() => setModalTetoAberto(false)}
                style={[
                  styles.botaoCancelarModalTeto,
                  { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                ]}
              >
                <Text style={[styles.textoBotaoCancelarTeto, { color: theme.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSalvarTeto}
                style={[styles.botaoSalvarModalTeto, { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name="checkmark-sharp"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.textoBotaoSalvarTeto}>Salvar Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
    paddingTop: 12,
  },
  topoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  textosTopo: {
    flex: 1,
  },
  tituloApp: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtituloApp: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  acoesTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botaoCircularTopo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapperSeletorMes: {
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  seletorMes: {
    marginHorizontal: 0,
    marginVertical: 0,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroSaldo: {
    marginHorizontal: 18,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
  },
  linhaTopoHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelSaldoPrevisto: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  botaoOlho: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorSaldoGigante: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginVertical: 8,
  },
  textoSaldoRealizado: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 14,
  },
  linhaMetricasHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardPequenoMetrica: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linhaTagMetrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  labelTagMetrica: {
    fontSize: 11,
    fontWeight: '600',
  },
  valorTagMetrica: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardTetoDiario: {
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
  linhaTopoTeto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  identificadorTeto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconeTetoContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloTeto: {
    fontSize: 14,
    fontWeight: '700',
  },
  linhaValoresEBotaoTeto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valoresTeto: {
    fontSize: 12,
    fontWeight: '500',
  },
  botaoEditarTeto: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trilhoProgressoTeto: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barraPreenchimentoTeto: {
    height: '100%',
    borderRadius: 3,
  },
  linhaRodapeTeto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textoDiasRestantes: {
    fontSize: 11,
    fontWeight: '500',
  },
  textoDisponivelDia: {
    fontSize: 11,
    fontWeight: '700',
  },
  secaoAtalhos: {
    marginBottom: 18,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  tituloSecao: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  linkVerTodos: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollAtalhos: {
    paddingHorizontal: 18,
    gap: 10,
    paddingVertical: 2,
  },
  cardAtalhoItem: {
    width: 105,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconeAtalhoWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  nomeAtalho: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'center',
  },
  valorAtalho: {
    fontSize: 12,
    fontWeight: '700',
  },
  secaoRecentes: {
    paddingHorizontal: 18,
  },
  secaoFaturas: {
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  cardFatura: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoFatura: {
    flex: 1,
  },
  nomeFatura: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  valorFatura: {
    fontSize: 17,
    fontWeight: '700',
  },
  botaoPagarFatura: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  textoBotaoPagarFatura: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Estilos do Modal de Ajuste de Teto */
  modalOverlayTeto: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCardTeto: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  modalCabecalhoTeto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTituloTeto: {
    fontSize: 17,
    fontWeight: '700',
  },
  botaoFecharModalTeto: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtituloTeto: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputTetoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  prefixoMoedaTeto: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  inputTetoTexto: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  labelPresetsTeto: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  linhaPresetsTeto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chipPresetTeto: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoChipPresetTeto: {
    fontSize: 12,
  },
  linhaAcoesModalTeto: {
    flexDirection: 'row',
    gap: 10,
  },
  botaoCancelarModalTeto: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoCancelarTeto: {
    fontSize: 14,
    fontWeight: '600',
  },
  botaoSalvarModalTeto: {
    flex: 1.3,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotaoSalvarTeto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
