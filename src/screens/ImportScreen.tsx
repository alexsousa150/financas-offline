import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { TransacaoExtratoPendente, Categoria } from '../types';
import { StatementParser } from '../services/statementParser';
import { formatarDataBr, formatarMoeda } from '../utils/formatters';

export const ImportScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    categorias,
    reconciliationService,
    transactionsRepo,
    learningRepo,
    notificarMudancaDados,
  } = useApp();

  const [carregandoArquivo, setCarregandoArquivo] = useState(false);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [itensPendentes, setItensPendentes] = useState<TransacaoExtratoPendente[]>([]);
  const [categoriaModalItem, setCategoriaModalItem] = useState<TransacaoExtratoPendente | null>(null);

  const selecionarArquivo = async () => {
    try {
      setCarregandoArquivo(true);
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) {
        setCarregandoArquivo(false);
        return;
      }

      const asset = resultado.assets[0];
      setNomeArquivo(asset.name);

      // Lê o conteúdo do arquivo usando UTF-8 ou Latin-1
      const conteudo = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Faz o parse de OFX ou CSV
      const itensBrutos = StatementParser.parse(conteudo, asset.name);

      if (itensBrutos.length === 0) {
        Alert.alert(
          'Arquivo sem lançamentos',
          'Não encontramos registros de transações compatíveis no arquivo selecionado. Verifique se é um arquivo OFX ou CSV bancário.'
        );
        setCarregandoArquivo(false);
        return;
      }

      // Processa conciliação e sugestões de categorias com o banco SQLite existente
      const processados = await reconciliationService.processarExtrato(
        itensBrutos,
        categorias,
        3 // 3 dias de tolerância
      );

      setItensPendentes(processados);
    } catch (e: any) {
      console.error('Erro ao importar extrato:', e);
      Alert.alert('Erro ao processar', 'Ocorreu uma falha ao ler o arquivo. ' + (e.message || ''));
    } finally {
      setCarregandoArquivo(false);
    }
  };

  const alternarSelecao = (idTemp: string) => {
    setItensPendentes((prev) =>
      prev.map((item) =>
        item.idTemp === idTemp
          ? { ...item, selecionadoParaImportar: !item.selecionadoParaImportar }
          : item
      )
    );
  };

  const selecionarTodosPendentes = (marcar: boolean) => {
    setItensPendentes((prev) =>
      prev.map((item) => ({
        ...item,
        selecionadoParaImportar: marcar ? !item.jaConciliado : false,
      }))
    );
  };

  const alterarCategoriaDoItem = (idTemp: string, novaCategoriaId: number) => {
    setItensPendentes((prev) =>
      prev.map((item) =>
        item.idTemp === idTemp ? { ...item, categoria_id_sugerida: novaCategoriaId } : item
      )
    );
    setCategoriaModalItem(null);
  };

  const confirmarImportacaoEmLote = async () => {
    const selecionados = itensPendentes.filter((item) => item.selecionadoParaImportar);

    if (selecionados.length === 0) {
      Alert.alert('Nenhum item selecionado', 'Selecione pelo menos um lançamento para importar.');
      return;
    }

    try {
      setSalvandoLote(true);

      const transacoesParaInserir = selecionados.map((item) => ({
        valor: item.valor,
        tipo: item.tipo,
        categoria_id: item.categoria_id_sugerida,
        data: item.data,
        descricao: item.descricao,
        conciliado: item.jaConciliado ? 1 : 0,
        origem: 'importado' as const,
      }));

      const totalInseridos = await transactionsRepo.inserirEmLote(transacoesParaInserir);

      // Ensina o algoritmo com base nas escolhas do usuário
      for (const item of selecionados) {
        if (item.descricao && item.categoria_id_sugerida) {
          await learningRepo.aprenderRegra(item.descricao, item.categoria_id_sugerida);
        }
      }

      await notificarMudancaDados();

      Alert.alert(
        'Importação concluída',
        `${totalInseridos} lançamento${totalInseridos === 1 ? '' : 's'} importado${totalInseridos === 1 ? '' : 's'} com sucesso.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setItensPendentes([]);
              setNomeArquivo(null);
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Erro ao salvar', 'Ocorreu um erro ao gravar os lançamentos no banco de dados.');
    } finally {
      setSalvandoLote(false);
    }
  };

  const totalConciliados = itensPendentes.filter((i) => i.jaConciliado).length;
  const totalPendentesNovos = itensPendentes.filter((i) => !i.jaConciliado).length;
  const totalSelecionados = itensPendentes.filter((i) => i.selecionadoParaImportar).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {itensPendentes.length === 0 ? (
        // Estado Inicial: Instruções e Botão de Escolha de Arquivo
        <ScrollView contentContainerStyle={styles.scrollVazio} showsVerticalScrollIndicator={false}>
          <View style={[styles.cardUpload, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.circuloUpload, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="cloud-upload-outline" size={44} color={theme.primary} />
            </View>

            <Text style={[styles.tituloUpload, { color: theme.text }]}>
              Importar extrato bancário
            </Text>
            <Text style={[styles.subtituloUpload, { color: theme.textSecondary }]}>
              Carregue o extrato exportado pelo seu banco (OFX ou CSV) para conciliar seus lançamentos e identificar transações pendentes.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.botaoEscolher, { backgroundColor: theme.primary }]}
              onPress={selecionarArquivo}
              disabled={carregandoArquivo}
            >
              {carregandoArquivo ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="folder-open-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.textoBotaoEscolher}>Selecionar arquivo</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.linhaFormatos}>
              <View style={[styles.tagFormato, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.textoFormato, { color: theme.textSecondary }]}>.OFX (Recomendado)</Text>
              </View>
              <View style={[styles.tagFormato, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.textoFormato, { color: theme.textSecondary }]}>.CSV (Nubank, Inter, etc.)</Text>
              </View>
            </View>
          </View>

          {/* Dicas e Funcionalidades de Inteligência */}
          <View style={[styles.cardDicas, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.tituloDicas, { color: theme.text }]}>Como o extrato é processado</Text>

            <View style={styles.itemDica}>
              <Ionicons name="shield-checkmark" size={18} color={theme.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.textoDica, { color: theme.textSecondary }]}>
                O arquivo é lido localmente na memória do telefone. Nenhum dado sai do seu aparelho.
              </Text>
            </View>

            <View style={styles.itemDica}>
              <Ionicons name="sparkles" size={18} color={theme.warning} style={{ marginTop: 2 }} />
              <Text style={[styles.textoDica, { color: theme.textSecondary }]}>
                Identificação de estabelecimentos para sugerir a categoria automaticamente.
              </Text>
            </View>

            <View style={styles.itemDica}>
              <Ionicons name="git-compare" size={18} color={theme.success} style={{ marginTop: 2 }} />
              <Text style={[styles.textoDica, { color: theme.textSecondary }]}>
                Identificação de lançamentos já cadastrados para evitar duplicidades.
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Estado de Revisão em Lote
        <View style={{ flex: 1 }}>
          {/* Card Resumo da Conciliação */}
          <View style={[styles.cardResumoImportacao, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.linhaTopoResumo}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nomeArquivo, { color: theme.text }]} numberOfLines={1}>
                  {nomeArquivo}
                </Text>
                <Text style={[styles.detalhesContagem, { color: theme.textSecondary }]}>
                  {itensPendentes.length} itens encontrados
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setItensPendentes([]);
                  setNomeArquivo(null);
                }}
                style={styles.botaoCancelarImportacao}
              >
                <Text style={[styles.textoCancelar, { color: theme.danger }]}>Descartar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linhaChipsStatus}>
              <View style={[styles.chipStatus, { backgroundColor: theme.warningLight }]}>
                <Text style={[styles.textoChipStatus, { color: theme.warning }]}>
                  {totalPendentesNovos} novos para incluir
                </Text>
              </View>

              <View style={[styles.chipStatus, { backgroundColor: theme.successLight }]}>
                <Text style={[styles.textoChipStatus, { color: theme.success }]}>
                  {totalConciliados} já conciliados
                </Text>
              </View>
            </View>

            {/* Ações de seleção rápida */}
            <View style={styles.linhaSelecaoRapida}>
              <TouchableOpacity onPress={() => selecionarTodosPendentes(true)}>
                <Text style={[styles.linkSelecao, { color: theme.primary }]}>Marcar Novos</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textMuted }}>•</Text>
              <TouchableOpacity onPress={() => selecionarTodosPendentes(false)}>
                <Text style={[styles.linkSelecao, { color: theme.textMuted }]}>Desmarcar Todos</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Itens do Extrato para Revisão */}
          <FlatList
            data={itensPendentes}
            keyExtractor={(item) => item.idTemp}
            contentContainerStyle={styles.listaRevisao}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const categoria = categorias.find((c) => c.id === item.categoria_id_sugerida);
              const isDespesa = item.tipo === 'despesa';

              return (
                <View
                  style={[
                    styles.itemRevisao,
                    {
                      backgroundColor: theme.card,
                      borderColor: item.selecionadoParaImportar ? theme.primary : theme.cardBorder,
                      borderWidth: item.selecionadoParaImportar ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Checkbox */}
                  <TouchableOpacity
                    onPress={() => alternarSelecao(item.idTemp)}
                    style={styles.checkboxArea}
                  >
                    <Ionicons
                      name={item.selecionadoParaImportar ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={item.selecionadoParaImportar ? theme.primary : theme.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Informações */}
                  <View style={styles.corpoItemRevisao}>
                    <View style={styles.linhaDescricaoValor}>
                      <Text style={[styles.descricaoExtrato, { color: theme.text }]} numberOfLines={2}>
                        {item.descricao}
                      </Text>
                      <Text
                        style={[
                          styles.valorExtrato,
                          { color: isDespesa ? theme.danger : theme.success },
                        ]}
                      >
                        {isDespesa ? '-' : '+'} {formatarMoeda(item.valor)}
                      </Text>
                    </View>

                    <View style={styles.linhaSubinfo}>
                      <Text style={[styles.dataExtrato, { color: theme.textMuted }]}>
                        {formatarDataBr(item.data)}
                      </Text>

                      {item.jaConciliado ? (
                        <View style={[styles.badgeConciliado, { backgroundColor: theme.successLight }]}>
                          <Ionicons name="checkmark-done" size={11} color={theme.success} />
                          <Text style={[styles.textoBadgeConciliado, { color: theme.success }]}>
                            Já no banco
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.badgePendente, { backgroundColor: theme.warningLight }]}>
                          <Text style={[styles.textoBadgePendente, { color: theme.warning }]}>
                            Pendente
                          </Text>
                        </View>
                      )}

                      {/* Botão de Categoria Sugerida */}
                      <TouchableOpacity
                        onPress={() => setCategoriaModalItem(item)}
                        style={[
                          styles.botaoTrocarCategoria,
                          { backgroundColor: (categoria?.cor || '#868E96') + '22' },
                        ]}
                      >
                        <Ionicons
                          name={(categoria?.icone as any) || 'pricetag-outline'}
                          size={13}
                          color={categoria?.cor || theme.text}
                        />
                        <Text
                          style={[styles.textoTrocarCategoria, { color: categoria?.cor || theme.text }]}
                          numberOfLines={1}
                        >
                          {categoria?.nome || 'Selecionar'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={categoria?.cor || theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {/* Barra de Ação Inferior Fixa */}
          <View style={[styles.barraAcaoFixa, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.infoConfirmacao}>
              <Text style={[styles.textoSelecionados, { color: theme.textSecondary }]}>
                Selecionados para importar:
              </Text>
              <Text style={[styles.numeroSelecionados, { color: theme.primary }]}>
                {totalSelecionados} lançamentos
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.botaoConfirmar,
                {
                  backgroundColor: totalSelecionados > 0 ? theme.primary : theme.inputBorder,
                },
              ]}
              onPress={confirmarImportacaoEmLote}
              disabled={salvandoLote || totalSelecionados === 0}
            >
              {salvandoLote ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.textoConfirmar}>Confirmar importação</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal Rápido de Seleção de Categoria ao Tocar no Item */}
      {categoriaModalItem && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.tituloModalCat, { color: theme.text }]}>Alterar categoria</Text>
            <Text style={[styles.subtituloModalCat, { color: theme.textSecondary }]} numberOfLines={1}>
              {categoriaModalItem.descricao}
            </Text>

            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.itemModalCat, { borderBottomColor: theme.inputBorder }]}
                  onPress={() => alterarCategoriaDoItem(categoriaModalItem.idTemp, cat.id)}
                >
                  <View style={[styles.circuloCatModal, { backgroundColor: cat.cor + '25' }]}>
                    <Ionicons name={(cat.icone as any) || 'pricetag'} size={18} color={cat.cor} />
                  </View>
                  <Text style={[styles.nomeCatModal, { color: theme.text }]}>{cat.nome}</Text>
                  {categoriaModalItem.categoria_id_sugerida === cat.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.botaoFecharModal, { backgroundColor: theme.inputBg }]}
              onPress={() => setCategoriaModalItem(null)}
            >
              <Text style={[styles.textoFecharModal, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollVazio: {
    padding: 16,
    paddingBottom: 110,
  },
  cardUpload: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  circuloUpload: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tituloUpload: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtituloUpload: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  botaoEscolher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    width: '100%',
  },
  textoBotaoEscolher: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  linhaFormatos: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  tagFormato: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  textoFormato: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDicas: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  tituloDicas: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  itemDica: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  textoDica: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  cardResumoImportacao: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  linhaTopoResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nomeArquivo: {
    fontSize: 15,
    fontWeight: '800',
  },
  detalhesContagem: {
    fontSize: 12,
    marginTop: 2,
  },
  botaoCancelarImportacao: {
    padding: 6,
  },
  textoCancelar: {
    fontSize: 13,
    fontWeight: '700',
  },
  linhaChipsStatus: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chipStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  textoChipStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  linhaSelecaoRapida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  linkSelecao: {
    fontSize: 12,
    fontWeight: '700',
  },
  listaRevisao: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  itemRevisao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  checkboxArea: {
    paddingRight: 10,
  },
  corpoItemRevisao: {
    flex: 1,
  },
  linhaDescricaoValor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  descricaoExtrato: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  valorExtrato: {
    fontSize: 14,
    fontWeight: '800',
  },
  linhaSubinfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dataExtrato: {
    fontSize: 11,
  },
  badgeConciliado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  textoBadgeConciliado: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgePendente: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textoBadgePendente: {
    fontSize: 10,
    fontWeight: '700',
  },
  botaoTrocarCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    maxWidth: 140,
  },
  textoTrocarCategoria: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  barraAcaoFixa: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoConfirmacao: {
    flex: 1,
  },
  textoSelecionados: {
    fontSize: 11,
  },
  numeroSelecionados: {
    fontSize: 14,
    fontWeight: '800',
  },
  botaoConfirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  textoConfirmar: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalConteudo: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  tituloModalCat: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtituloModalCat: {
    fontSize: 13,
    marginTop: 2,
  },
  itemModalCat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  circuloCatModal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nomeCatModal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  botaoFecharModal: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  textoFecharModal: {
    fontWeight: '700',
    fontSize: 14,
  },
});
