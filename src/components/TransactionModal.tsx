import { IoniconsName } from '../types';
import React, { useRef } from 'react';
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
import { TipoTransacao, Transacao, FormaPagamento } from '../types';
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

const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string; icone: any }[] = [
  { id: 'pix', label: 'Pix', icone: 'flash-outline' },
  { id: 'cartao_credito', label: 'Crédito', icone: 'card-outline' },
  { id: 'cartao_debito', label: 'Débito', icone: 'card' },
  { id: 'dinheiro', label: 'Dinheiro', icone: 'cash-outline' },
  { id: 'outro', label: 'Outro', icone: 'ellipsis-horizontal-circle-outline' },
];

const SUGESTOES_RENDA = ['Salário', 'Adiantamento', 'Renda Extra', 'Pix Recebido', 'Freelance'];

const SUGESTOES_DESCRICAO_PADRAO: Record<string, string[]> = {
  alimentação: ['Supermercado', 'Padaria', 'Almoço', 'iFood / Delivery', 'Feira / Açougue', 'Lanche'],
  transporte: ['Combustível', 'Uber / 99', 'Estacionamento', 'Pedágio', 'Oficina', 'Passagem'],
  moradia: ['Aluguel', 'Condomínio', 'Energia Elétrica', 'Água', 'Internet', 'Gás', 'Mercado'],
  saúde: ['Farmácia', 'Consulta Médica', 'Dentista', 'Exames', 'Remédios'],
  lazer: ['Cinema', 'Restaurante / Bar', 'Viagem', 'Passeio', 'Streaming'],
  salário: SUGESTOES_RENDA,
  renda: SUGESTOES_RENDA,
  outros: ['Pix', 'Transferência', 'Compra Diversa', 'Presente'],
};

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
    favoritos,
    executarLancamentoFavorito,
    carregarCategorias,
    notificarMudancaDados,
  } = useApp();

    const {
    tipo, setTipo,
    valorTextoCentavos, setValorTextoCentavos,
    categoriaId, setCategoriaId,
    dataIso, setDataIso,
    descricao, setDescricao,
    salvando,
    lembreteAtivo, setLembreteAtivo,
    pago, setPago,
    formaPagamento, setFormaPagamento,
    mostrarDiasCustom, setMostrarDiasCustom,
    dataInputTexto, setDataInputTexto,
    isParcelado, setIsParcelado,
    numeroParcelas, setNumeroParcelas,
    modalNovaCategoriaVisivel, setModalNovaCategoriaVisivel,
    inputValorRef,
    alternarTipo,
    selecionarDiaDoMes,
    handleDataTextoChange,
    valorNumerico,
    valorParcelaCalculado,
    categoriaEscolhida,
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

  const corTemaTipo = tipo === 'despesa' ? theme.danger : theme.success;

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.conteudo, { backgroundColor: theme.card }]}>
          {/* Indicador de arraste */}
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
            <TouchableOpacity onPress={onFechar} style={styles.botaoFechar}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Toggle Tipo (Despesa / Receita) */}
            <View style={[styles.toggleContainer, { backgroundColor: theme.inputBg }]}>
              <TouchableOpacity
                onPress={() => alternarTipo('despesa')}
                style={[
                  styles.toggleBotao,
                  tipo === 'despesa' && { backgroundColor: theme.danger, shadowColor: theme.danger },
                ]}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={18}
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
                  tipo === 'receita' && { backgroundColor: theme.success, shadowColor: theme.success },
                ]}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={18}
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

            {/* Lançamentos Rápidos com 1 Toque (apenas em novo lançamento) */}
            {!transacaoParaEdicao && !transacaoParaDuplicacao && favoritos.length > 0 && (
              <View style={styles.secaoFavoritos}>
                <View style={styles.linhaTopoFavoritos}>
                  <Text style={[styles.rotuloFavoritos, { color: theme.textSecondary }]}>
                    Lançamento rápido com 1 toque
                  </Text>
                  <Ionicons name="flash-outline" size={13} color={theme.warning} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollFavoritos}
                >
                  {favoritos.map((fav) => (
                    <TouchableOpacity
                      key={fav.id}
                      activeOpacity={0.75}
                      style={[
                        styles.chipFavorito,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.inputBorder,
                        },
                      ]}
                      onPress={async () => {
                        await executarLancamentoFavorito(fav);
                        onFechar();
                      }}
                    >
                      <Ionicons
                        name={(fav.icone as IoniconsName) || 'pricetag-outline'}
                        size={13}
                        color={fav.categoria_cor || theme.primary}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.tituloChipFavorito, { color: theme.text }]}>
                        {fav.titulo}
                      </Text>
                      <Text
                        style={[
                          styles.valorChipFavorito,
                          { color: fav.tipo === 'despesa' ? theme.danger : theme.success },
                        ]}
                      >
                        {formatarMoeda(fav.valor)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input Valor Gigante com Teclado Numérico */}
            <View style={styles.valorContainer}>
              <Text style={[styles.labelMoeda, { color: corTemaTipo }]}>R$</Text>
              <TextInput
                ref={inputValorRef}
                style={[styles.inputValor, { color: corTemaTipo }]}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
                value={valorNumerico > 0 ? valorNumerico.toFixed(2).replace('.', ',') : ''}
                onChangeText={(texto) => {
                  const apenasDigitos = texto.replace(/\D/g, '');
                  setValorTextoCentavos(apenasDigitos);
                }}
                maxLength={10}
              />
            </View>

            {/* Status Pago vs Pendente */}
            <View style={[styles.cardStatus, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <View style={styles.linhaToggleStatus}>
                <View style={styles.infoTextoStatus}>
                  <Ionicons
                    name={pago ? 'checkmark-circle' : 'time-outline'}
                    size={22}
                    color={pago ? theme.success : theme.warning}
                  />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.tituloStatus, { color: theme.text }]}>
                      {pago
                        ? tipo === 'despesa'
                          ? 'Já foi Paga (Realizada)'
                          : 'Já foi Recebida'
                        : tipo === 'despesa'
                        ? 'Pendente (A Vencer)'
                        : 'A Receber (Pendente)'}
                    </Text>
                    <Text style={[styles.subtituloStatus, { color: theme.textSecondary }]}>
                      {pago
                        ? 'Desconta/Soma no Saldo Atual de hoje'
                        : 'Não afeta o saldo atual'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pago}
                  onValueChange={(val) => {
                    AppHaptics.toqueSelecao();
                    setPago(val);
                  }}
                  thumbColor={pago ? theme.success : '#F4F4F5'}
                  trackColor={{ false: '#71717A', true: theme.successLight }}
                />
              </View>
            </View>

            {/* Opção de Compra Parcelada (apenas para despesas novas) */}
            {tipo === 'despesa' && !transacaoParaEdicao && (
              <View style={[styles.cardParcelamento, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <View style={styles.linhaToggleParcelado}>
                  <View style={styles.infoTextoParcelado}>
                    <Ionicons name="card-outline" size={18} color={theme.text} />
                    <Text style={[styles.tituloParcelado, { color: theme.text }]}>Compra Parcelada?</Text>
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
                    <Text style={[styles.labelSecaoPequena, { color: theme.textSecondary }]}>
                      Número de Parcelas
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollParcelas}>
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
                              backgroundColor: numeroParcelas === num ? theme.primary : theme.card,
                              borderColor: numeroParcelas === num ? theme.primary : theme.cardBorder,
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
                      <View style={[styles.boxResumoParcelas, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <Text style={[styles.textoResumoParcelas, { color: theme.text }]}>
                          {numeroParcelas}x de{' '}
                          <Text style={{ fontWeight: '800', color: theme.danger }}>
                            {formatarMoeda(valorParcelaCalculado)}
                          </Text>
                        </Text>
                        <Text style={[styles.subtextoResumoParcelas, { color: theme.textSecondary }]}>
                          Parcelas futuras serão lançadas como pendentes.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Seletor de Categorias */}
            <View style={styles.secaoTituloLinha}>
              <Text style={[styles.labelSecao, { color: theme.textSecondary }]}>Categoria</Text>
              <TouchableOpacity
                onPress={() => setModalNovaCategoriaVisivel(true)}
                style={styles.botaoNovaCategoriaInline}
              >
                <Ionicons name="add-circle-outline" size={16} color={theme.primary} />
                <Text style={[styles.textoNovaCategoriaInline, { color: theme.primary }]}>
                  + Criar Nova
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listaCategoriasHorizontal}
            >
              {categorias.map((cat) => {
                const selecionada = categoriaId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      AppHaptics.toqueLeve();
                      setCategoriaId(cat.id);
                    }}
                    style={[
                      styles.chipCategoria,
                      {
                        backgroundColor: selecionada ? cat.cor : theme.inputBg,
                        borderColor: selecionada ? cat.cor : theme.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={(cat.icone as IoniconsName) || 'pricetag-outline'}
                      size={18}
                      color={selecionada ? '#FFFFFF' : cat.cor}
                    />
                    <Text
                      style={[
                        styles.chipTexto,
                        { color: selecionada ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Seletor de Forma de Pagamento */}
            <View style={[styles.secaoTituloLinha, { marginTop: 14 }]}>
              <Text style={[styles.labelSecao, { color: theme.textSecondary }]}>Meio de Pagamento</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listaCategoriasHorizontal}
            >
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
                      styles.chipFormaPagamento,
                      {
                        backgroundColor: selecionada ? theme.primary : theme.inputBg,
                        borderColor: selecionada ? theme.primary : theme.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={fp.icone}
                      size={16}
                      color={selecionada ? '#FFFFFF' : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.chipTexto,
                        { color: selecionada ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {fp.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Seletor de Data Flexível */}
            <View style={[styles.secaoTituloLinha, { marginTop: 14 }]}>
              <Text style={[styles.labelSecao, { color: theme.textSecondary }]}>Data de Vencimento / Pagamento</Text>
              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  setMostrarDiasCustom(!mostrarDiasCustom);
                }}
              >
                <Text style={[styles.textoNovaCategoriaInline, { color: theme.primary }]}>
                  {mostrarDiasCustom ? 'Ocultar Calendário' : 'Outro Dia...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linhaBotoesData}>
              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueLeve();
                  const hoje = getDataHojeIso();
                  setDataIso(hoje);
                  setDataInputTexto(formatarDataBr(hoje));
                }}
                style={[
                  styles.botaoDataRapida,
                  {
                    backgroundColor: dataIso === getDataHojeIso() ? theme.primaryLight : theme.inputBg,
                    borderColor: dataIso === getDataHojeIso() ? theme.primary : theme.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textoDataRapida,
                    { color: dataIso === getDataHojeIso() ? theme.primary : theme.textSecondary },
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
                  setDataInputTexto(formatarDataBr(ontem));
                }}
                style={[
                  styles.botaoDataRapida,
                  {
                    backgroundColor: dataIso === getDataOntemIso() ? theme.primaryLight : theme.inputBg,
                    borderColor: dataIso === getDataOntemIso() ? theme.primary : theme.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textoDataRapida,
                    { color: dataIso === getDataOntemIso() ? theme.primary : theme.textSecondary },
                  ]}
                >
                  Ontem ({formatarDataBr(getDataOntemIso())})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Seletor de Dia do Mês e Data Livre */}
            {mostrarDiasCustom && (
              <View style={[styles.boxDiasCustom, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Text style={[styles.labelSecaoPequena, { color: theme.textSecondary }]}>
                  Vencimento Rápido no Mês Atual:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollDiasRapidos}>
                  {DIAS_RAPIDOS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => selecionarDiaDoMes(d)}
                      style={[
                        styles.chipDia,
                        {
                          backgroundColor: dataIso.endsWith(`-${String(d).padStart(2, '0')}`)
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
                          styles.textoChipDia,
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
                  <Text style={[styles.labelInputManual, { color: theme.textSecondary }]}>Ou digite a data:</Text>
                  <TextInput
                    style={[
                      styles.inputDataManual,
                      { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text },
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

            {/* Input Descrição Opcional */}
            <Text style={[styles.labelSecao, { color: theme.textSecondary, marginTop: 14 }]}>
              Descrição (Opcional)
            </Text>

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
                        styles.chipSugestaoDescricao,
                        {
                          backgroundColor: ativa ? theme.primaryLight : theme.inputBg,
                          borderColor: ativa ? theme.primary : theme.inputBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.textoChipSugestaoDescricao,
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
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
              ]}
              placeholder="Ex: Celular novo, Supermercado..."
              placeholderTextColor={theme.textMuted}
              value={descricao}
              onChangeText={setDescricao}
              maxLength={60}
            />

            {/* Lembrete Local de Vencimento (apenas para despesas) */}
            {tipo === 'despesa' && (
              <View style={[styles.cardLembrete, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <View style={styles.linhaToggleLembrete}>
                  <View style={styles.infoTextoLembrete}>
                    <Ionicons name="notifications-outline" size={18} color={theme.text} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.tituloLembrete, { color: theme.text }]}>Lembrar Vencimento?</Text>
                      <Text style={[styles.subtituloLembrete, { color: theme.textSecondary }]}>Notificação local às 09:00 no dia</Text>
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

          {/* Botão de Confirmação Rápida */}
          <TouchableOpacity
            style={[styles.botaoSalvar, { backgroundColor: corTemaTipo }]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <Ionicons name="checkmark-sharp" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.textoBotaoSalvar}>
              {salvando
                ? 'Salvando...'
                : transacaoParaEdicao
                ? 'Atualizar Lançamento'
                : isParcelado
                ? `Salvar Compra em ${numeroParcelas}x`
                : `Salvar ${tipo === 'despesa' ? (pago ? 'Despesa Paga' : 'Boleto Pendente') : (pago ? 'Receita Recebida' : 'Receita Pendente')}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal para criar categoria inline sem fechar a transação */}
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  conteudo: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '93%',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.35)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  botaoFechar: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },
  toggleBotao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  valorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  labelMoeda: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: 6,
  },
  inputValor: {
    fontSize: 40,
    fontWeight: '900',
    minWidth: 140,
    textAlign: 'left',
  },
  cardStatus: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  linhaToggleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTextoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  tituloStatus: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtituloStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  cardParcelamento: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
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
    fontSize: 14,
    fontWeight: '700',
  },
  conteudoParcelamentoAtivo: {
    marginTop: 10,
  },
  labelSecaoPequena: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scrollParcelas: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chipParcela: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 14,
    fontWeight: '700',
  },
  subtextoResumoParcelas: {
    fontSize: 11,
    marginTop: 2,
  },
  secaoTituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  labelSecao: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  botaoNovaCategoriaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoNovaCategoriaInline: {
    fontSize: 12,
    fontWeight: '700',
  },
  listaCategoriasHorizontal: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chipCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipFormaPagamento: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipTexto: {
    fontSize: 13,
    fontWeight: '700',
  },
  linhaBotoesData: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  botaoDataRapida: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  textoDataRapida: {
    fontSize: 13,
    fontWeight: '600',
  },
  boxDiasCustom: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  scrollDiasRapidos: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  chipDia: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoChipDia: {
    fontSize: 12,
    fontWeight: '700',
  },
  linhaInputDataManual: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  labelInputManual: {
    fontSize: 12,
  },
  inputDataManual: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollSugestoesDescricao: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    marginTop: 2,
  },
  chipSugestaoDescricao: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoChipSugestaoDescricao: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputDescricao: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginTop: 6,
  },
  cardLembrete: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
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
    marginRight: 8,
  },
  tituloLembrete: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtituloLembrete: {
    fontSize: 11,
    marginTop: 2,
  },
  botaoSalvar: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  textoBotaoSalvar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secaoFavoritos: {
    marginTop: 10,
    marginBottom: 4,
  },
  linhaTopoFavoritos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  rotuloFavoritos: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollFavoritos: {
    gap: 8,
    paddingVertical: 2,
  },
  chipFavorito: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  tituloChipFavorito: {
    fontSize: 12,
    fontWeight: '600',
  },
  valorChipFavorito: {
    fontSize: 12,
    fontWeight: '700',
  },
});
