import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { TipoTransacao, Transacao } from '../types';
import {
  formatarMoeda,
  converterCentavosParaValor,
  getDataHojeIso,
  getDataOntemIso,
  formatarDataBr,
} from '../utils/formatters';
import { CategoryModal } from './CategoryModal';
import { AppHaptics } from '../utils/haptics';
import { NotificationService } from '../services/notificationService';

const OPCOES_PARCELAS = [2, 3, 4, 5, 6, 8, 10, 12, 18, 24];
const DIAS_RAPIDOS = [1, 5, 10, 12, 15, 20, 25, 28, 30];

interface TransactionModalProps {
  visivel: boolean;
  transacaoParaEdicao?: Transacao | null;
  transacaoParaDuplicacao?: Transacao | null;
  onFechar: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visivel,
  transacaoParaEdicao,
  transacaoParaDuplicacao,
  onFechar,
}) => {
  const { theme } = useTheme();
  const { categoriesRepo, transactionsRepo, categorias, carregarCategorias, notificarMudancaDados } = useApp();

  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [valorTextoCentavos, setValorTextoCentavos] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [dataIso, setDataIso] = useState<string>(getDataHojeIso());
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [lembreteAtivo, setLembreteAtivo] = useState(false);

  // Status Pago vs Pendente
  const [pago, setPago] = useState(true);

  // Seletor de data estendido
  const [mostrarDiasCustom, setMostrarDiasCustom] = useState(false);
  const [dataInputTexto, setDataInputTexto] = useState('');

  // Parcelamento
  const [isParcelado, setIsParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(3);

  // Modal aninhado para criar nova categoria na hora sem perder os dados digitados
  const [modalNovaCategoriaVisivel, setModalNovaCategoriaVisivel] = useState(false);

  const inputValorRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visivel) {
      setLembreteAtivo(false);
      setMostrarDiasCustom(false);

      if (transacaoParaEdicao) {
        setTipo(transacaoParaEdicao.tipo);
        const centavos = Math.round(transacaoParaEdicao.valor * 100).toString();
        setValorTextoCentavos(centavos);
        setCategoriaId(transacaoParaEdicao.categoria_id);
        setDataIso(transacaoParaEdicao.data);
        setDataInputTexto(formatarDataBr(transacaoParaEdicao.data));
        setDescricao(transacaoParaEdicao.descricao || '');
        setPago(transacaoParaEdicao.pago !== 0);
        setIsParcelado(false); // Edição é pontual por parcela
      } else if (transacaoParaDuplicacao) {
        setTipo(transacaoParaDuplicacao.tipo);
        const centavos = Math.round(transacaoParaDuplicacao.valor * 100).toString();
        setValorTextoCentavos(centavos);
        setCategoriaId(transacaoParaDuplicacao.categoria_id);
        const hoje = getDataHojeIso();
        setDataIso(hoje);
        setDataInputTexto(formatarDataBr(hoje));
        setDescricao(transacaoParaDuplicacao.descricao ? `${transacaoParaDuplicacao.descricao} (Cópia)` : '');
        setPago(true);
        setIsParcelado(false);
      } else {
        // Novo lançamento padrão
        setTipo('despesa');
        setValorTextoCentavos('');
        const hoje = getDataHojeIso();
        setDataIso(hoje);
        setDataInputTexto(formatarDataBr(hoje));
        setDescricao('');
        setPago(true);
        setIsParcelado(false);
        setNumeroParcelas(3);
        if (categorias.length > 0) {
          const catPadrao = categorias.find((c) => c.nome.toLowerCase() === 'alimentação') || categorias[0];
          setCategoriaId(catPadrao.id);
        }
      }

      // Foco imediato no campo de valor
      setTimeout(() => {
        inputValorRef.current?.focus();
      }, 150);
    }
  }, [visivel, transacaoParaEdicao, transacaoParaDuplicacao, categorias]);

  const alternarTipo = (novoTipo: TipoTransacao) => {
    AppHaptics.toqueSelecao();
    setTipo(novoTipo);
    if (novoTipo === 'receita') {
      setIsParcelado(false);
      const catReceita = categorias.find(
        (c) => c.nome.toLowerCase().includes('salário') || c.nome.toLowerCase().includes('renda')
      );
      if (catReceita) setCategoriaId(catReceita.id);
    } else {
      const catDespesa = categorias.find((c) => c.nome.toLowerCase() === 'alimentação') || categorias[0];
      if (catDespesa) setCategoriaId(catDespesa.id);
    }
  };

  const selecionarDiaDoMes = (dia: number) => {
    AppHaptics.toqueLeve();
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const dataAlvoIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    setDataIso(dataAlvoIso);
    setDataInputTexto(formatarDataBr(dataAlvoIso));

    // Se a data for futura, sugere como pendente
    if (dataAlvoIso > getDataHojeIso()) {
      setPago(false);
    }
  };

  const handleDataTextoChange = (texto: string) => {
    const limpo = texto.replace(/\D/g, '');
    let formatado = limpo;
    if (limpo.length > 2 && limpo.length <= 4) {
      formatado = `${limpo.slice(0, 2)}/${limpo.slice(2)}`;
    } else if (limpo.length > 4) {
      formatado = `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4, 8)}`;
    }
    setDataInputTexto(formatado);

    if (limpo.length === 8) {
      const d = limpo.slice(0, 2);
      const m = limpo.slice(2, 4);
      const a = limpo.slice(4, 8);
      const iso = `${a}-${m}-${d}`;
      setDataIso(iso);
      if (iso > getDataHojeIso()) {
        setPago(false);
      }
    }
  };

  const valorNumerico = converterCentavosParaValor(valorTextoCentavos);
  const valorParcelaCalculado = isParcelado && numeroParcelas > 0 ? valorNumerico / numeroParcelas : valorNumerico;

  const handleSalvar = async () => {
    if (valorNumerico <= 0) {
      Alert.alert('Valor Obrigatório', 'Digite um valor maior que zero.');
      return;
    }

    if (!categoriaId) {
      Alert.alert('Categoria Obrigatória', 'Selecione uma categoria para o lançamento.');
      return;
    }

    try {
      setSalvando(true);

      if (transacaoParaEdicao) {
        await transactionsRepo.atualizar(transacaoParaEdicao.id, {
          valor: valorNumerico,
          tipo,
          categoria_id: categoriaId,
          data: dataIso,
          descricao: descricao.trim(),
          pago: pago ? 1 : 0,
        });
      } else if (isParcelado && tipo === 'despesa') {
        // Criação de compra parcelada
        await transactionsRepo.criarParcelado(
          {
            valor: valorNumerico,
            tipo,
            categoria_id: categoriaId,
            data: dataIso,
            descricao: descricao.trim(),
            conciliado: 0,
            origem: 'manual',
            pago: pago ? 1 : 0,
          },
          numeroParcelas,
          valorNumerico
        );
      } else {
        await transactionsRepo.criar({
          valor: valorNumerico,
          tipo,
          categoria_id: categoriaId,
          data: dataIso,
          descricao: descricao.trim(),
          conciliado: 0,
          origem: 'manual',
          pago: pago ? 1 : 0,
        });
      }

      if (lembreteAtivo && tipo === 'despesa') {
        await NotificationService.agendarLembreteVencimento(
          descricao.trim() || 'Despesa',
          valorNumerico,
          dataIso
        );
      }

      await AppHaptics.toqueSucesso();
      await notificarMudancaDados();
      onFechar();
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível salvar o lançamento.');
    } finally {
      setSalvando(false);
    }
  };

  const corTemaTipo = tipo === 'despesa' ? theme.danger : theme.success;

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.conteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <Text style={[styles.titulo, { color: theme.text }]}>
              {transacaoParaEdicao
                ? 'Editar Lançamento'
                : transacaoParaDuplicacao
                ? 'Duplicar Lançamento'
                : 'Novo Lançamento'}
            </Text>
            <TouchableOpacity onPress={onFechar} style={styles.botaoFechar}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
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
                        : 'Boleto futuro: entra apenas na previsão do fim do mês'}
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
                          A 1ª parcela segue o status escolhido; as parcelas futuras nascem como Pendentes mês a mês.
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
                      name={(cat.icone as any) || 'pricetag-outline'}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  conteudo: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    padding: 20,
    maxHeight: '92%',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '800',
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
});
