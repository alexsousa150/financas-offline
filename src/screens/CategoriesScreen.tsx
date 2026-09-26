import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Categoria } from '../types';
import { formatarMoeda } from '../utils/formatters';

export const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    categorias,
    categoriesRepo,
    abrirModalNovaCategoria,
    abrirModalEditarCategoria,
    notificarMudancaDados,
  } = useApp();

  const [categoriaParaMesclar, setCategoriaParaMesclar] = useState<Categoria | null>(null);
  const [modalMesclarVisivel, setModalMesclarVisivel] = useState(false);

  const confirmarExclusao = (cat: Categoria) => {
    Alert.alert(
      'Excluir Categoria',
      `Ao excluir "${cat.nome}", as ${cat.contagemTransacoes || 0} transações vinculadas serão migradas com segurança para "Outros". Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir com Segurança',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoriesRepo.excluir(cat.id);
              await notificarMudancaDados();
            } catch (e: any) {
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            }
          },
        },
      ]
    );
  };

  const executarMesclagem = async (categoriaDestinoId: number) => {
    if (!categoriaParaMesclar) return;

    try {
      await categoriesRepo.mesclar(categoriaParaMesclar.id, categoriaDestinoId);
      await notificarMudancaDados();
      setModalMesclarVisivel(false);
      setCategoriaParaMesclar(null);
      Alert.alert('Sucesso', 'Categorias mescladas com sucesso e histórico preservado!');
    } catch (e: any) {
      Alert.alert('Erro', 'Falha ao mesclar as categorias.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Botão de Adicionar Categoria no Topo */}
      <View style={styles.topoContainer}>
        <View>
          <Text style={[styles.tituloPagina, { color: theme.text }]}>Categorias</Text>
          <Text style={[styles.subtituloPagina, { color: theme.textSecondary }]}>
            {categorias.length} categorias cadastradas
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.botaoAdicionar, { backgroundColor: theme.primary }]}
          onPress={abrirModalNovaCategoria}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.textoBotaoAdicionar}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Categorias */}
      <FlatList
        data={categorias}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listaConteudo}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.cardCategoria, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.esquerda}>
              <View style={[styles.circuloIcone, { backgroundColor: item.cor + '22' }]}>
                <Ionicons name={(item.icone as any) || 'pricetag-outline'} size={22} color={item.cor} />
              </View>

              <View style={styles.detalhes}>
                <View style={styles.linhaNomeBadge}>
                  <Text style={[styles.nomeCategoria, { color: theme.text }]}>{item.nome}</Text>
                  <View
                    style={[
                      styles.badgeTipoGasto,
                      {
                        backgroundColor:
                          item.tipo_gasto === 'estilo_de_vida' ? theme.warningLight : theme.successLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoBadgeTipoGasto,
                        {
                          color:
                            item.tipo_gasto === 'estilo_de_vida' ? theme.warning : theme.success,
                        },
                      ]}
                    >
                      {item.tipo_gasto === 'estilo_de_vida' ? 'Estilo de Vida' : 'Essencial'}
                    </Text>
                  </View>
                </View>

                <View style={styles.linhaInfoCategoria}>
                  <Text style={[styles.contagemLctos, { color: theme.textSecondary }]}>
                    {item.contagemTransacoes || 0} lançamentos
                  </Text>
                  {item.limite_mensal && item.limite_mensal > 0 ? (
                    <Text style={[styles.tagLimite, { color: theme.primary }]}>
                      • Teto: {formatarMoeda(item.limite_mensal)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.acoes}>
              {/* Botão Mesclar */}
              <TouchableOpacity
                onPress={() => {
                  setCategoriaParaMesclar(item);
                  setModalMesclarVisivel(true);
                }}
                style={[styles.botaoAcao, { backgroundColor: theme.inputBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="git-merge-outline" size={16} color={theme.warning} />
              </TouchableOpacity>

              {/* Botão Editar */}
              <TouchableOpacity
                onPress={() => abrirModalEditarCategoria(item)}
                style={[styles.botaoAcao, { backgroundColor: theme.inputBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Botão Excluir */}
              <TouchableOpacity
                onPress={() => confirmarExclusao(item)}
                style={[styles.botaoAcao, { backgroundColor: theme.inputBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal de Mesclagem de Categorias */}
      {modalMesclarVisivel && categoriaParaMesclar && (
        <Modal
          visible={modalMesclarVisivel}
          animationType="fade"
          transparent
          onRequestClose={() => setModalMesclarVisivel(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalConteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.tituloModalMesclar, { color: theme.text }]}>
                Mesclar Categoria
              </Text>
              <Text style={[styles.descModalMesclar, { color: theme.textSecondary }]}>
                Transfira todos os lançamentos de{' '}
                <Text style={{ fontWeight: '800', color: theme.text }}>"{categoriaParaMesclar.nome}"</Text> para outra categoria e depois remova-a com segurança:
              </Text>

              <ScrollView style={{ maxHeight: 260, marginVertical: 12 }}>
                {categorias
                  .filter((c) => c.id !== categoriaParaMesclar.id)
                  .map((dest) => (
                    <TouchableOpacity
                      key={dest.id}
                      style={[styles.itemDestinoMesclar, { borderBottomColor: theme.inputBorder }]}
                      onPress={() => executarMesclagem(dest.id)}
                    >
                      <View style={[styles.circuloPequeno, { backgroundColor: dest.cor + '25' }]}>
                        <Ionicons name={(dest.icone as any) || 'pricetag'} size={16} color={dest.cor} />
                      </View>
                      <Text style={[styles.nomeDestino, { color: theme.text }]}>{dest.nome}</Text>
                      <Ionicons name="arrow-forward-circle-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.botaoFecharModal, { backgroundColor: theme.inputBg }]}
                onPress={() => setModalMesclarVisivel(false)}
              >
                <Text style={[styles.textoFecharModal, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tituloPagina: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtituloPagina: {
    fontSize: 12,
    marginTop: 2,
  },
  botaoAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  textoBotaoAdicionar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listaConteudo: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  cardCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  esquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  circuloIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detalhes: {
    flex: 1,
  },
  linhaNomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nomeCategoria: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeTipoGasto: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textoBadgeTipoGasto: {
    fontSize: 10,
    fontWeight: '700',
  },
  contagemLctos: {
    fontSize: 12,
  },
  linhaInfoCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  tagLimite: {
    fontSize: 12,
    fontWeight: '700',
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botaoAcao: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalConteudo: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  tituloModalMesclar: {
    fontSize: 17,
    fontWeight: '800',
  },
  descModalMesclar: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  itemDestinoMesclar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  circuloPequeno: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nomeDestino: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  botaoFecharModal: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  textoFecharModal: {
    fontWeight: '700',
    fontSize: 14,
  },
});
