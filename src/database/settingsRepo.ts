import { SQLiteDatabase } from 'expo-sqlite';

export class SettingsRepository {
  constructor(private db: SQLiteDatabase) {}

  async obter(chave: string, valorPadrao: string = ''): Promise<string> {
    const row = await this.db.getFirstAsync<{ valor: string }>(
      'SELECT valor FROM configuracoes WHERE chave = ?;',
      chave
    );
    return row ? row.valor : valorPadrao;
  }

  async definir(chave: string, valor: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;`,
      chave,
      valor
    );
  }

  async obterBooleano(chave: string, padrao: boolean = false): Promise<boolean> {
    const val = await this.obter(chave, padrao ? '1' : '0');
    return val === '1';
  }

  async definirBooleano(chave: string, valor: boolean): Promise<void> {
    await this.definir(chave, valor ? '1' : '0');
  }
}
