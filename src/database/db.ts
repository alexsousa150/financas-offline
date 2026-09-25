import { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'financas.db';

export const CATEGORIAS_PADRAO = [
  { nome: 'Alimentação', icone: 'fast-food-outline', cor: '#FF6B6B' },
  { nome: 'Transporte', icone: 'car-sport-outline', cor: '#4D96FF' },
  { nome: 'Moradia', icone: 'home-outline', cor: '#FF922B' },
  { nome: 'Lazer', icone: 'game-controller-outline', cor: '#9B51E0' },
  { nome: 'Saúde', icone: 'fitness-outline', cor: '#20C997' },
  { nome: 'Salário / Renda', icone: 'wallet-outline', cor: '#51CF66' },
  { nome: 'Outros', icone: 'ellipsis-horizontal-circle-outline', cor: '#868E96' },
];

/**
 * Inicializa e aplica migrações no banco de dados SQLite local
 */
export async function inicializarBanco(db: SQLiteDatabase): Promise<void> {
  // Habilita chaves estrangeiras e modo WAL para alta performance
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      icone TEXT NOT NULL,
      cor TEXT NOT NULL,
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
      categoria_id INTEGER NOT NULL REFERENCES categorias(id),
      data TEXT NOT NULL,
      descricao TEXT,
      conciliado INTEGER DEFAULT 0,
      origem TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS importacoes_extrato (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_arquivo TEXT NOT NULL,
      data TEXT NOT NULL,
      quantidade_lancamentos INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
    CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes(categoria_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
  `);

  // Verifica se categorias padrão já existem, se não, semeia
  const categoriasContagem = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categorias;'
  );

  if (!categoriasContagem || categoriasContagem.count === 0) {
    for (let i = 0; i < CATEGORIAS_PADRAO.length; i++) {
      const cat = CATEGORIAS_PADRAO[i];
      await db.runAsync(
        'INSERT INTO categorias (nome, icone, cor, ordem) VALUES (?, ?, ?, ?);',
        cat.nome,
        cat.icone,
        cat.cor,
        i
      );
    }
  }
}
