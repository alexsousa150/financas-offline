import { SQLiteDatabase } from 'expo-sqlite';
import { FaturaCartao, FaturaStatus } from '../types';

export class FaturasRepository {
  constructor(private db: SQLiteDatabase) {}

  async buscarPorCartao(cartaoId: number): Promise<FaturaCartao[]> {
    return await this.db.getAllAsync<FaturaCartao>(
      'SELECT * FROM faturas WHERE cartao_id = ? AND deleted_at IS NULL ORDER BY mes_ano DESC;',
      cartaoId
    );
  }

  async obterPorId(id: number): Promise<FaturaCartao | null> {
    return await this.db.getFirstAsync<FaturaCartao>(
      'SELECT * FROM faturas WHERE id = ? AND deleted_at IS NULL;',
      id
    );
  }

  async buscarPorStatus(status: FaturaStatus): Promise<FaturaCartao[]> {
    return await this.db.getAllAsync<FaturaCartao>(
      'SELECT * FROM faturas WHERE status = ? AND deleted_at IS NULL ORDER BY data_vencimento ASC;',
      status
    );
  }

  async criar(fatura: Omit<FaturaCartao, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO faturas (cartao_id, mes_ano, data_fechamento, data_vencimento, valor_total, status) 
       VALUES (?, ?, ?, ?, ?, ?);`,
      fatura.cartao_id,
      fatura.mes_ano,
      fatura.data_fechamento,
      fatura.data_vencimento,
      fatura.valor_total,
      fatura.status
    );
    return result.lastInsertRowId;
  }

  async atualizarStatus(id: number, status: FaturaStatus): Promise<void> {
    await this.db.runAsync(
      'UPDATE faturas SET status = ? WHERE id = ?;',
      status,
      id
    );
  }

  async vincularTransacoes(faturaId: number, transacoesIds: number[]): Promise<void> {
    if (transacoesIds.length === 0) return;
    const marks = transacoesIds.map(() => '?').join(', ');
    await this.db.runAsync(
      `UPDATE transacoes SET fatura_id = ? WHERE id IN (${marks});`,
      faturaId,
      ...transacoesIds
    );
  }
}
