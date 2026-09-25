import { SQLiteDatabase } from 'expo-sqlite';
import {
  Transacao,
  TipoTransacao,
  ResumoFinanceiro,
  RankingCategoria,
} from '../types';
import { getMesAnterior } from '../utils/formatters';

export interface FiltrosTransacao {
  mesAno?: string; // Formato YYYY-MM
  tipo?: TipoTransacao;
  categoriaId?: number;
  busca?: string;
  limite?: number;
}

export class TransactionsRepository {
  constructor(private db: SQLiteDatabase) {}

  async listar(filtros: FiltrosTransacao = {}): Promise<Transacao[]> {
    let sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros.mesAno) {
      sql += ` AND strftime('%Y-%m', t.data) = ?`;
      params.push(filtros.mesAno);
    }

    if (filtros.tipo) {
      sql += ` AND t.tipo = ?`;
      params.push(filtros.tipo);
    }

    if (filtros.categoriaId) {
      sql += ` AND t.categoria_id = ?`;
      params.push(filtros.categoriaId);
    }

    if (filtros.busca && filtros.busca.trim()) {
      sql += ` AND (LOWER(t.descricao) LIKE ? OR LOWER(c.nome) LIKE ?)`;
      const termo = `%${filtros.busca.trim().toLowerCase()}%`;
      params.push(termo, termo);
    }

    sql += ` ORDER BY t.data DESC, t.id DESC`;

    if (filtros.limite && filtros.limite > 0) {
      sql += ` LIMIT ?`;
      params.push(filtros.limite);
    }

