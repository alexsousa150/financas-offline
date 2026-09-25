import { TransactionsRepository } from '../database/transactionsRepo';
import { Categoria, TransacaoExtratoPendente } from '../types';
import { ItemExtratoBruto } from './statementParser';
import { sugerirCategoriaPorDescricao } from '../utils/autoCategories';

export class ReconciliationService {
  constructor(private transactionsRepo: TransactionsRepository) {}

  /**
   * Processa os itens brutos do extrato contra o banco SQLite existente:
   * 1. Verifica se já existe um lançamento com o mesmo valor (+/- R$0.05) e data próxima (+/- 3 dias)
   * 2. Sugere automaticamente a categoria com base no texto do estabelecimento/descrição
   * 3. Retorna a lista de itens pronta para revisão do usuário
   */
  async processarExtrato(
    itensBrutos: ItemExtratoBruto[],
    categorias: Categoria[],
    diasTolerancia: number = 3
  ): Promise<TransacaoExtratoPendente[]> {
    const pendentes: TransacaoExtratoPendente[] = [];

    for (let i = 0; i < itensBrutos.length; i++) {
      const item = itensBrutos[i];

      // Busca no banco se já existe transação compatível
      const correspondente = await this.transactionsRepo.buscarCorrespondenteConciliacao(
        item.data,
        item.valor,
        item.tipo,
        diasTolerancia
      );

      // Sugere categoria por inteligência de palavras-chave
      const categoriaSugeridaId = sugerirCategoriaPorDescricao(
        item.descricao,
        categorias,
        item.tipo
      );

      const jaConciliado = correspondente !== null;

      pendentes.push({
        idTemp: `temp_${Date.now()}_${i}`,
        data: item.data,
        descricao: item.descricao,
        valor: item.valor,
        tipo: item.tipo,
        categoria_id_sugerida: categoriaSugeridaId,
        jaConciliado,
        transacaoCorrespondenteId: correspondente ? correspondente.id : undefined,
        // Por padrão, se já bateu com o banco, desmarca para não duplicar. Se for novo, marca para importar.
        selecionadoParaImportar: !jaConciliado,
      });
    }

    return pendentes;
  }
}
