import { SQLiteDatabase } from 'expo-sqlite';
import { Categoria } from '../types';

export class CategoriesRepository {
  constructor(private db: SQLiteDatabase) {}

  async listarTodas(): Promise<Categoria[]> {
    const rows = await this.db.getAllAsync<Categoria>(`
      SELECT 
        c.id, 
        c.nome, 
        c.icone, 
        c.cor, 
        c.ordem,
        c.limite_mensal,
        COUNT(t.id) as contagemTransacoes
      FROM categorias c
      LEFT JOIN transacoes t ON c.id = t.categoria_id
      GROUP BY c.id
      ORDER BY c.ordem ASC, c.nome ASC;
    `);
    return rows;
  }

  async obterPorId(id: number): Promise<Categoria | null> {
    const row = await this.db.getFirstAsync<Categoria>(
      'SELECT id, nome, icone, cor, ordem, limite_mensal FROM categorias WHERE id = ?;',
      id
    );
    return row || null;
  }

  async obterOuCriar(
    nome: string,
    icone: string = 'ellipsis-horizontal-circle-outline',
    cor: string = '#4D96FF',
    limiteMensal: number | null = null
  ): Promise<Categoria> {
    const existente = await this.db.getFirstAsync<Categoria>(
      'SELECT id, nome, icone, cor, ordem, limite_mensal FROM categorias WHERE LOWER(nome) = LOWER(?);',
      nome.trim()
    );
    if (existente) return existente;

    const result = await this.db.runAsync(
      'INSERT INTO categorias (nome, icone, cor, limite_mensal) VALUES (?, ?, ?, ?);',
      nome.trim(),
      icone,
      cor,
      limiteMensal
    );

    return {
      id: Number(result.lastInsertRowId),
      nome: nome.trim(),
      icone,
      cor,
      limite_mensal: limiteMensal,
    };
  }

  async criar(nome: string, icone: string, cor: string, limiteMensal?: number | null): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO categorias (nome, icone, cor, limite_mensal) VALUES (?, ?, ?, ?);',
      nome.trim(),
      icone,
      cor,
      limiteMensal ?? null
    );
    return Number(result.lastInsertRowId);
  }

  async atualizar(id: number, nome: string, icone: string, cor: string, limiteMensal?: number | null): Promise<void> {
    await this.db.runAsync(
      'UPDATE categorias SET nome = ?, icone = ?, cor = ?, limite_mensal = ? WHERE id = ?;',
      nome.trim(),
      icone,
      cor,
      limiteMensal ?? null,
      id
    );
  }

  /**
   * Exclui categoria. Se houver transações vinculadas, transfere para outra categoria indicada.
   */
  async excluir(id: number, categoriaDestinoId?: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      if (categoriaDestinoId && categoriaDestinoId !== id) {
        await this.db.runAsync(
          'UPDATE transacoes SET categoria_id = ? WHERE categoria_id = ?;',
          categoriaDestinoId,
          id
        );
      } else {
        // Encontra a categoria "Outros" ou a primeira disponível diferente da que está sendo excluída
        const fallback = await this.db.getFirstAsync<{ id: number }>(
          "SELECT id FROM categorias WHERE id != ? AND (LOWER(nome) = 'outros' OR 1=1) LIMIT 1;",
          id
        );
        if (fallback) {
          await this.db.runAsync(
            'UPDATE transacoes SET categoria_id = ? WHERE categoria_id = ?;',
            fallback.id,
            id
          );
        }
      }

      await this.db.runAsync('DELETE FROM categorias WHERE id = ?;', id);
    });
  }

  /**
   * Mescla duas categorias: transfere todos os lançamentos da categoriaOrigemId para a categoriaDestinoId
   * e remove a categoria de origem.
   */
  async mesclar(categoriaOrigemId: number, categoriaDestinoId: number): Promise<void> {
    if (categoriaOrigemId === categoriaDestinoId) return;

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE transacoes SET categoria_id = ? WHERE categoria_id = ?;',
        categoriaDestinoId,
        categoriaOrigemId
      );
      await this.db.runAsync('DELETE FROM categorias WHERE id = ?;', categoriaOrigemId);
    });
  }
}
