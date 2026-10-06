import { SQLiteDatabase } from 'expo-sqlite';
import { TipoGasto } from '../types';

export const DATABASE_NAME = 'financas.db';

export const CATEGORIAS_PADRAO: {
  nome: string;
  icone: string;
  cor: string;
  limite: number | null;
  tipo_gasto: TipoGasto;
}[] = [
  { nome: 'Alimentação', icone: 'fast-food-outline', cor: '#FF6B6B', limite: 1200, tipo_gasto: 'essencial' },
  { nome: 'Transporte', icone: 'car-sport-outline', cor: '#4D96FF', limite: 500, tipo_gasto: 'essencial' },
  { nome: 'Moradia', icone: 'home-outline', cor: '#FF922B', limite: 1500, tipo_gasto: 'essencial' },
  { nome: 'Saúde', icone: 'fitness-outline', cor: '#20C997', limite: 300, tipo_gasto: 'essencial' },
  { nome: 'Lazer', icone: 'game-controller-outline', cor: '#9B51E0', limite: 400, tipo_gasto: 'estilo_de_vida' },
  { nome: 'Investimentos / Reserva', icone: 'trending-up-outline', cor: '#0EA5E9', limite: null, tipo_gasto: 'poupanca' },
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
      forma_pagamento TEXT DEFAULT 'outro',
      deleted_at TEXT DEFAULT NULL,
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

    CREATE TABLE IF NOT EXISTS schema_migrations (
      versao INTEGER PRIMARY KEY,
      descricao TEXT NOT NULL,
      executada_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Helper para executar migrações versionadas ordenadas e atômicas
  const executarMigracao = async (
    versao: number,
    descricao: string,
    migracaoFn: () => Promise<void>
  ) => {
    const jaExecutada = await db.getFirstAsync<{ versao: number }>(
      'SELECT versao FROM schema_migrations WHERE versao = ?;',
      versao
    );
    if (jaExecutada) return;

    await migracaoFn();
    await db.runAsync(
      'INSERT INTO schema_migrations (versao, descricao) VALUES (?, ?);',
      versao,
      descricao
    );
    await db.execAsync(`PRAGMA user_version = ${versao};`);
  };

  // Migração 1: Garantia de colunas extras em categorias e transações
  await executarMigracao(1, 'Colunas extras em categorias e transacoes', async () => {
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
      console.warn('Migração 1 (categorias):', e);
    }

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
      console.warn('Migração 1 (transações):', e);
    }
  });

  // Migração 2: Normalização de dados legados
  await executarMigracao(2, 'Normalizacao de dados nulos', async () => {
    try {
      await db.execAsync(`
        UPDATE transacoes SET pago = 1 WHERE pago IS NULL;
        UPDATE categorias SET tipo_gasto = 'essencial' WHERE tipo_gasto IS NULL;
      `);
    } catch (e) {
      // Ignora se der erro
    }
  });

  // Migração 3: Criação de índices individuais e compostos de alta performance
  await executarMigracao(3, 'Indices de busca e compostos', async () => {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
      CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes(categoria_id);
      CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
      CREATE INDEX IF NOT EXISTS idx_transacoes_grupo ON transacoes(grupo_parcelamento_id);
      CREATE INDEX IF NOT EXISTS idx_transacoes_pago ON transacoes(pago);
      CREATE INDEX IF NOT EXISTS idx_transacoes_data_tipo ON transacoes(data, tipo);
      CREATE INDEX IF NOT EXISTS idx_transacoes_data_pago ON transacoes(data, pago);
    `);
  });

  // Migração 4: Suporte a forma de pagamento em transações
  await executarMigracao(4, 'Coluna forma_pagamento em transacoes', async () => {
    try {
      const colunasTransacoes = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transacoes);');
      const nomesTransacoes = new Set(colunasTransacoes.map((c) => c.name.toLowerCase()));
      if (!nomesTransacoes.has('forma_pagamento')) {
        await db.execAsync(`ALTER TABLE transacoes ADD COLUMN forma_pagamento TEXT DEFAULT 'outro';`);
      }
    } catch (e) {
      console.warn('Migração 4 (forma_pagamento):', e);
    }
  });

  // Migração 5: Suporte a soft delete (lixeira de 30 dias)
  await executarMigracao(5, 'Coluna deleted_at em transacoes para soft delete', async () => {
    try {
      const colunasTransacoes = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transacoes);');
      const nomesTransacoes = new Set(colunasTransacoes.map((c) => c.name.toLowerCase()));
      if (!nomesTransacoes.has('deleted_at')) {
        await db.execAsync(`
          ALTER TABLE transacoes ADD COLUMN deleted_at TEXT DEFAULT NULL;
          CREATE INDEX IF NOT EXISTS idx_transacoes_deleted_at ON transacoes(deleted_at);
        `);
      }
    } catch (e) {
      console.warn('Migração 5 (deleted_at):', e);
    }
  });

  // Migração 6: Suporte a Múltiplas Contas, Cartões de Crédito e Conciliação
  await executarMigracao(6, 'Estrutura para Contas, Cartoes, Conciliacao e Anexos', async () => {
    try {
      // 1. Criação das novas tabelas
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS contas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          tipo TEXT NOT NULL DEFAULT 'corrente',
          saldo_inicial REAL DEFAULT 0,
          cor TEXT,
          icone TEXT
        );

        CREATE TABLE IF NOT EXISTS cartoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          limite REAL NOT NULL,
          dia_vencimento INTEGER NOT NULL,
          dia_fechamento INTEGER NOT NULL,
          conta_pagamento_id INTEGER REFERENCES contas(id),
          cor TEXT,
          icone TEXT
        );
      `);

      // 2. Modificações na tabela de transações
      const colunasTransacoes = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transacoes);');
      const nomesTransacoes = new Set(colunasTransacoes.map((c) => c.name.toLowerCase()));

      if (!nomesTransacoes.has('conta_id')) {
        await db.execAsync('ALTER TABLE transacoes ADD COLUMN conta_id INTEGER REFERENCES contas(id);');
      }
      if (!nomesTransacoes.has('conta_destino_id')) {
        await db.execAsync('ALTER TABLE transacoes ADD COLUMN conta_destino_id INTEGER REFERENCES contas(id);');
      }
      if (!nomesTransacoes.has('cartao_id')) {
        await db.execAsync('ALTER TABLE transacoes ADD COLUMN cartao_id INTEGER REFERENCES cartoes(id);');
      }
      if (!nomesTransacoes.has('codigo_bancario_hash')) {
        await db.execAsync('ALTER TABLE transacoes ADD COLUMN codigo_bancario_hash TEXT UNIQUE;');
      }
      if (!nomesTransacoes.has('anexo_uri')) {
        await db.execAsync('ALTER TABLE transacoes ADD COLUMN anexo_uri TEXT;');
      }

      // 3. Semeia uma Conta Padrão se não existir nenhuma
      const contasCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM contas;');
      if (!contasCount || contasCount.count === 0) {
        await db.runAsync(
          'INSERT INTO contas (nome, tipo, saldo_inicial, cor, icone) VALUES (?, ?, ?, ?, ?);',
          'Carteira Principal', 'corrente', 0, '#3b82f6', 'wallet'
        );
      }

      // 4. Vincula as transações legadas à conta principal recém-criada (onde conta_id e cartao_id forem null)
      await db.execAsync(
        'UPDATE transacoes SET conta_id = (SELECT id FROM contas ORDER BY id ASC LIMIT 1) WHERE conta_id IS NULL AND cartao_id IS NULL;'
      );

    } catch (e) {
      console.warn('Migração 6 falhou:', e);
    }
  });

  // Migração 7: Criação do controle de faturas
  await executarMigracao(7, 'Criar controle de faturas', async () => {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS faturas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cartao_id INTEGER NOT NULL,
          mes_ano TEXT NOT NULL,
          data_fechamento TEXT NOT NULL,
          data_vencimento TEXT NOT NULL,
          valor_total REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'aberta',
          FOREIGN KEY(cartao_id) REFERENCES cartoes(id)
        );
      `);

      const colunasTransacoes = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transacoes);');
      const nomesTransacoes = new Set(colunasTransacoes.map((c) => c.name.toLowerCase()));

      if (!nomesTransacoes.has('fatura_id')) {
        await db.execAsync('ALTER TABLE transacoes ADD COLUMN fatura_id INTEGER REFERENCES faturas(id);');
      }
    } catch (e) {
      console.warn('Migração 7 falhou:', e);
    }
  });

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
