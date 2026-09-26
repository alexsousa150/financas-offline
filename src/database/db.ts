import { SQLiteDatabase } from 'expo-sqlite';
import { TipoGasto } from '../types';

export const DATABASE_NAME = 'financas.db';

export const CATEGORIAS_PADRAO: Array<{
  nome: string;
  icone: string;
  cor: string;
  limite: number | null;
  tipo_gasto: TipoGasto;
}> = [
  { nome: 'Alimentação', icone: 'fast-food-outline', cor: '#FF6B6B', limite: 1200, tipo_gasto: 'essencial' },
  { nome: 'Transporte', icone: 'car-sport-outline', cor: '#4D96FF', limite: 500, tipo_gasto: 'essencial' },
  { nome: 'Moradia', icone: 'home-outline', cor: '#FF922B', limite: 1500, tipo_gasto: 'essencial' },
  { nome: 'Saúde', icone: 'fitness-outline', cor: '#20C997', limite: 300, tipo_gasto: 'essencial' },
  { nome: 'Lazer', icone: 'game-controller-outline', cor: '#9B51E0', limite: 400, tipo_gasto: 'estilo_de_vida' },
  { nome: 'Salário / Renda', icone: 'wallet-outline', cor: '#51CF66', limite: null, tipo_gasto: 'essencial' },
  { nome: 'Outros', icone: 'ellipsis-horizontal-circle-outline', cor: '#868E96', limite: null, tipo_gasto: 'estilo_de_vida' },
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
      ordem INTEGER DEFAULT 0,
      limite_mensal REAL DEFAULT NULL,
      tipo_gasto TEXT DEFAULT 'essencial'
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
      pago INTEGER DEFAULT 1,
      parcela_atual INTEGER DEFAULT NULL,
      total_parcelas INTEGER DEFAULT NULL,
      grupo_parcelamento_id TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS importacoes_extrato (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_arquivo TEXT NOT NULL,
      data TEXT NOT NULL,
      quantidade_lancamentos INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lancamentos_recorrentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
      categoria_id INTEGER NOT NULL REFERENCES categorias(id),
      descricao TEXT,
      dia_vencimento INTEGER NOT NULL,
      ativo INTEGER DEFAULT 1,
      ultimo_mes_gerado TEXT
    );

    CREATE TABLE IF NOT EXISTS favoritos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'despesa',
      categoria_id INTEGER NOT NULL REFERENCES categorias(id),
      icone TEXT
    );

    CREATE TABLE IF NOT EXISTS regras_categorizacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      palavra_chave TEXT NOT NULL UNIQUE,
      categoria_id INTEGER NOT NULL REFERENCES categorias(id),
      frequencia INTEGER DEFAULT 1
    );
  `);

  // 1. Migrações seguras de colunas em 'categorias' para bancos já existentes
  try {
    const colunasCategorias = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categorias);');
    const nomesCategorias = new Set(colunasCategorias.map((c) => c.name.toLowerCase()));

    if (!nomesCategorias.has('limite_mensal')) {
      await db.execAsync(`ALTER TABLE categorias ADD COLUMN limite_mensal REAL DEFAULT NULL;`);
    }
    if (!nomesCategorias.has('tipo_gasto')) {
      await db.execAsync(`ALTER TABLE categorias ADD COLUMN tipo_gasto TEXT DEFAULT 'essencial';`);
    }
  } catch (e) {
    console.warn('Erro ao verificar/migrar colunas de categorias:', e);
  }

  // 2. Migrações seguras de colunas em 'transacoes' para bancos já existentes (ANTES dos índices!)
  try {
    const colunasTransacoes = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transacoes);');
    const nomesTransacoes = new Set(colunasTransacoes.map((c) => c.name.toLowerCase()));

    if (!nomesTransacoes.has('pago')) {
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN pago INTEGER DEFAULT 1;`);
    }
    if (!nomesTransacoes.has('parcela_atual')) {
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN parcela_atual INTEGER DEFAULT NULL;`);
    }
    if (!nomesTransacoes.has('total_parcelas')) {
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN total_parcelas INTEGER DEFAULT NULL;`);
    }
    if (!nomesTransacoes.has('grupo_parcelamento_id')) {
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN grupo_parcelamento_id TEXT DEFAULT NULL;`);
    }
  } catch (e) {
    console.warn('Erro ao verificar/migrar colunas de transações:', e);
  }

  // 3. Normalização de dados legados (preenche NULLs caso existam)
  try {
    await db.execAsync(`
      UPDATE transacoes SET pago = 1 WHERE pago IS NULL;
      UPDATE categorias SET tipo_gasto = 'essencial' WHERE tipo_gasto IS NULL;
    `);
  } catch (e) {
    // Ignora se der erro
  }

  // 4. Criação de índices SOMENTE AGORA (todas as colunas têm garantia absoluta de existência)
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
    CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes(categoria_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
    CREATE INDEX IF NOT EXISTS idx_transacoes_grupo ON transacoes(grupo_parcelamento_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_pago ON transacoes(pago);
  `);

  // 5. Verifica se categorias padrão já existem, se não, semeia
  const categoriasContagem = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categorias;'
  );

  if (!categoriasContagem || categoriasContagem.count === 0) {
    for (let i = 0; i < CATEGORIAS_PADRAO.length; i++) {
      const cat = CATEGORIAS_PADRAO[i];
      await db.runAsync(
        'INSERT INTO categorias (nome, icone, cor, ordem, limite_mensal, tipo_gasto) VALUES (?, ?, ?, ?, ?, ?);',
        cat.nome,
        cat.icone,
        cat.cor,
        i,
        cat.limite,
        cat.tipo_gasto
      );
    }
  }

  // 6. Verifica se favoritos padrão já existem, se não, semeia
  try {
    const favContagem = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM favoritos;'
    );

    if (!favContagem || favContagem.count === 0) {
      const catAlim = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categorias WHERE nome = 'Alimentação' LIMIT 1;"
      );
      const catTrans = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categorias WHERE nome = 'Transporte' LIMIT 1;"
      );
      const catSaude = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categorias WHERE nome = 'Saúde' LIMIT 1;"
      );

      const idAlim = catAlim?.id || 1;
      const idTrans = catTrans?.id || 1;
      const idSaude = catSaude?.id || 1;

      await db.runAsync(
        'INSERT INTO favoritos (titulo, valor, tipo, categoria_id, icone) VALUES (?, ?, ?, ?, ?);',
        'Almoço', 25.00, 'despesa', idAlim, 'restaurant-outline'
      );
      await db.runAsync(
        'INSERT INTO favoritos (titulo, valor, tipo, categoria_id, icone) VALUES (?, ?, ?, ?, ?);',
        'Café', 6.00, 'despesa', idAlim, 'cafe-outline'
      );
      await db.runAsync(
        'INSERT INTO favoritos (titulo, valor, tipo, categoria_id, icone) VALUES (?, ?, ?, ?, ?);',
        'Padaria', 12.00, 'despesa', idAlim, 'basket-outline'
      );
      await db.runAsync(
        'INSERT INTO favoritos (titulo, valor, tipo, categoria_id, icone) VALUES (?, ?, ?, ?, ?);',
        'Combustível', 50.00, 'despesa', idTrans, 'car-sport-outline'
      );
      await db.runAsync(
        'INSERT INTO favoritos (titulo, valor, tipo, categoria_id, icone) VALUES (?, ?, ?, ?, ?);',
        'Farmácia', 30.00, 'despesa', idSaude, 'fitness-outline'
      );
    }
  } catch (e) {
    console.warn('Erro ao verificar/semear favoritos:', e);
  }
}
