import { SQLiteDatabase } from 'expo-sqlite';
import { Cartao } from '../types';

export class CartoesRepository {
  private db: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.db = database;
  }

  async buscarTodos(): Promise<Cartao[]> {
    return await this.db.getAllAsync<Cartao>('SELECT * FROM cartoes ORDER BY id ASC;');
  }

  async criar(cartao: Omit<Cartao, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO cartoes (nome, limite, dia_vencimento, dia_fechamento, conta_pagamento_id, cor, icone) VALUES (?, ?, ?, ?, ?, ?, ?);',
      cartao.nome,
      cartao.limite,
      cartao.dia_vencimento,
      cartao.dia_fechamento,
      cartao.conta_pagamento_id || null,
      cartao.cor || null,
      cartao.icone || null
    );
    return result.lastInsertRowId;
  }

  async atualizar(id: number, cartao: Partial<Omit<Cartao, 'id'>>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (cartao.nome !== undefined) { sets.push('nome = ?'); values.push(cartao.nome); }
    if (cartao.limite !== undefined) { sets.push('limite = ?'); values.push(cartao.limite); }
    if (cartao.dia_vencimento !== undefined) { sets.push('dia_vencimento = ?'); values.push(cartao.dia_vencimento); }
    if (cartao.dia_fechamento !== undefined) { sets.push('dia_fechamento = ?'); values.push(cartao.dia_fechamento); }
    if (cartao.conta_pagamento_id !== undefined) { sets.push('conta_pagamento_id = ?'); values.push(cartao.conta_pagamento_id); }
    if (cartao.cor !== undefined) { sets.push('cor = ?'); values.push(cartao.cor); }
    if (cartao.icone !== undefined) { sets.push('icone = ?'); values.push(cartao.icone); }

    if (sets.length === 0) return;

    values.push(id);
    const query = `UPDATE cartoes SET ${sets.join(', ')} WHERE id = ?;`;
    await this.db.runAsync(query, ...values);
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM cartoes WHERE id = ?;', id);
  }
}