    return await this.db.getAllAsync<Transacao>(sql, ...params);
  }

  async obterPorId(id: number): Promise<Transacao | null> {
    const sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.id = ?;
    `;
    const row = await this.db.getFirstAsync<Transacao>(sql, id);
    return row || null;
  }

  async criar(transacao: Omit<Transacao, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO transacoes (valor, tipo, categoria_id, data, descricao, conciliado, origem)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      transacao.valor,
      transacao.tipo,
      transacao.categoria_id,
      transacao.data,
      transacao.descricao || '',
      transacao.conciliado ? 1 : 0,
      transacao.origem || 'manual'
    );
    return Number(result.lastInsertRowId);
  }

  async atualizar(id: number, transacao: Partial<Transacao>): Promise<void> {
    const campos: string[] = [];
    const params: any[] = [];

    if (transacao.valor !== undefined) {
      campos.push('valor = ?');
      params.push(transacao.valor);
    }
    if (transacao.tipo !== undefined) {
      campos.push('tipo = ?');
      params.push(transacao.tipo);
    }
    if (transacao.categoria_id !== undefined) {
      campos.push('categoria_id = ?');
      params.push(transacao.categoria_id);
    }
    if (transacao.data !== undefined) {
      campos.push('data = ?');
      params.push(transacao.data);
    }
    if (transacao.descricao !== undefined) {
      campos.push('descricao = ?');
      params.push(transacao.descricao);
    }
    if (transacao.conciliado !== undefined) {
      campos.push('conciliado = ?');
      params.push(transacao.conciliado ? 1 : 0);
    }
    if (transacao.origem !== undefined) {
      campos.push('origem = ?');
      params.push(transacao.origem);
    }

    if (campos.length === 0) return;

    params.push(id);
    const sql = `UPDATE transacoes SET ${campos.join(', ')} WHERE id = ?;`;
    await this.db.runAsync(sql, ...params);
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM transacoes WHERE id = ?;', id);
  }

  async duplicar(id: number, novaData?: string): Promise<number> {
    const original = await this.obterPorId(id);
    if (!original) throw new Error('Transação não encontrada');

    const hoje = new Date().toISOString().split('T')[0];
    return await this.criar({
      valor: original.valor,
      tipo: original.tipo,
      categoria_id: original.categoria_id,
      data: novaData || hoje,
      descricao: original.descricao ? `${original.descricao} (Cópia)` : '',
      conciliado: 0,
      origem: 'manual',
    });
  }

  /**
   * Inserção em lote para importação atômica e rápida de extratos
   */
  async inserirEmLote(transacoes: Omit<Transacao, 'id'>[]): Promise<number> {
    if (transacoes.length === 0) return 0;

    let totalInseridos = 0;
    await this.db.withTransactionAsync(async () => {
      for (const t of transacoes) {
        await this.db.runAsync(
          `INSERT INTO transacoes (valor, tipo, categoria_id, data, descricao, conciliado, origem)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          t.valor,
          t.tipo,
          t.categoria_id,
          t.data,
          t.descricao || '',
          t.conciliado ? 1 : 0,
          t.origem || 'importado'
        );
        totalInseridos++;
      }
    });

    return totalInseridos;
  }

  /**
   * Resumo de receitas, despesas e saldo do mês selecionado
   */
  async obterResumoMes(mesAno: string): Promise<ResumoFinanceiro> {
    const receitasResult = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'receita';`,
      mesAno
    );
    const despesasResult = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'despesa';`,
      mesAno
    );

    const receitas = receitasResult?.total || 0;
    const despesas = despesasResult?.total || 0;
    const saldo = receitas - despesas;

    return { receitas, despesas, saldo };
  }

  /**
   * Ranking detalhado das categorias ("onde estou sangrando") com % do total e comparação com o mês anterior
   */
  async obterRankingCategorias(mesAno: string, tipo: TipoTransacao = 'despesa'): Promise<RankingCategoria[]> {
    const mesAnterior = getMesAnterior(mesAno);

    // Total geral do período para calcular percentuais
    const totalPeriodoResult = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = ?;`,
      mesAno,
      tipo
    );
    const totalPeriodo = totalPeriodoResult?.total || 0;

    // Gastos por categoria no mês atual
    const gastosAtuais = await this.db.getAllAsync<{
      categoria_id: number;
      nome: string;
      cor: string;
      icone: string;
      total: number;
    }>(
      `SELECT 
         c.id as categoria_id,
         c.nome,
         c.cor,
         c.icone,
         SUM(t.valor) as total
       FROM transacoes t
       INNER JOIN categorias c ON t.categoria_id = c.id
       WHERE strftime('%Y-%m', t.data) = ? AND t.tipo = ?
       GROUP BY c.id
       ORDER BY total DESC;`,
      mesAno,
      tipo
    );

    // Gastos por categoria no mês anterior para cálculo de variação
    const gastosAnteriores = await this.db.getAllAsync<{
      categoria_id: number;
      total: number;
    }>(
      `SELECT 
         categoria_id,
         SUM(valor) as total
       FROM transacoes
       WHERE strftime('%Y-%m', data) = ? AND tipo = ?
       GROUP BY categoria_id;`,
      mesAnterior,
      tipo
    );

    const mapaAnterior = new Map<number, number>();
    for (const g of gastosAnteriores) {
      mapaAnterior.set(g.categoria_id, g.total);
    }

    return gastosAtuais.map((item) => {
      const percentual = totalPeriodo > 0 ? (item.total / totalPeriodo) * 100 : 0;
      const totalAnt = mapaAnterior.get(item.categoria_id) || 0;

      let variacaoPercentual: number | null = null;
      if (totalAnt > 0) {
        variacaoPercentual = ((item.total - totalAnt) / totalAnt) * 100;
      }

      return {
        categoriaId: item.categoria_id,
        nome: item.nome,
        cor: item.cor,
        icone: item.icone,
        total: item.total,
        percentual,
        totalMesAnterior: totalAnt,
        variacaoPercentual,
      };
    });
  }

  /**
   * Busca transações para verificação de conciliação bancária:
   * Procura no banco se existe alguma transação com valor similar (+/- R$0.01)
   * e data em um intervalo de tolerância de N dias.
   */
  async buscarCorrespondenteConciliacao(
    dataIso: string,
    valor: number,
    tipo: TipoTransacao,
    diasTolerancia: number = 3
  ): Promise<Transacao | null> {
    const sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        c.nome as categoria_nome
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.tipo = ?
        AND ABS(t.valor - ?) < 0.05
        AND ABS(julianday(t.data) - julianday(?)) <= ?
      ORDER BY ABS(julianday(t.data) - julianday(?)) ASC
      LIMIT 1;
    `;

    const row = await this.db.getFirstAsync<Transacao>(
      sql,
      tipo,
      valor,
      dataIso,
      diasTolerancia,
      dataIso
    );
    return row || null;
  }
}
