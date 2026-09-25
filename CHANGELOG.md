# 📋 Histórico de Versões (Changelog)

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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

### 🔧 Ajustes Técnicos
- Atualização do `versionCode` no `app.json` para `2` para permitir atualização direta do APK no Android.
- Adição dos plugins nativos de notificação e autenticação local no `app.json`.

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
