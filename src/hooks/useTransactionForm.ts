import { useState, useEffect, useRef, useMemo } from 'react';
import { TextInput, Alert } from 'react-native';
import { TipoTransacao, Transacao, FormaPagamento, Categoria } from '../types';
import { TransactionsRepository } from '../database/transactionsRepo';
import { converterCentavosParaValor, getDataHojeIso, formatarDataBr } from '../utils/formatters';
import { AppHaptics } from '../utils/haptics';
import { NotificationService } from '../services/notificationService';

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

interface UseTransactionFormProps {
  visivel: boolean;
  tipoInicial?: TipoTransacao;
  transacaoParaEdicao?: Transacao | null;
  transacaoParaDuplicacao?: Transacao | null;
  categorias: Categoria[];
  transactionsRepo: TransactionsRepository;
  notificarMudancaDados: () => Promise<void>;
  onFechar: () => void;
}

export function useTransactionForm({
  visivel,
  tipoInicial,
  transacaoParaEdicao,
  transacaoParaDuplicacao,
  categorias,
  transactionsRepo,
  notificarMudancaDados,
  onFechar,
}: UseTransactionFormProps) {
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [valorTextoCentavos, setValorTextoCentavos] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [dataIso, setDataIso] = useState<string>(getDataHojeIso());
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [lembreteAtivo, setLembreteAtivo] = useState(false);
  const [pago, setPago] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('outro');
  const [mostrarDiasCustom, setMostrarDiasCustom] = useState(false);
  const [dataInputTexto, setDataInputTexto] = useState('');
  const [isParcelado, setIsParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(3);
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
        setFormaPagamento(transacaoParaEdicao.forma_pagamento || 'outro');
        setIsParcelado(false);
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
        setFormaPagamento(transacaoParaDuplicacao.forma_pagamento || 'outro');
        setIsParcelado(false);
      } else {
        setTipo(tipoInicial || 'despesa');
        setValorTextoCentavos('');
        const hoje = getDataHojeIso();
        setDataIso(hoje);
        setDataInputTexto(formatarDataBr(hoje));
        setDescricao('');
        setPago(true);
        setFormaPagamento('pix');
        setIsParcelado(false);
        setNumeroParcelas(3);
        if (categorias.length > 0) {
          const catPadrao = categorias.find((c) => c.nome.toLowerCase() === 'alimentação') || categorias[0];
          setCategoriaId(catPadrao.id);
        }
      }

      setTimeout(() => {
        inputValorRef.current?.focus();
      }, 150);
    }
  }, [visivel, transacaoParaEdicao, transacaoParaDuplicacao, categorias, tipoInicial]);

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

  const categoriaEscolhida = categorias.find((c) => c.id === categoriaId);
  
  const sugestoesRapidas = useMemo(() => {
    if (!categoriaEscolhida) return ['Compra', 'Pagamento', 'Pix'];
    const nomeNorm = categoriaEscolhida.nome.toLowerCase().trim();
    for (const [chave, lista] of Object.entries(SUGESTOES_DESCRICAO_PADRAO)) {
      if (nomeNorm.includes(chave) || chave.includes(nomeNorm)) {
        return lista;
      }
    }
    return ['Compra', 'Pagamento', 'Pix', 'Serviço'];
  }, [categoriaEscolhida]);

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
          forma_pagamento: formaPagamento,
        });
      } else if (isParcelado && tipo === 'despesa') {
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
            forma_pagamento: formaPagamento || 'cartao_credito',
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
          forma_pagamento: formaPagamento,
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

  return {
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
  };
}
