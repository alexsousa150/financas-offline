import { SQLiteDatabase } from 'expo-sqlite';
import { Conta } from '../types';

export class ContasRepository {
  private db: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.db = database;
  }

  async buscarTodas(): Promise<Conta[]> {
    return await this.db.getAllAsync<Conta>('SELECT * FROM contas WHERE deleted_at IS NULL ORDER BY id ASC;');
  }

  async criar(conta: Omit<Conta, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO contas (nome, tipo, saldo_inicial, cor, icone) VALUES (?, ?, ?, ?, ?);',
      conta.nome,
      conta.tipo,
      conta.saldo_inicial,
      conta.cor || null,
      conta.icone || null
    );
    return result.lastInsertRowId;
  }

  async atualizar(id: number, conta: Partial<Omit<Conta, 'id'>>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (conta.nome !== undefined) { sets.push('nome = ?'); values.push(conta.nome); }
    if (conta.tipo !== undefined) { sets.push('tipo = ?'); values.push(conta.tipo); }
    if (conta.saldo_inicial !== undefined) { sets.push('saldo_inicial = ?'); values.push(conta.saldo_inicial); }
    if (conta.cor !== undefined) { sets.push('cor = ?'); values.push(conta.cor); }
    if (conta.icone !== undefined) { sets.push('icone = ?'); values.push(conta.icone); }

    if (sets.length === 0) return;

    values.push(id);
    const query = `UPDATE contas SET ${sets.join(', ')} WHERE id = ?;`;
    await this.db.runAsync(query, ...values);
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync("UPDATE contas SET deleted_at = strftime('%s', 'now') WHERE id = ?;", id);
  }
}
