import { TransactionsRepository } from '../database/transactionsRepo';
import { LearningRepository } from '../database/learningRepo';
import { Categoria, TransacaoExtratoPendente } from '../types';
import { ItemExtratoBruto } from './statementParser';
import { sugerirCategoriaPorDescricao } from '../utils/autoCategories';

export class ReconciliationService {
  constructor(
    private transactionsRepo: TransactionsRepository,
    private learningRepo: LearningRepository
  ) {}

  /**
   * Processa os itens brutos do extrato contra o banco SQLite existente:
   * 1. Verifica se já existe um lançamento correspondente
   * 2. Usa o Learning Engine (regras salvas) ou Sugestões estáticas para adivinhar a categoria
   * 3. Retorna a lista de itens pronta para revisão do usuário
   */
  async processarExtrato(
    itensBrutos: ItemExtratoBruto[],
    categorias: Categoria[],
    diasTolerancia: number = 3
  ): Promise<TransacaoExtratoPendente[]> {
    if (itensBrutos.length === 0) return [];

    const pendentes: TransacaoExtratoPendente[] = [];

    // Otimização Full Stack: busca todas as transações da janela do extrato em UMA única query rápida
    const datas = itensBrutos.map((i) => i.data).filter(Boolean).sort();
    const dataMinima = datas[0];
    const dataMaxima = datas[datas.length - 1];

    let transacoesExistentes: any[] = [];
    if (dataMinima && dataMaxima) {
      const minDateObj = new Date(dataMinima);
      minDateObj.setDate(minDateObj.getDate() - (diasTolerancia + 1));
      const minIso = minDateObj.toISOString().split('T')[0];

      const maxDateObj = new Date(dataMaxima);
      maxDateObj.setDate(maxDateObj.getDate() + (diasTolerancia + 1));
      const maxIso = maxDateObj.toISOString().split('T')[0];

      transacoesExistentes = await this.transactionsRepo.listarPorIntervaloDatas(minIso, maxIso);
    }

    for (let i = 0; i < itensBrutos.length; i++) {
      const item = itensBrutos[i];

      // Cruzamento na memória com tolerância de valor e data
      const correspondente = transacoesExistentes.find((t) => {
        if (t.tipo !== item.tipo) return false;
        if (Math.abs(t.valor - item.valor) >= 0.05) return false;
        const diffMs = Math.abs(new Date(t.data).getTime() - new Date(item.data).getTime());
        const diffDias = diffMs / (1000 * 60 * 60 * 24);
        return diffDias <= diasTolerancia;
      });

      // 1. Tenta achar categoria pelo Learning Engine (o que o usuário já escolheu antes)
      let categoriaSugeridaId = await this.learningRepo.buscarRegra(item.descricao);

      // 2. Se não encontrou regra aprendida, faz fallback pro arquivo estático de palavras-chave
      if (!categoriaSugeridaId) {
        categoriaSugeridaId = sugerirCategoriaPorDescricao(item.descricao, categorias, item.tipo);
      }

      const jaConciliado = !!correspondente;

      pendentes.push({
        idTemp: `temp_${Date.now()}_${i}`,
        data: item.data,
        descricao: item.descricao,
        valor: item.valor,
        tipo: item.tipo,
        categoria_id_sugerida: categoriaSugeridaId,
        jaConciliado,
        transacaoCorrespondenteId: correspondente ? correspondente.id : undefined,
        selecionadoParaImportar: !jaConciliado,
      });
    }

    return pendentes;
  }
}
