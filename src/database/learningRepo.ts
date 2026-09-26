import { SQLiteDatabase } from 'expo-sqlite';
import { Categoria, TipoTransacao } from '../types';

export class LearningRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Aprende uma nova regra de categorização.
   * Se o usuário definiu "UBER DO BRASIL" como "Transporte", na próxima vez
   * o sistema vai sugerir "Transporte" sozinho.
   */
  async aprenderRegra(descricao: string, categoriaId: number): Promise<void> {
    const palavraChave = this.limparDescricao(descricao);
    if (!palavraChave || palavraChave.length < 3) return;

    await this.db.runAsync(
      `INSERT INTO regras_categorizacao (palavra_chave, categoria_id, frequencia) 
       VALUES (?, ?, 1)
       ON CONFLICT(palavra_chave) DO UPDATE SET 
         categoria_id = excluded.categoria_id,
         frequencia = frequencia + 1;`,
      palavraChave,
      categoriaId
    );
  }

  /**
   * Busca a categoria aprendida com base na descrição do extrato.
   */
  async buscarRegra(descricao: string): Promise<number | null> {
    const palavraChave = this.limparDescricao(descricao);
    if (!palavraChave || palavraChave.length < 3) return null;

    // Busca exata ou que a descrição contenha a palavra chave conhecida (mais flexível)
    const row = await this.db.getFirstAsync<{ categoria_id: number }>(
      `SELECT categoria_id FROM regras_categorizacao 
       WHERE ? LIKE '%' || palavra_chave || '%' 
       ORDER BY frequencia DESC LIMIT 1;`,
      palavraChave
    );

    return row ? row.categoria_id : null;
  }

  /**
   * Limpa a descrição para gerar uma assinatura mais estável do estabelecimento.
   * Ex: "COMPRA NO CARTAO FINAL 1234 UBER *TRIP" -> "uber trip"
   */
  private limparDescricao(descricao: string): string {
    return descricao
      .toLowerCase()
      .replace(/compra no cartao final \d+/g, '')
      .replace(/pagamento efetuado/g, '')
      .replace(/pix enviado/g, '')
      .replace(/pix recebido/g, '')
      .replace(/[^a-z0-9 ]/g, ' ') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim();
  }
}
