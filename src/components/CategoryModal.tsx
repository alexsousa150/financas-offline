import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Categoria, TipoGasto } from '../types';
import { converterCentavosParaValor, formatarMoeda } from '../utils/formatters';
import { AppHaptics } from '../utils/haptics';

const CORES_PALETA = [
  '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#9B51E0',
  '#FF922B', '#20C997', '#E83A59', '#339AF0', '#51CF66',
  '#F06595', '#845EC2', '#FFC75F', '#008F7A', '#868E96'
];

const ICONES_DISPONIVEIS = [
  'fast-food-outline', 'restaurant-outline', 'cafe-outline',
  'car-sport-outline', 'bus-outline', 'airplane-outline',
  'home-outline', 'flash-outline', 'water-outline',
  'game-controller-outline', 'tv-outline', 'film-outline',
  'fitness-outline', 'medkit-outline', 'heart-outline',
  'wallet-outline', 'cash-outline', 'briefcase-outline',
  'cart-outline', 'shirt-outline', 'gift-outline',
  'school-outline', 'construct-outline', 'paw-outline',
  'ellipsis-horizontal-circle-outline'
];

interface CategoryModalProps {
  visivel: boolean;
  categoriaParaEdicao?: Categoria | null;
  onFechar: () => void;
  onCategoriaCriada?: (categoriaCriada: Categoria) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visivel,
  categoriaParaEdicao,
  onFechar,
  onCategoriaCriada,
}) => {
  const { theme } = useTheme();
  const { categoriesRepo, notificarMudancaDados } = useApp();

  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES_PALETA[0]);
  const [icone, setIcone] = useState(ICONES_DISPONIVEIS[0]);
  const [tipoGasto, setTipoGasto] = useState<TipoGasto>('essencial');
  const [limiteTextoCentavos, setLimiteTextoCentavos] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (categoriaParaEdicao) {
      setNome(categoriaParaEdicao.nome);
      setCor(categoriaParaEdicao.cor);
      setIcone(categoriaParaEdicao.icone);
      setTipoGasto(categoriaParaEdicao.tipo_gasto || 'essencial');
      if (categoriaParaEdicao.limite_mensal && categoriaParaEdicao.limite_mensal > 0) {
        setLimiteTextoCentavos(Math.round(categoriaParaEdicao.limite_mensal * 100).toString());
      } else {
        setLimiteTextoCentavos('');
      }
    } else {
      setNome('');
      setCor(CORES_PALETA[Math.floor(Math.random() * CORES_PALETA.length)]);
      setIcone(ICONES_DISPONIVEIS[0]);
      setTipoGasto('essencial');
      setLimiteTextoCentavos('');
    }
  }, [categoriaParaEdicao, visivel]);

  const valorLimiteNumerico = converterCentavosParaValor(limiteTextoCentavos);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe um nome para a categoria.');
      return;
    }

    try {
      setSalvando(true);
      const limiteFinal = valorLimiteNumerico > 0 ? valorLimiteNumerico : null;

      if (categoriaParaEdicao) {
        await categoriesRepo.atualizar(categoriaParaEdicao.id, nome.trim(), icone, cor, limiteFinal, tipoGasto);
        await notificarMudancaDados();
        onFechar();
      } else {
        const idNova = await categoriesRepo.criar(nome.trim(), icone, cor, limiteFinal, tipoGasto);
        await notificarMudancaDados();
        if (onCategoriaCriada) {
          onCategoriaCriada({
            id: idNova,
            nome: nome.trim(),
            icone,
            cor,
            limite_mensal: limiteFinal,
            tipo_gasto: tipoGasto,
          });
        }
        onFechar();
      }
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível salvar a categoria.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={[styles.conteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <Text style={[styles.titulo, { color: theme.text }]}>
              {categoriaParaEdicao ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>
            <TouchableOpacity onPress={onFechar} style={styles.botaoFechar}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Pré-visualização do Badge */}
            <View style={styles.previewContainer}>
              <View style={[styles.previewIcone, { backgroundColor: cor + '25', borderColor: cor }]}>
                <Ionicons name={icone as any} size={30} color={cor} />
              </View>
              <Text style={[styles.previewTexto, { color: theme.text }]}>
                {nome.trim() || 'Nome da Categoria'}
              </Text>
              <Text style={[styles.previewClassificacao, { color: tipoGasto === 'essencial' ? theme.success : theme.warning }]}>
                {tipoGasto === 'essencial' ? '🛡️ Gasto Essencial (Sobrevivência)' : '✨ Estilo de Vida (Lazer/Supérfluo)'}
              </Text>
              {valorLimiteNumerico > 0 && (
                <Text style={[styles.previewLimite, { color: theme.danger }]}>
                  Teto mensal: {formatarMoeda(valorLimiteNumerico)}
                </Text>
              )}
            </View>

            {/* Nome da Categoria */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Nome</Text>
            <TextInput
              style={[
                styles.inputNome,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
              ]}
              placeholder="Ex: Farmácia, Pet, Academia..."
              placeholderTextColor={theme.textMuted}
              value={nome}
              onChangeText={setNome}
              maxLength={30}
            />

            {/* Classificação Financeira: Essencial vs Estilo de Vida */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              Classificação Financeira
            </Text>
            <View style={styles.linhaTipoGasto}>
              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueSelecao();
                  setTipoGasto('essencial');
                }}
                style={[
                  styles.botaoTipoGasto,
                  {
                    backgroundColor: tipoGasto === 'essencial' ? theme.successLight : theme.inputBg,
                    borderColor: tipoGasto === 'essencial' ? theme.success : theme.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={tipoGasto === 'essencial' ? theme.success : theme.textSecondary}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.tituloTipoGasto, { color: tipoGasto === 'essencial' ? theme.success : theme.text }]}>
                    Essencial
                  </Text>
                  <Text style={[styles.descTipoGasto, { color: theme.textSecondary }]}>
                    Moradia, contas, saúde, alimentação básica
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  AppHaptics.toqueSelecao();
                  setTipoGasto('estilo_de_vida');
                }}
                style={[
                  styles.botaoTipoGasto,
                  {
                    backgroundColor: tipoGasto === 'estilo_de_vida' ? theme.warningLight : theme.inputBg,
                    borderColor: tipoGasto === 'estilo_de_vida' ? theme.warning : theme.inputBorder,
                    marginTop: 8,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={tipoGasto === 'estilo_de_vida' ? theme.warning : theme.textSecondary}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.tituloTipoGasto, { color: tipoGasto === 'estilo_de_vida' ? theme.warning : theme.text }]}>
                    Estilo de Vida
                  </Text>
                  <Text style={[styles.descTipoGasto, { color: theme.textSecondary }]}>
                    Lazer, delivery, compras, viagens, supérfluos
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Teto / Limite de Gastos Mensal */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              Limite Máximo de Gastos no Mês (Opcional)
            </Text>
            <View style={styles.linhaLimite}>
              <Text style={[styles.labelMoeda, { color: theme.danger }]}>R$</Text>
              <TextInput
                style={[
                  styles.inputLimite,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                ]}
                keyboardType="numeric"
                placeholder="0,00 (Sem limite definido)"
                placeholderTextColor={theme.textMuted}
                value={valorLimiteNumerico > 0 ? valorLimiteNumerico.toFixed(2).replace('.', ',') : ''}
                onChangeText={(texto) => {
                  const apenasDigitos = texto.replace(/\D/g, '');
                  setLimiteTextoCentavos(apenasDigitos);
                }}
                maxLength={9}
              />
            </View>

            {/* Seletor de Cores */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>Cor</Text>
            <View style={styles.gridCores}>
              {CORES_PALETA.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCor(c)}
                  style={[
                    styles.circuloCor,
                    { backgroundColor: c },
                    cor === c && styles.circuloCorSelecionada,
                  ]}
                />
              ))}
            </View>

            {/* Seletor de Ícones */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>Ícone</Text>
            <View style={styles.gridIcones}>
              {ICONES_DISPONIVEIS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setIcone(ic)}
                  style={[
                    styles.itemIcone,
                    { backgroundColor: icone === ic ? cor + '25' : theme.inputBg },
                    icone === ic && { borderColor: cor, borderWidth: 2 },
                  ]}
                >
                  <Ionicons name={ic as any} size={22} color={icone === ic ? cor : theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Botão Salvar */}
          <TouchableOpacity
            style={[styles.botaoSalvar, { backgroundColor: theme.primary }]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <Text style={styles.textoBotaoSalvar}>
              {salvando ? 'Salvando...' : 'Salvar Categoria'}
            </Text>
          </TouchableOpacity>
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
  previewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewIcone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  previewTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewClassificacao: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  previewLimite: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputNome: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  linhaTipoGasto: {
    gap: 4,
  },
  botaoTipoGasto: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tituloTipoGasto: {
    fontSize: 14,
    fontWeight: '700',
  },
  descTipoGasto: {
    fontSize: 11,
    marginTop: 2,
  },
  linhaLimite: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelMoeda: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 8,
  },
  inputLimite: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  gridCores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  circuloCor: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  circuloCorSelecionada: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  gridIcones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemIcone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSalvar: {
    height: 52,
    borderRadius: 16,
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
