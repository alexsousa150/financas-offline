import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { LancamentoRecorrente } from '../database/recurringRepo';
import { TipoTransacao } from '../types';
import { formatarMoeda, converterCentavosParaValor } from '../utils/formatters';
import { AppHaptics } from '../utils/haptics';

const DIAS_RAPIDOS_VENCIMENTO = [1, 5, 10, 12, 15, 20, 25, 28, 30];

interface RecurringModalProps {
  visivel: boolean;
  onFechar: () => void;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({ visivel, onFechar }) => {
  const { theme } = useTheme();
  const { categorias, recurringRepo, mesSelecionado, notificarMudancaDados } = useApp();

  const [lista, setLista] = useState<LancamentoRecorrente[]>([]);
  const [modoFormulario, setModoFormulario] = useState(false);
  const [itemParaEdicao, setItemParaEdicao] = useState<LancamentoRecorrente | null>(null);

  // Campos do formulário
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [valorTextoCentavos, setValorTextoCentavos] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(categorias[0]?.id ?? 1);
  const [diaVencimento, setDiaVencimento] = useState('5');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    try {
      const dados = await recurringRepo.listar();
      setLista(dados);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (visivel) {
      carregar();
      fecharFormulario();
    }
  }, [visivel]);

  const abrirNovo = () => {
    AppHaptics.toqueLeve();
    setItemParaEdicao(null);
    setTipo('despesa');
    setValorTextoCentavos('');
    setDescricao('');
    setDiaVencimento('5');
    if (categorias.length > 0) {
      setCategoriaId(categorias[0].id);
    }
    setModoFormulario(true);
  };

  const abrirEdicao = (item: LancamentoRecorrente) => {
    AppHaptics.toqueLeve();
    setItemParaEdicao(item);
    setTipo(item.tipo);
    setValorTextoCentavos(Math.round(item.valor * 100).toString());
    setDescricao(item.descricao);
    setDiaVencimento(String(item.dia_vencimento));
    setCategoriaId(item.categoria_id);
    setModoFormulario(true);
  };

  const fecharFormulario = () => {
    setModoFormulario(false);
    setItemParaEdicao(null);
    setValorTextoCentavos('');
    setDescricao('');
    setDiaVencimento('5');
  };

  const valorNumerico = converterCentavosParaValor(valorTextoCentavos);

  const handleSalvar = async () => {
    if (valorNumerico <= 0) {
      Alert.alert('Valor necessário', 'Digite um valor maior que zero para a conta.');
      return;
    }
    const diaNum = parseInt(diaVencimento, 10);
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      Alert.alert('Dia de vencimento', 'Escolha um dia do mês entre 1 e 31.');
      return;
    }

