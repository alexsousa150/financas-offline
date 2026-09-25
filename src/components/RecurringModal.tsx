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

interface RecurringModalProps {
  visivel: boolean;
  onFechar: () => void;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({ visivel, onFechar }) => {
  const { theme } = useTheme();
  const { categorias, recurringRepo, mesSelecionado, notificarMudancaDados } = useApp();

  const [lista, setLista] = useState<LancamentoRecorrente[]>([]);
  const [modoCriacao, setModoCriacao] = useState(false);

  // Campos novo fixo
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
      setModoCriacao(false);
      setValorTextoCentavos('');
      setDescricao('');
      setDiaVencimento('5');
    }
  }, [visivel]);

  const valorNumerico = converterCentavosParaValor(valorTextoCentavos);

  const handleSalvarNovo = async () => {
    if (valorNumerico <= 0) {
      Alert.alert('Valor Obrigatório', 'Informe um valor válido.');
      return;
    }
    const diaNum = parseInt(diaVencimento, 10);
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      Alert.alert('Dia Inválido', 'O dia deve estar entre 1 e 31.');
      return;
    }

    try {
      setSalvando(true);
      await recurringRepo.criar({
        valor: valorNumerico,
        tipo,
        categoria_id: categoriaId,
        descricao: descricao.trim() || (tipo === 'receita' ? 'Renda Fixa' : 'Conta Fixa'),
        dia_vencimento: diaNum,
        ativo: 1,
      });

      // Já processa para o mês atual se aplicável
      await recurringRepo.processarRecorrentesDoMes(mesSelecionado);
      await notificarMudancaDados();
      AppHaptics.toqueSucesso();
      await carregar();
      setModoCriacao(false);
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível salvar o lançamento fixo.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: number) => {
    AppHaptics.toqueAviso();
    await recurringRepo.excluir(id);
    await carregar();
  };

  const handleAlternarStatus = async (item: LancamentoRecorrente) => {
    AppHaptics.toqueLeve();
    await recurringRepo.alternarStatus(item.id, item.ativo !== 1);
    await carregar();
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={[styles.conteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cabecalho}>
            <View>
              <Text style={[styles.titulo, { color: theme.text }]}>Contas & Rendas Fixas</Text>
              <Text style={[styles.subtitulo, { color: theme.textSecondary }]}>
                Lançamentos que se repetem todo mês
              </Text>
            </View>
            <TouchableOpacity onPress={onFechar} style={styles.botaoFechar}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {modoCriacao ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Toggle Tipo */}
              <View style={[styles.toggleContainer, { backgroundColor: theme.inputBg }]}>
                <TouchableOpacity
                  onPress={() => setTipo('despesa')}
                  style={[styles.toggleBotao, tipo === 'despesa' && { backgroundColor: theme.danger }]}
                >
                  <Text style={[styles.toggleTexto, { color: tipo === 'despesa' ? '#FFF' : theme.textSecondary }]}>
                    Despesa Fixa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTipo('receita')}
                  style={[styles.toggleBotao, tipo === 'receita' && { backgroundColor: theme.success }]}
                >
                  <Text style={[styles.toggleTexto, { color: tipo === 'receita' ? '#FFF' : theme.textSecondary }]}>
                    Renda Fixa
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Valor */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Valor</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={theme.textMuted}
                value={valorNumerico > 0 ? valorNumerico.toFixed(2).replace('.', ',') : ''}
                onChangeText={(t) => setValorTextoCentavos(t.replace(/\D/g, ''))}
              />

              {/* Dia de Vencimento */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Dia do Mês (1 a 31)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                keyboardType="numeric"
                placeholder="Ex: 5"
                placeholderTextColor={theme.textMuted}
                value={diaVencimento}
                onChangeText={setDiaVencimento}
                maxLength={2}
              />

              {/* Categoria */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categorias.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategoriaId(c.id)}
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

              {/* Descrição */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Descrição / Nome da Conta</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Ex: Aluguel, Salário, Internet, Netflix..."
                placeholderTextColor={theme.textMuted}
                value={descricao}
                onChangeText={setDescricao}
              />

              {/* Ações Criar */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.botaoSecundario, { backgroundColor: theme.inputBg }]}
                  onPress={() => setModoCriacao(false)}
                >
                  <Text style={[styles.textoBotaoSecundario, { color: theme.text }]}>Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botaoPrimario, { backgroundColor: theme.primary }]}
                  onPress={handleSalvarNovo}
                  disabled={salvando}
                >
                  <Text style={styles.textoBotaoPrimario}>{salvando ? 'Salvando...' : 'Salvar Fixo'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.botaoNovoFixo, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                onPress={() => setModoCriacao(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={[styles.textoNovoFixo, { color: theme.primary }]}>+ Cadastrar Novo Gasto ou Renda Fixa</Text>
              </TouchableOpacity>

              <FlatList
                data={lista}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.vazio}>
                    <Ionicons name="calendar-outline" size={38} color={theme.textMuted} />
                    <Text style={[styles.textoVazio, { color: theme.textMuted }]}>
                      Nenhum lançamento fixo cadastrado ainda.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.cardItem, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                    <View style={styles.linhaItemTopo}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemDesc, { color: theme.text }]}>{item.descricao}</Text>
                        <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                          Todo dia {item.dia_vencimento} • {item.categoria_nome}
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
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                          {item.ativo === 1 ? 'Ativo' : 'Pausado'}
                        </Text>
                      </View>

                      <TouchableOpacity onPress={() => handleExcluir(item.id)} style={styles.botaoLixeira}>
                        <Ionicons name="trash-outline" size={16} color={theme.danger} />
                      </TouchableOpacity>
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
    maxHeight: '85%',
    minHeight: 380,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontWeight: '800',
    fontSize: 13,
  },
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  textoVazio: {
    fontSize: 13,
    textAlign: 'center',
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
  botaoLixeira: {
    padding: 6,
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
    fontSize: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
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
  botaoPrimario: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoPrimario: {
    color: '#FFF',
    fontWeight: '800',
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
    fontWeight: '700',
    fontSize: 14,
  },
});
