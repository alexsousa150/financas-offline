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
import { Categoria } from '../types';

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
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (categoriaParaEdicao) {
      setNome(categoriaParaEdicao.nome);
      setCor(categoriaParaEdicao.cor);
      setIcone(categoriaParaEdicao.icone);
    } else {
      setNome('');
      setCor(CORES_PALETA[Math.floor(Math.random() * CORES_PALETA.length)]);
      setIcone(ICONES_DISPONIVEIS[0]);
    }
  }, [categoriaParaEdicao, visivel]);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe um nome para a categoria.');
      return;
    }

    try {
      setSalvando(true);
      if (categoriaParaEdicao) {
        await categoriesRepo.atualizar(categoriaParaEdicao.id, nome.trim(), icone, cor);
        await notificarMudancaDados();
        onFechar();
      } else {
        const idNova = await categoriesRepo.criar(nome.trim(), icone, cor);
        await notificarMudancaDados();
        if (onCategoriaCriada) {
          onCategoriaCriada({
            id: idNova,
            nome: nome.trim(),
            icone,
            cor,
          });
        }
        onFechar();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message?.includes('UNIQUE') ? 'Já existe uma categoria com este nome.' : 'Erro ao salvar categoria.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={[styles.conteudo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cabecalho}>
            <Text style={[styles.titulo, { color: theme.text }]}>
              {categoriaParaEdicao ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>
            <TouchableOpacity onPress={onFechar} style={styles.botaoFechar}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Preview do ícone selecionado */}
            <View style={styles.previewContainer}>
              <View style={[styles.previewIcone, { backgroundColor: cor + '25', borderColor: cor }]}>
                <Ionicons name={icone as any} size={36} color={cor} />
              </View>
              <Text style={[styles.previewTexto, { color: theme.text }]}>
                {nome || 'Nome da Categoria'}
              </Text>
            </View>

            {/* Input Nome */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Nome</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
              ]}
              placeholder="Ex: Cursos, Pet, Combustível..."
              placeholderTextColor={theme.textMuted}
              value={nome}
              onChangeText={setNome}
              maxLength={30}
            />

            {/* Seletor de Cores */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Cor</Text>
            <View style={styles.gridCores}>
              {CORES_PALETA.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCor(c)}
                  style={[
                    styles.circuloCor,
                    { backgroundColor: c },
                    cor === c && styles.circuloCorSelecionado,
                  ]}
                >
                  {cor === c && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Seletor de Ícones */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Ícone</Text>
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
    maxHeight: '85%',
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
  botaoFechar: {
    padding: 4,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  previewIcone: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  gridCores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  circuloCor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloCorSelecionado: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  gridIcones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  textoBotaoSalvar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
