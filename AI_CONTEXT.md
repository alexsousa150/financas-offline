# AppFinança - Contexto Arquitetural para IA

Este documento serve como um mapa condensado do projeto. Ele foi gerado para que qualquer agente de IA entenda rapidamente a stack, arquitetura, esquema do banco de dados e regras de negócio críticas do sistema, poupando tokens e evitando a quebra de paradigmas já consolidados.

## 1. Stack Tecnológica
- **Framework:** React Native via Expo (versão recente)
- **Linguagem:** TypeScript
- **Roteamento:** Expo Router (file-based routing em `src/app/`)
- **Persistência:** SQLite Local (`expo-sqlite`)
- **Estilos:** `StyleSheet` nativo combinado com um Tema Dinâmico via Contexto.

## 2. Padrões de Arquitetura
- **Offline-First:** O app não se conecta a NENHUMA API externa para as operações diárias. Todos os dados vivem no banco SQLite local.
- **Camada de Repositórios (`src/database/`):** Todo o acesso ao banco de dados foi abstraído em Repositórios (ex: `TransactionsRepository`, `CategoriesRepository`). As Views e Telas **NUNCA** devem executar SQL diretamente.
- **Descentralização de Estado (Evitar OOM):** Para evitar gargalos de memória RAM, o `AppContext` não armazena arrays gigantes (como `transacoes`, `resumoMes` ou `rankingGastos`). Em vez disso, ele provê um `refreshKey` (um inteiro). As telas "assinam" esse `refreshKey` e usam `useEffect` para buscar seus dados localmente chamando os repositórios.
- **Cálculos Pesados na Engine:** O JavaScript NUNCA faz `reduce/map/filter` de milhares de itens na memória. Cálculos como "Total de despesas" e "Regra 50/30/20" são executados nativamente na engine do SQLite via `SUM(CASE WHEN...)` e `GROUP BY` nos repositórios.

## 3. Schema do Banco de Dados (`financas.db`)
O app utiliza um sistema de migrações atômicas em `src/database/db.ts`. Eis as principais tabelas e suas funções:

- **`transacoes`**:
  - Dados básicos: `id`, `valor` (INTEIRO em centavos), `tipo` ('receita' ou 'despesa'), `data`, `descricao`, `conciliado`, `pago` (0=pendente, 1=pago).
  - Vínculos: `categoria_id`, `conta_id`, `cartao_id`, `fatura_id`.
  - Controle de Parcelamentos: `parcela_atual`, `total_parcelas`, `grupo_parcelamento_id` (hash único para agrupar e poder deletar a cadeia inteira).
  - Exclusão Segura: `deleted_at` (Timestamp ou nulo). Todo "delete" é na verdade um UPDATE.
  - Transferências e Fechamentos: `is_transfer` (booleano - 1 indica que a movimentação não deve entrar nos cálculos de despesa, como pagamentos de fatura ou envio entre contas).
- **`categorias`**: Armazena ícones, cores, um `limite_mensal` (orçamentos) e o `tipo_gasto` ('essencial', 'estilo_de_vida', 'poupanca') usado para a regra de diagnóstico financeiro 50/30/20.
- **`contas` e `cartoes`**: Estrutura de múltiplas carteiras.
- **`faturas`**: Agrupa compras de crédito. Possui `status` ('aberta', 'fechada', 'paga').
- **`lancamentos_recorrentes`**: Tabela lida para gerar novas transações automaticamente mês a mês.
- **`regras_categorizacao`**: Usada pelo `reconciliationService` para classificar automaticamente OFXs via regex/aprendizado local.

## 4. Regras de Negócio Críticas (NÃO QUEBRE!)
1. **Precisão Monetária em Centavos:** O SQLite armazena `valor`, `saldo_inicial`, `limite`, `valor_total` APENAS em números inteiros que representam centavos (ex: R$ 10,50 vira `1050`). O módulo `src/utils/formatters.ts` (`formatarMoeda` e `parseMoeda`) é o ÚNICO lugar onde ocorre a divisão/multiplicação por 100. Nunca grave *floats* no banco!
2. **Soft Delete (`deleted_at`):** Nunca faça `DELETE FROM` nas tabelas principais. Sempre faça `UPDATE tabela SET deleted_at = strftime('%s', 'now')`. Todas as consultas (`SELECT`) nos repositórios **DEVEM** incluir a cláusula `WHERE deleted_at IS NULL`.
3. **Pagamento de Fatura de Cartão:** Ao pagar uma fatura, uma transação do tipo 'despesa' é criada debitando o caixa da pessoa, mas **DEVE SER CRIADA** com `is_transfer = 1`. Isso garante que as consultas de "Resumo do Mês" ignorem essa transação para evitar a duplicidade de gastos (a despesa real ocorreu quando o usuário passou o cartão de crédito, não quando ele pagou a fatura).

