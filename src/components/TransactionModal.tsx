import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { TipoTransacao, Transacao, FormaPagamento, IoniconsName } from '../types';
import { useTransactionForm } from '../hooks/useTransactionForm';
import {
  formatarMoeda,
  getDataHojeIso,
  getDataOntemIso,
  formatarDataBr,
} from '../utils/formatters';
import { CategoryModal } from './CategoryModal';
import { AppHaptics } from '../utils/haptics';

const OPCOES_PARCELAS = [2, 3, 4, 5, 6, 8, 10, 12, 18, 24];
const DIAS_RAPIDOS = [1, 5, 10, 12, 15, 20, 25, 28, 30];

const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string; icone: IoniconsName }[] = [
  { id: 'pix', label: 'PIX', icone: 'flash-outline' },
  { id: 'cartao_credito', label: 'Cartão', icone: 'card-outline' },
  { id: 'dinheiro', label: 'Dinheiro', icone: 'cash-outline' },
  { id: 'outro', label: 'Outro', icone: 'ellipsis-horizontal-circle-outline' },
];

interface TransactionModalProps {
  visivel: boolean;
  tipoInicial?: TipoTransacao;
  transacaoParaEdicao?: Transacao | null;
  transacaoParaDuplicacao?: Transacao | null;
  onFechar: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visivel,
  tipoInicial,
  transacaoParaEdicao,
  transacaoParaDuplicacao,
  onFechar,
}) => {
  const { theme } = useTheme();
  const {
    transactionsRepo,
    categorias,
    carregarCategorias,
    notificarMudancaDados,
  } = useApp();

  const {
    tipo,
    setValorTextoCentavos,
    categoriaId,
    setCategoriaId,
    dataIso,
    setDataIso,
    descricao,
    setDescricao,
    salvando,
    lembreteAtivo,
    setLembreteAtivo,
    pago,
    setPago,
    formaPagamento,
    setFormaPagamento,
    mostrarDiasCustom,
    setMostrarDiasCustom,
    dataInputTexto,
    isParcelado,
    setIsParcelado,
    numeroParcelas,
    setNumeroParcelas,
    modalNovaCategoriaVisivel,
    setModalNovaCategoriaVisivel,
    alternarTipo,
    selecionarDiaDoMes,
    handleDataTextoChange,
    valorNumerico,
    valorParcelaCalculado,
    sugestoesRapidas,
    handleSalvar,
  } = useTransactionForm({
    visivel,
    tipoInicial,
    transacaoParaEdicao,
    transacaoParaDuplicacao,
    categorias,
    transactionsRepo,
    notificarMudancaDados,
    onFechar,
  });

  // Teclado numérico in-modal
  const pressionarDigito = (digito: string) => {
    AppHaptics.toqueLeve();
    setValorTextoCentavos((prev) => {
      const limpo = (prev || '').replace(/\D/g, '');
      if (limpo.length >= 9) return limpo;
      if (limpo === '' && digito === '0') return '';
      return limpo + digito;
    });
  };

  const limparValor = () => {
    AppHaptics.toqueLeve();
    setValorTextoCentavos('');
  };

  const apagarDigito = () => {
    AppHaptics.toqueLeve();
    setValorTextoCentavos((prev) => {
      const limpo = (prev || '').replace(/\D/g, '');
      if (limpo.length <= 1) return '';
      return limpo.slice(0, -1);
    });
  };

  // Filtragem dinâmica de categorias
  const categoriasExibidas = useMemo(() => {
    if (tipo === 'receita') {
      const filtradas = categorias.filter((c) => {
        const nome = c.nome.toLowerCase();
        return (
          nome.includes('salário') ||
          nome.includes('salario') ||
          nome.includes('renda') ||
          nome.includes('freelance') ||
          nome.includes('invest') ||
          nome.includes('poupança') ||
          nome.includes('poupanca') ||
          nome.includes('outros')
        );
      });
      return filtradas.length > 0 ? filtradas : categorias;
    } else {
      const filtradas = categorias.filter((c) => {
        const nome = c.nome.toLowerCase();
        return (
          !nome.includes('salário') &&
          !nome.includes('salario') &&
          !nome.includes('freelance')
        );
      });
      return filtradas.length > 0 ? filtradas : categorias;
    }
  }, [categorias, tipo]);

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.conteudo, { backgroundColor: theme.card }]}>
          {/* Indicador de arraste superior */}
          <View style={styles.dragHandle} />

          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <Text style={[styles.titulo, { color: theme.text }]}>
              {transacaoParaEdicao
                ? 'Editar lançamento'
                : transacaoParaDuplicacao
                ? 'Duplicar lançamento'
                : 'Novo lançamento'}
            </Text>
            <TouchableOpacity
              onPress={onFechar}
              style={[styles.botaoFechar, { backgroundColor: theme.inputBg }]}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Toggle Tipo (Despesa / Receita) */}
            <View
              style={[
                styles.toggleContainer,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TouchableOpacity
                onPress={() => alternarTipo('despesa')}
                style={[
                  styles.toggleBotao,
                  tipo === 'despesa' && { backgroundColor: theme.danger },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={16}
                  color={tipo === 'despesa' ? '#FFFFFF' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleTexto,
                    { color: tipo === 'despesa' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Despesa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => alternarTipo('receita')}
                style={[
                  styles.toggleBotao,
                  tipo === 'receita' && { backgroundColor: theme.success },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={16}
                  color={tipo === 'receita' ? '#FFFFFF' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleTexto,
                    { color: tipo === 'receita' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Receita
                </Text>
              </TouchableOpacity>
            </View>

            {/* Display do Valor em Destaque */}
            <View style={styles.displayValorWrapper}>
              <Text
                style={[
                  styles.displayValorTexto,
                  { color: '#FFFFFF' },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatarMoeda(valorNumerico)}
              </Text>

              {isParcelado && numeroParcelas > 1 && valorNumerico > 0 && (
                <Text style={[styles.subtextoParcelaDisplay, { color: theme.danger }]}>
                  {numeroParcelas}x de {formatarMoeda(valorParcelaCalculado)}
                </Text>
              )}
            </View>

            {/* Teclado Numérico In-Modal */}
            <View style={styles.tecladoContainer}>
              <View style={styles.tecladoLinha}>
                {['1', '2', '3'].map((dig) => (
                  <TouchableOpacity
                    key={dig}
                    style={[
                      styles.teclaBotao,
                      { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    ]}
                    onPress={() => pressionarDigito(dig)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.teclaTexto, { color: theme.text }]}>{dig}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tecladoLinha}>
                {['4', '5', '6'].map((dig) => (
                  <TouchableOpacity
                    key={dig}
                    style={[
                      styles.teclaBotao,
                      { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    ]}
                    onPress={() => pressionarDigito(dig)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.teclaTexto, { color: theme.text }]}>{dig}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tecladoLinha}>
                {['7', '8', '9'].map((dig) => (
                  <TouchableOpacity
                    key={dig}
                    style={[
                      styles.teclaBotao,
                      { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    ]}
                    onPress={() => pressionarDigito(dig)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.teclaTexto, { color: theme.text }]}>{dig}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tecladoLinha}>
                <TouchableOpacity
                  style={[
                    styles.teclaBotao,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                  ]}
                  onPress={limparValor}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.teclaTexto, { color: theme.danger, fontWeight: '700' }]}>
                    C
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.teclaBotao,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                  ]}
                  onPress={() => pressionarDigito('0')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.teclaTexto, { color: theme.text }]}>0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.teclaBotao,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                  ]}
                  onPress={apagarDigito}
                  activeOpacity={0.7}
                >
                  <Ionicons name="backspace-outline" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Seção Categoria em Grid 3 Colunas */}
            <View style={styles.secaoHeaderLinha}>
              <Text style={[styles.rotuloSecao, { color: theme.textMuted }]}>CATEGORIA</Text>
              <TouchableOpacity
                onPress={() => setModalNovaCategoriaVisivel(true)}
                style={styles.botaoAdicionarCategoria}
              >
                <Ionicons name="add" size={14} color={theme.primary} />
                <Text style={[styles.textoAdicionarCategoria, { color: theme.primary }]}>
                  Nova
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridCategorias}>
              {categoriasExibidas.map((cat) => {
                const selecionada = categoriaId === cat.id;
                const iconeValido = (cat.icone as IoniconsName) || 'pricetag-outline';

                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      AppHaptics.toqueLeve();
                      setCategoriaId(cat.id);
                    }}
                    style={[
                      styles.cardCategoriaGrid,
                      {
                        backgroundColor: selecionada ? theme.primaryLight : theme.inputBg,
                        borderColor: selecionada ? theme.primary : theme.cardBorder,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.circuloIconeCategoria,
                        {
                          backgroundColor: selecionada
                            ? theme.primary
                            : (cat.cor || theme.cardBorder) + '22',
                        },
                      ]}
                    >
                      <Ionicons
                        name={iconeValido}
                        size={18}
                        color={selecionada ? '#FFFFFF' : cat.cor || theme.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.nomeCategoriaGrid,
                        {
                          color: selecionada ? '#FFFFFF' : theme.textSecondary,
                          fontWeight: selecionada ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seção Data & Vencimento */}
            <View style={styles.secaoHeaderLinha}>
              <Text style={[styles.rotuloSecao, { color: theme.textMuted }]}>DATA</Text>
              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  setMostrarDiasCustom(!mostrarDiasCustom);
                }}
              >
                <Text style={[styles.textoAdicionarCategoria, { color: theme.primary }]}>
                  {mostrarDiasCustom ? 'Ocultar' : 'Outra data...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linhaBotoesData}>
              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  const hoje = getDataHojeIso();
                  setDataIso(hoje);
                  if (dataInputTexto) handleDataTextoChange(formatarDataBr(hoje));
                }}
                style={[
                  styles.chipDataPill,
                  {
                    backgroundColor:
                      dataIso === getDataHojeIso() ? theme.primaryLight : theme.inputBg,
                    borderColor:
                      dataIso === getDataHojeIso() ? theme.primary : theme.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textoChipDataPill,
                    {
                      color:
                        dataIso === getDataHojeIso() ? theme.primary : theme.textSecondary,
                    },
                  ]}
                >
                  Hoje ({formatarDataBr(getDataHojeIso())})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  const ontem = getDataOntemIso();
                  setDataIso(ontem);
                  if (dataInputTexto) handleDataTextoChange(formatarDataBr(ontem));
                }}
                style={[
                  styles.chipDataPill,
                  {
                    backgroundColor:
                      dataIso === getDataOntemIso() ? theme.primaryLight : theme.inputBg,
                    borderColor:
                      dataIso === getDataOntemIso() ? theme.primary : theme.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textoChipDataPill,
                    {
                      color:
                        dataIso === getDataOntemIso() ? theme.primary : theme.textSecondary,
                    },
                  ]}
                >
                  Ontem ({formatarDataBr(getDataOntemIso())})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Seletor Customizado de Dia */}
            {mostrarDiasCustom && (
              <View
                style={[
                  styles.boxDiasCustom,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Text style={[styles.subrotuloPequeno, { color: theme.textSecondary }]}>
                  Dias rápidos:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollDiasRapidos}
                >
                  {DIAS_RAPIDOS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => selecionarDiaDoMes(d)}
                      style={[
                        styles.chipDiaNumero,
                        {
                          backgroundColor: dataIso.endsWith(
                            `-${String(d).padStart(2, '0')}`
                          )
                            ? theme.primary
                            : theme.card,
                          borderColor: dataIso.endsWith(`-${String(d).padStart(2, '0')}`)
                            ? theme.primary
                            : theme.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.textoChipDiaNumero,
                          {
                            color: dataIso.endsWith(`-${String(d).padStart(2, '0')}`)
                              ? '#FFFFFF'
                              : theme.text,
                          },
                        ]}
                      >
                        Dia {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.linhaInputDataManual}>
                  <Text style={[styles.labelInputManual, { color: theme.textSecondary }]}>
                    Data livre:
                  </Text>
                  <TextInput
                    style={[
                      styles.inputDataManual,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                        color: theme.text,
                      },
                    ]}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={theme.textMuted}
                    value={dataInputTexto}
                    onChangeText={handleDataTextoChange}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            )}

            {/* Opção de Compra Parcelada (apenas para despesas) */}
            {tipo === 'despesa' && !transacaoParaEdicao && (
              <View
                style={[
                  styles.cardParcelamento,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <View style={styles.linhaToggleParcelado}>
                  <View style={styles.infoTextoParcelado}>
                    <Ionicons name="card-outline" size={18} color={theme.text} />
                    <Text style={[styles.tituloParcelado, { color: theme.text }]}>
                      Compra Parcelada?
                    </Text>
                  </View>
                  <Switch
                    value={isParcelado}
                    onValueChange={(val) => {
                      AppHaptics.toqueSelecao();
                      setIsParcelado(val);
                      if (val) setFormaPagamento('cartao_credito');
                    }}
                    thumbColor={isParcelado ? theme.primary : '#F4F4F5'}
                    trackColor={{ false: '#71717A', true: theme.primaryLight }}
                  />
                </View>

                {isParcelado && (
                  <View style={styles.conteudoParcelamentoAtivo}>
                    <Text
                      style={[styles.subrotuloPequeno, { color: theme.textSecondary, marginBottom: 8 }]}
                    >
                      Número de Parcelas
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.scrollParcelas}
                    >
                      {OPCOES_PARCELAS.map((num) => (
                        <TouchableOpacity
                          key={num}
                          onPress={() => {
                            AppHaptics.toqueLeve();
                            setNumeroParcelas(num);
                          }}
                          style={[
                            styles.chipParcela,
                            {
                              backgroundColor:
                                numeroParcelas === num ? theme.primary : theme.card,
                              borderColor:
                                numeroParcelas === num ? theme.primary : theme.cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.textoChipParcela,
                              { color: numeroParcelas === num ? '#FFFFFF' : theme.text },
                            ]}
                          >
                            {num}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {valorNumerico > 0 && (
                      <View
                        style={[
                          styles.boxResumoParcelas,
                          { backgroundColor: theme.card, borderColor: theme.cardBorder },
                        ]}
                      >
                        <Text style={[styles.textoResumoParcelas, { color: theme.text }]}>
                          {numeroParcelas}x de{' '}
                          <Text style={{ fontWeight: '800', color: theme.danger }}>
                            {formatarMoeda(valorParcelaCalculado)}
                          </Text>
                        </Text>
                        <Text
                          style={[
                            styles.subtextoResumoParcelas,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Parcelas futuras serão geradas como pendentes.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Descrição Opcional */}
            <View style={styles.secaoHeaderLinha}>
              <Text style={[styles.rotuloSecao, { color: theme.textMuted }]}>
                DESCRIÇÃO (OPCIONAL)
              </Text>
            </View>

            {sugestoesRapidas.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollSugestoesDescricao}
              >
                {sugestoesRapidas.map((sug) => {
                  const ativa = descricao === sug;
                  return (
                    <TouchableOpacity
                      key={sug}
                      onPress={() => {
                        AppHaptics.toqueLeve();
                        setDescricao(sug);
                      }}
                      style={[
                        styles.chipSugestao,
                        {
                          backgroundColor: ativa ? theme.primaryLight : theme.inputBg,
                          borderColor: ativa ? theme.primary : theme.inputBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.textoChipSugestao,
                          { color: ativa ? theme.primary : theme.textSecondary },
                        ]}
                      >
                        {sug}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TextInput
              style={[
                styles.inputDescricao,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder={
                tipo === 'despesa'
                  ? 'Ex: Café da manhã, Mercado...'
                  : 'Ex: Salário mensal, Freelance...'
              }
              placeholderTextColor={theme.textMuted}
              value={descricao}
              onChangeText={setDescricao}
              maxLength={60}
            />

            {/* Forma de Pagamento */}
            <View style={styles.secaoHeaderLinha}>
              <Text style={[styles.rotuloSecao, { color: theme.textMuted }]}>
                FORMA DE PAGAMENTO
              </Text>
            </View>

            <View style={styles.linhaChipsForma}>
              {FORMAS_PAGAMENTO.map((fp) => {
                const selecionada = formaPagamento === fp.id;
                return (
                  <TouchableOpacity
                    key={fp.id}
                    onPress={() => {
                      AppHaptics.toqueLeve();
                      setFormaPagamento(fp.id);
                    }}
                    style={[
                      styles.chipFormaItem,
                      {
                        backgroundColor: selecionada ? theme.primary : theme.inputBg,
                        borderColor: selecionada ? theme.primary : theme.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={fp.icone}
                      size={15}
                      color={selecionada ? '#FFFFFF' : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.textoChipForma,
                        { color: selecionada ? '#FFFFFF' : theme.textSecondary },
                      ]}
                    >
                      {fp.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status (Pago vs Pendente) */}
            <View style={styles.secaoHeaderLinha}>
              <Text style={[styles.rotuloSecao, { color: theme.textMuted }]}>STATUS</Text>
            </View>

            <View style={styles.linhaChipsStatus}>
              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  setPago(true);
                }}
                style={[
                  styles.chipStatusItem,
                  {
                    backgroundColor: pago ? theme.primaryLight : theme.inputBg,
                    borderColor: pago ? theme.primary : theme.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={pago ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.textoChipStatus,
                    {
                      color: pago ? theme.primary : theme.textSecondary,
                      fontWeight: pago ? '700' : '500',
                    },
                  ]}
                >
                  ✓ Pago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  setPago(false);
                }}
                style={[
                  styles.chipStatusItem,
                  {
                    backgroundColor: !pago ? 'rgba(245, 158, 11, 0.15)' : theme.inputBg,
                    borderColor: !pago ? theme.warning : theme.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={!pago ? theme.warning : theme.textMuted}
                />
                <Text
                  style={[
                    styles.textoChipStatus,
                    {
                      color: !pago ? theme.warning : theme.textSecondary,
                      fontWeight: !pago ? '700' : '500',
                    },
                  ]}
                >
                  Pendente
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lembrete de Vencimento para Despesas Pendentes */}
            {tipo === 'despesa' && !pago && (
              <View
                style={[
                  styles.cardLembrete,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <View style={styles.linhaToggleLembrete}>
                  <View style={styles.infoTextoLembrete}>
                    <Ionicons name="notifications-outline" size={18} color={theme.warning} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.tituloLembrete, { color: theme.text }]}>
                        Lembrar Vencimento?
                      </Text>
                      <Text style={[styles.subtituloLembrete, { color: theme.textSecondary }]}>
                        Notificação local no dia
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={lembreteAtivo}
                    onValueChange={(val) => {
                      AppHaptics.toqueSelecao();
                      setLembreteAtivo(val);
                    }}
                    thumbColor={lembreteAtivo ? theme.primary : '#F4F4F5'}
                    trackColor={{ false: '#71717A', true: theme.primaryLight }}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Botão de Confirmação Fixo no Rodapé */}
          <View style={styles.rodapeFixo}>
            <TouchableOpacity
              style={[
                styles.botaoSalvar,
                { backgroundColor: theme.primary },
                salvando && { opacity: 0.7 },
              ]}
              onPress={handleSalvar}
              disabled={salvando}
              activeOpacity={0.85}
            >
              <Ionicons
                name="checkmark-sharp"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.textoBotaoSalvar}>
                {salvando
                  ? 'Salvando...'
                  : transacaoParaEdicao
                  ? 'Atualizar lançamento'
                  : 'Registrar lançamento'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal Inline para Nova Categoria */}
        <CategoryModal
          visivel={modalNovaCategoriaVisivel}
          onFechar={() => setModalNovaCategoriaVisivel(false)}
          onCategoriaCriada={(novaCat) => {
            carregarCategorias();
            setCategoriaId(novaCat.id);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  conteudo: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    maxHeight: '94%',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleBotao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  toggleTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  displayValorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  displayValorTexto: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtextoParcelaDisplay: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  tecladoContainer: {
    gap: 8,
    marginBottom: 20,
  },
  tecladoLinha: {
    flexDirection: 'row',
    gap: 8,
  },
  teclaBotao: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teclaTexto: {
    fontSize: 21,
    fontWeight: '600',
  },
  secaoHeaderLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  rotuloSecao: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  botaoAdicionarCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  textoAdicionarCategoria: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridCategorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardCategoriaGrid: {
    width: '31.3%',
    height: 74,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  circuloIconeCategoria: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nomeCategoriaGrid: {
    fontSize: 11,
    textAlign: 'center',
  },
  linhaBotoesData: {
    flexDirection: 'row',
    gap: 8,
  },
  chipDataPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  textoChipDataPill: {
    fontSize: 12,
    fontWeight: '600',
  },
  boxDiasCustom: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  subrotuloPequeno: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  scrollDiasRapidos: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chipDiaNumero: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoChipDiaNumero: {
    fontSize: 12,
    fontWeight: '700',
  },
  linhaInputDataManual: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  labelInputManual: {
    fontSize: 12,
  },
  inputDataManual: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  cardParcelamento: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  linhaToggleParcelado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTextoParcelado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tituloParcelado: {
    fontSize: 13,
    fontWeight: '700',
  },
  conteudoParcelamentoAtivo: {
    marginTop: 10,
  },
  scrollParcelas: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chipParcela: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoChipParcela: {
    fontSize: 13,
    fontWeight: '800',
  },
  boxResumoParcelas: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoResumoParcelas: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtextoResumoParcelas: {
    fontSize: 11,
    marginTop: 2,
  },
  scrollSugestoesDescricao: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 4,
  },
  chipSugestao: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoChipSugestao: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputDescricao: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  linhaChipsForma: {
    flexDirection: 'row',
    gap: 8,
  },
  chipFormaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  textoChipForma: {
    fontSize: 12,
    fontWeight: '700',
  },
  linhaChipsStatus: {
    flexDirection: 'row',
    gap: 8,
  },
  chipStatusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  textoChipStatus: {
    fontSize: 13,
  },
  cardLembrete: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  linhaToggleLembrete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTextoLembrete: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tituloLembrete: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtituloLembrete: {
    fontSize: 11,
    marginTop: 2,
  },
  rodapeFixo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  botaoSalvar: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  textoBotaoSalvar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