    try {
      setSalvando(true);

      if (itemParaEdicao) {
        await recurringRepo.atualizar(itemParaEdicao.id, {
          valor: valorNumerico,
          tipo,
          categoria_id: categoriaId,
          descricao: descricao.trim() || (tipo === 'receita' ? 'Renda fixa' : 'Conta fixa'),
          dia_vencimento: diaNum,
        });
      } else {
        await recurringRepo.criar({
          valor: valorNumerico,
          tipo,
          categoria_id: categoriaId,
          descricao: descricao.trim() || (tipo === 'receita' ? 'Renda fixa' : 'Conta fixa'),
          dia_vencimento: diaNum,
          ativo: 1,
        });
      }

      await recurringRepo.processarRecorrentesDoMes(mesSelecionado);
      await notificarMudancaDados();
      AppHaptics.toqueSucesso();
      await carregar();
      fecharFormulario();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar esta conta fixa.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = (item: LancamentoRecorrente) => {
    Alert.alert(
      'Remover conta fixa',
      `Deseja remover "${item.descricao}"? Ela não será mais gerada nos próximos meses.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            AppHaptics.toqueAviso();
            await recurringRepo.excluir(item.id);
            await carregar();
          },
        },
      ]
    );
  };

  const handleAlternarStatus = async (item: LancamentoRecorrente) => {
    AppHaptics.toqueLeve();
    await recurringRepo.alternarStatus(item.id, item.ativo !== 1);
    await carregar();
  };

  // Totais mensais de contas ativas
  const totalDespesasFixas = lista
    .filter((i) => i.tipo === 'despesa' && i.ativo === 1)
    .reduce((acc, i) => acc + i.valor, 0);

  const totalRendasFixas = lista
    .filter((i) => i.tipo === 'receita' && i.ativo === 1)
    .reduce((acc, i) => acc + i.valor, 0);

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={[styles.conteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.titulo, { color: theme.text }]}>Contas e rendas fixas</Text>
              <Text style={[styles.subtitulo, { color: theme.textSecondary }]}>
                {lista.length} conta{lista.length === 1 ? '' : 's'} cadastrada{lista.length === 1 ? '' : 's'} • Repetem todo mês
              </Text>
            </View>
            <TouchableOpacity onPress={onFechar} style={styles.botaoFechar}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {modoFormulario ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Toggle Tipo */}
              <View style={[styles.toggleContainer, { backgroundColor: theme.inputBg }]}>
                <TouchableOpacity
                  onPress={() => setTipo('despesa')}
                  style={[styles.toggleBotao, tipo === 'despesa' && { backgroundColor: theme.danger }]}
                >
                  <Text style={[styles.toggleTexto, { color: tipo === 'despesa' ? '#FFF' : theme.textSecondary }]}>
                    Despesa fixa (a pagar)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTipo('receita')}
                  style={[styles.toggleBotao, tipo === 'receita' && { backgroundColor: theme.success }]}
                >
                  <Text style={[styles.toggleTexto, { color: tipo === 'receita' ? '#FFF' : theme.textSecondary }]}>
                    Renda fixa (a receber)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Nome / Descrição */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Nome da conta ou renda</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Ex: Aluguel, Internet, Salário, Academia..."
                placeholderTextColor={theme.textMuted}
                value={descricao}
                onChangeText={setDescricao}
                maxLength={40}
              />

              {/* Valor */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Valor mensal</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={theme.textMuted}
                value={valorNumerico > 0 ? valorNumerico.toFixed(2).replace('.', ',') : ''}
                onChangeText={(t) => setValorTextoCentavos(t.replace(/\D/g, ''))}
              />

              {/* Dia de Vencimento com Chips e Campo */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Dia do vencimento no mês</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollDias}>
                {DIAS_RAPIDOS_VENCIMENTO.map((d) => {
                  const selecionado = diaVencimento === String(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => {
                        AppHaptics.toqueLeve();
                        setDiaVencimento(String(d));
                      }}
                      style={[
                        styles.chipDia,
                        {
                          backgroundColor: selecionado ? theme.primary : theme.inputBg,
                          borderColor: selecionado ? theme.primary : theme.inputBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.textoChipDia, { color: selecionado ? '#FFF' : theme.text }]}>
                        Dia {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.linhaInputDiaCustom}>
                <Text style={[styles.subrotuloDia, { color: theme.textSecondary }]}>Ou digite o dia exato (1 a 31):</Text>
                <TextInput
                  style={[styles.inputDiaPequeno, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                  value={diaVencimento}
                  onChangeText={setDiaVencimento}
                  maxLength={2}
                />
              </View>

              {/* Categoria */}
              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 10 }]}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {categorias.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      AppHaptics.toqueLeve();
                      setCategoriaId(c.id);
                    }}
                    style={[
                      styles.chipCat,
                      {
                        backgroundColor: categoriaId === c.id ? c.cor : theme.inputBg,
                        borderColor: categoriaId === c.id ? c.cor : theme.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons name={(c.icone as any) || 'pricetag'} size={15} color={categoriaId === c.id ? '#FFF' : c.cor} />
                    <Text style={{ color: categoriaId === c.id ? '#FFF' : theme.text, fontWeight: '700', fontSize: 12 }}>
                      {c.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Botões do Formulário */}
              <View style={styles.linhaBotoesForm}>
                <TouchableOpacity
                  style={[styles.botaoSecundario, { backgroundColor: theme.inputBg }]}
                  onPress={fecharFormulario}
                >
                  <Text style={[styles.textoBotaoSecundario, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botaoPrimario, { backgroundColor: theme.primary }]}
                  onPress={handleSalvar}
                  disabled={salvando}
                >
                  <Text style={styles.textoBotaoPrimario}>
                    {salvando ? 'Salvando...' : itemParaEdicao ? 'Salvar alterações' : 'Cadastrar conta'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Resumo Consolidado dos Fixos */}
              {lista.length > 0 && (
                <View style={[styles.boxResumoFixos, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <View style={styles.itemResumoFixo}>
                    <Text style={[styles.rotuloResumoFixo, { color: theme.textSecondary }]}>Saídas fixas/mês</Text>
                    <Text style={[styles.valorResumoFixo, { color: theme.danger }]}>
                      {formatarMoeda(totalDespesasFixas)}
                    </Text>
                  </View>
                  <View style={styles.divisorVertical} />
                  <View style={styles.itemResumoFixo}>
                    <Text style={[styles.rotuloResumoFixo, { color: theme.textSecondary }]}>Entradas fixas/mês</Text>
                    <Text style={[styles.valorResumoFixo, { color: theme.success }]}>
                      {formatarMoeda(totalRendasFixas)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Botão de Cadastrar Nova Conta */}
              <TouchableOpacity
                style={[styles.botaoNovoFixo, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                onPress={abrirNovo}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={[styles.textoNovoFixo, { color: theme.primary }]}>+ Adicionar nova conta ou renda fixa</Text>
              </TouchableOpacity>

              {/* Lista de Contas */}
              <FlatList
                data={lista}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <View style={styles.vazio}>
                    <Ionicons name="calendar-outline" size={38} color={theme.textMuted} />
                    <Text style={[styles.textoVazio, { color: theme.textSecondary }]}>
                      Você ainda não cadastrou contas fixas.
                    </Text>
                    <Text style={[styles.subtextoVazio, { color: theme.textMuted }]}>
                      Cadastre aluguel, internet, luz ou salário para o app lançar sozinho todo mês.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.cardItem, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                    <View style={styles.linhaItemTopo}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.itemDesc, { color: theme.text }]}>{item.descricao}</Text>
                        <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                          Vencimento todo dia {item.dia_vencimento} • {item.categoria_nome || 'Geral'}
                        </Text>
                      </View>
                      <Text style={[styles.itemValor, { color: item.tipo === 'despesa' ? theme.danger : theme.success }]}>
                        {item.tipo === 'despesa' ? '-' : '+'} {formatarMoeda(item.valor)}
                      </Text>
                    </View>

                    <View style={styles.linhaItemAcoes}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Switch
                          value={item.ativo === 1}
                          onValueChange={() => handleAlternarStatus(item)}
                          thumbColor={item.ativo === 1 ? theme.primary : '#A1A1AA'}
                        />
                        <Text style={{ fontSize: 12, color: item.ativo === 1 ? theme.text : theme.textMuted }}>
                          {item.ativo === 1 ? 'Ativa no mês' : 'Pausada'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => abrirEdicao(item)}
                          style={[styles.botaoAcaoItem, { backgroundColor: theme.card }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={15} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleExcluir(item)}
                          style={[styles.botaoAcaoItem, { backgroundColor: theme.card }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
    minHeight: 420,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitulo: {
    fontSize: 12,
    marginTop: 2,
  },
  botaoFechar: {
    padding: 4,
  },
  boxResumoFixos: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemResumoFixo: {
    flex: 1,
    alignItems: 'center',
  },
  rotuloResumoFixo: {
    fontSize: 11,
    fontWeight: '600',
  },
  valorResumoFixo: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  divisorVertical: {
    width: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginHorizontal: 8,
  },
  botaoNovoFixo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 14,
    gap: 6,
  },
  textoNovoFixo: {
    fontWeight: '700',
    fontSize: 13,
  },
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 6,
  },
  textoVazio: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtextoVazio: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  cardItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  linhaItemTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemDesc: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  itemValor: {
    fontSize: 14,
    fontWeight: '800',
  },
  linhaItemAcoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.15)',
  },
  botaoAcaoItem: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBotao: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleTexto: {
    fontWeight: '700',
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  scrollDias: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chipDia: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoChipDia: {
    fontSize: 12,
    fontWeight: '700',
  },
  linhaInputDiaCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  subrotuloDia: {
    fontSize: 12,
  },
  inputDiaPequeno: {
    width: 50,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  chipCat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  linhaBotoesForm: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  botaoPrimario: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoPrimario: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  botaoSecundario: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoSecundario: {
    fontWeight: '600',
    fontSize: 14,
  },
});