## 5. Estrutura de Diretórios
- `src/app/` -> Ponto de entrada do Expo Router. Contém as definições de Tabs (`(tabs)`) e Telas Modais. O JSX real é geralmente delegado para `src/screens/` para manter os arquivos de roteamento limpos.
- `src/components/` -> Componentes isolados. Itens de lista pesados como `TransactionItem` utilizam `React.memo` para evitar recálculos visuais pesados.
- `src/context/` -> Estado global: `AppContext` (onde vive a engrenagem do `refreshKey`), `ThemeContext` (Dark/Light mode automatizado), e `ModalContext`.
- `src/database/` -> Ficam as Migrations (`db.ts`) e as classes que encapsulam o CRUD bruto e complexo em SQLite (`TransactionsRepository`, etc).
- `src/screens/` -> Códigos visuais e interativos de cada página (importados dentro do `src/app/`).
- `src/services/` -> Regras de negócio complexas (ex: `creditCardEngine.ts` que manipula os meses de vencimento, e `statementParser.ts` para arquivos de banco externo).
- `src/types/` -> Tipagens TypeScript rigorosas.

## 6. Dicas de Desenvolvimento
- Se você inserir, atualizar ou remover algum dado via repositório, basta chamar `await notificarMudancaDados()` via `useApp()`. Isso muda o `refreshKey` global e notifica todas as telas que elas precisam recarregar as tabelas do banco em background sem engasgar o app.
- Se for criar uma função para listas (FlatList), use `useCallback` nos manipuladores de evento (`onPress`) para não destruir a performance da rolagem na tela.

## 7. Funcionalidades e Layout Fintech Implementados
O sistema possui as seguintes *features* e visual premium 100% offline operacionais:
- **Design System Fintech Dark:** Cores calibradas (`#0D0E11`, `#16181D`, `#1F222A`, `#10B981`), tipografia refinada, sombras sutis e suporte a modo escuro/claro.
- **Navegação em 5 Abas:** `Início`, `Histórico`, `Análises`, `Importar` e `Ajustes` com indicador superior em pílula verde esmeralda no item ativo.
- **Novo Modal de Lançamentos (`TransactionModal.tsx`):** Teclado numérico in-modal ultrarrápido (1-9, C, 0, ⌫), display de valor em tempo real, grid dinâmica em 3 colunas filtrada por tipo (Despesa vs Receita), chips de meio de pagamento, status pago/pendente, compra parcelada e botão de ação fixo no rodapé.
- **Dashboard (Home):** Hero de Saldo Previsto (com saldo realizado em conta e toggle de privacidade de valores), Card de Teto Diário (com barra de progresso e orçamento por dia restante no mês), Carrossel de Atalhos Rápidos (Café, Uber, Almoço, etc.) e FAB circular esmeralda (`+`).
- **Migração 11 (Categorias Fintech):** Semeia categorias completas (Alimentação, Assinaturas, Compras, Contas, Educação, Investimentos, Lazer, Mercado, Moradia, Outros, Poupança, Restaurantes, Saúde, Transporte, Freelance, Salário) com ícones e cores dedicadas.
- **Gestão de Transações:** CRUD completo com suporte a parcelamentos (criados em lote com `grupo_parcelamento_id`), transações recorrentes e soft delete.
- **Múltiplas Contas e Cartões:** Suporte a saldo por conta bancária e gestão de limite de cartão de crédito.
- **Motor de Faturas (Credit Card Engine):** Agrupamento automático de gastos no crédito em Faturas baseadas no dia de fechamento e vencimento. Pagamento de faturas (registradas como `is_transfer = 1` para não duplicar o fluxo de despesa).
- **Importação Bancária (OFX/CSV):** Parser nativo para ler arquivos bancários, validar duplicatas (via `codigo_bancario_hash`) e engine de reconciliação que tenta inferir categorias com base no histórico (`learningRepo`).
- **Análises e Relatórios (Analytics):** Gráficos e painéis processados via SQL (sem gargalo de JS). Inclui: Gráfico de Rosca (Donut), Ranking de Categorias, Diagnóstico 50/30/20 (Essencial, Estilo de Vida, Poupança), Detecção de Anomalias e Projeção de Fluxo de Caixa Futuro.
- **Configurações e Segurança:** Bloqueio por biometria/FaceID (App Lock), modo claro/escuro nativo, exportação manual de Backup (JSON/DB), exportação de extrato CSV e relatório PDF.

