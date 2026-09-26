# 📋 Histórico de Versões (Changelog)

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.4.0] - 2026-09-26

### 🛡️ Correção Crítica de Inicialização & Migração SQLite
- **Resolução do erro `no such column: pago`**: Corrigida a ordem de execução no `inicializarBanco`. A criação de índices (`idx_transacoes_pago`, `idx_transacoes_grupo`) agora só é executada após a garantia de que as colunas já foram adicionadas via migração com `PRAGMA table_info`, eliminando qualquer falha ao sobrescrever o APK em aparelhos com bancos de versões legadas.
- **Normalização de Dados Antigos**: Script de saneamento automático preenche registros existentes que possuíam valores nulos antes da introdução dos novos campos.

### ⚡ Otimizações Full Stack de Performance
- **Conciliação Bancária em Lote (Memória)**: Substituição de consultas individuais $O(N)$ em loop por uma única consulta rápida por janela de datas (`listarPorIntervaloDatas`). O matching agora ocorre em memória RAM, acelerando a importação de extratos OFX/CSV em mais de 100x.
- **Status Inteligente de Contas Fixas**: Despesas recorrentes mensais automáticas agora nascem como "Pendentes" (`pago: 0`) se o vencimento for para o dia de hoje ou futuro, alimentando perfeitamente o card "Contas a Pagar" na tela inicial.

### ✨ Novas Funcionalidades de Alta Utilidade
- **Chips Rápidos de Descrição**: Ao selecionar uma categoria no modal de lançamento, o app sugere os termos mais comuns (ex: *Supermercado*, *Padaria*, *Combustível*, *Uber*, *Aluguel*, *Farmácia*), permitindo preencher a descrição com apenas 1 toque sem precisar digitar no teclado.
- **Exportação de Planilha Excel / CSV**: Botão nativo nas Configurações para exportar todos os lançamentos para um arquivo `.csv` formatado em padrão brasileiro (ponto e vírgula como separador e codificação UTF-8 BOM), pronto para abrir no Excel, Planilhas Google ou arquivar para o Imposto de Renda.
- **Visão Anual Consolidada no Analytics**: Alternador na tela de Análise entre "Visão Mensal" e "Visão Anual", exibindo entradas anuais, saídas anuais, saldo acumulado e taxa média de poupança no ano todo.
- **Limpeza de Dados de Teste**: Opção em Configurações para zerar lançamentos de teste mantendo categorias, metas e contas fixas preservadas.
- **Badges de Classificação em Categorias**: Exibição da etiqueta visual "Essencial" ou "Estilo de Vida" diretamente no card de cada categoria, além da padronização do teto com formatação de moeda brasileira.

---

## [1.3.0] - 2026-09-25

### ✨ Novidades
- **Diagnóstico 50/30/20 (Essencial vs Estilo de Vida)**: Painel comparativo analisando gastos essenciais (moradia, alimentação básica, saúde) vs estilo de vida (lazer, delivery, compras), com dicas práticas de saúde financeira.
- **Renda Futura Comprometida (Próximos 6 Meses)**: Projeção mês a mês consolidando parcelas a vencer e despesas fixas recorrentes para você saber exatamente quanto do seu salário futuro já está sequestrado.
- **Meta Diária Segura de Gastos (Burn Rate)**: Indicador dinâmico na tela inicial calculando quanto você pode gastar por dia até o dia 30 para fechar o mês no azul.
- **Classificação Financeira no Cadastro de Categorias**: Seleção entre "Essencial" e "Estilo de Vida".
- **Script de Automação de Versões**: Comandos `npm run release:patch`, `npm run release:minor` e `npm run release:major` para automatizar o ciclo de releases.

### 🔧 Ajustes Técnicos
- Atualização do `versionCode` para `3` no `app.json`.

---

## [1.2.0] - 2026-09-25

### ✨ Novidades
- **Status "Pago" vs "Pendente"**: Lançamento de contas futuras marcadas como pendentes (boletos a vencer, internet, aluguel).
- **Ação Rápida de 1 Toque**: Marque uma conta como "Paga" diretamente no histórico ou na tela inicial tocando no ícone do item.
- **Duplo Saldo no Painel**: 
  - **Saldo em Caixa Hoje (Realizado)**: Considera apenas o que já entrou ou saiu de fato da conta.
  - **Previsão no Fim do Mês (Projetado)**: Saldo estimado após pagar todas as pendências do mês.
- **Card "Contas a Pagar no Mês"**: Resumo com contador de contas e valor total a vencer.
- **Filtro de Status no Histórico**: Filtros rápidos para "Todos", "Somente Pagos" e "Somente Pendentes".
- **Seletor de Data Livre**: Botões rápidos de dias do mês (1, 5, 10, 15, 20, 25, 28, 30) e digitação de qualquer data `DD/MM/AAAA`.

### 🛡️ Blindagens e Correções Estruturais
- **Backup & Restauração Completa**: Atualizado para incluir tetos mensais, parcelamentos, status pago, lançamentos recorrentes e configurações locais.
- **Blindagem Decimal**: Cálculos financeiros com arredondamento explícito em 2 casas para eliminar resíduos de ponto flutuante (`IEEE 754`).
- **Padronização de Fusos Horários**: Eliminação de chamadas UTC que podiam antecipar a data no período noturno (21h-23h59).

---

## [1.1.0] - 2026-09-25

### ✨ Novidades
- **Modo Privacidade**: Oculte os valores da tela com 1 toque no ícone de "olho" no topo da Home (`R$ •••••`).
- **Bloqueio por Biometria / Digital**: Proteção de acesso nativa via impressão digital, reconhecimento facial ou PIN do aparelho (`expo-local-authentication`).
- **Lançamentos Fixos Recorrentes**: Cadastro e processamento automático mensal de contas e rendas fixas (salário, aluguel, assinaturas).
- **Lembretes Locais de Vencimento**: Notificação local às 09:00 no dia de vencimento das contas cadastradas (`expo-notifications`), 100% offline.
- **Feedback Tátil (Haptics)**: Vibrações táteis sutis nas trocas de abas, toques em botões e confirmações (`expo-haptics`).
- **Compras Parceladas**: Lançamentos em até 24x com geração automática mês a mês e exclusão individual ou em lote.
- **Limite de Gastos Mensal por Categoria**: Tetos de gastos com barras visuais (verde, amarelo e vermelho) e cartão de alerta de estouro na tela inicial.

---

## [1.0.0] - 2026-09-25

### ✨ Versão Inicial (MVP)
- **100% Offline & Sem Internet**: Bloqueio total de permissões de rede no Android.
- **Banco de Dados SQLite Local**: Armazenamento local rápido e seguro com suporte a transações atômicas e WAL.
- **Lançamento Rápido**: Teclado numérico com foco automático, criação de categorias na hora e seleção Hoje/Ontem.
- **Categorias Flexíveis**: Cores, ícones, mesclagem e exclusão segura com transferência de registros.
- **Histórico Cronológico**: Agrupado por dia, filtros por tipo, busca em tempo real e ações de editar/duplicar.
- **Diagnóstico Financeiro**: Gráfico de rosca SVG, identificação do ponto de sangria e comparação com o mês anterior.
- **Importação de Extratos (OFX e CSV)**: Conciliação inteligente anti-duplicidade e autocategorização por palavras-chave.
- **Backup e Restauração**: Exportação e importação manual em arquivo JSON via compartilhamento local.
- **Tema Escuro e Claro**: Modo escuro nativo, modo claro e sincronização com o sistema operacional.
