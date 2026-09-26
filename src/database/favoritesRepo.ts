import { SQLiteDatabase } from 'expo-sqlite';
import { Favorito, TipoTransacao } from '../types';

export class FavoritesRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  async listar(): Promise<Favorito[]> {
    const rows = await this.db.getAllAsync<any>(`
      SELECT 
        f.id,
        f.titulo,
        f.valor,
        f.tipo,
        f.categoria_id,
        f.icone,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        c.icone as categoria_icone
      FROM favoritos f
      LEFT JOIN categorias c ON f.categoria_id = c.id
      ORDER BY f.id ASC;
    `);

    return rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      valor: Number(r.valor),
      tipo: r.tipo as TipoTransacao,
      categoria_id: r.categoria_id,
      icone: r.icone || r.categoria_icone || 'pricetag-outline',
      categoria_nome: r.categoria_nome || 'Sem categoria',
      categoria_cor: r.categoria_cor || '#10B981',
      categoria_icone: r.categoria_icone || 'pricetag-outline',
    }));
  }

  async criar(dados: {
    titulo: string;
    valor: number;
    tipo?: TipoTransacao;
    categoria_id: number;
    icone?: string;
  }): Promise<number> {
    const res = await this.db.runAsync(
      `INSERT INTO favoritos (titulo, valor, tipo, categoria_id, icone) VALUES (?, ?, ?, ?, ?);`,
      dados.titulo.trim(),
      dados.valor,
      dados.tipo || 'despesa',
      dados.categoria_id,
      dados.icone || null
    );
    return res.lastInsertRowId;
  }

  async atualizar(
    id: number,
    dados: Partial<{
      titulo: string;
      valor: number;
      tipo: TipoTransacao;
      categoria_id: number;
      icone: string;
    }>
  ): Promise<void> {
    const campos: string[] = [];
    const valores: any[] = [];

    if (dados.titulo !== undefined) {
      campos.push('titulo = ?');
      valores.push(dados.titulo.trim());
    }
    if (dados.valor !== undefined) {
      campos.push('valor = ?');
      valores.push(dados.valor);
    }
    if (dados.tipo !== undefined) {
      campos.push('tipo = ?');
      valores.push(dados.tipo);
    }
    if (dados.categoria_id !== undefined) {
      campos.push('categoria_id = ?');
      valores.push(dados.categoria_id);
    }
    if (dados.icone !== undefined) {
      campos.push('icone = ?');
      valores.push(dados.icone);
    }

    if (campos.length === 0) return;

    valores.push(id);
    await this.db.runAsync(
      `UPDATE favoritos SET ${campos.join(', ')} WHERE id = ?;`,
      ...valores
    );
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM favoritos WHERE id = ?;', id);
  }
}
