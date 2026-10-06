# Auditoria Técnica e Arquitetural - Sistema Financeiro Offline

**Data da Análise:** Outubro de 2026
**Objetivo:** Especificação técnica e mapeamento de riscos arquiteturais, financeiros e de persistência para refatoração e evolução do sistema.

---

## 1. Compreensão do Sistema

O sistema é um aplicativo de finanças pessoais "offline-first", projetado para funcionar inteiramente sem dependência de internet para suas operações principais.

**Stack Tecnológica e Arquitetura Atual:**
*   **Framework:** React Native com Expo.
*   **Roteamento:** Expo Router (`src/app/`).
*   **Linguagem:** TypeScript.
*   **Banco de Dados:** SQLite (`expo-sqlite`).
*   **Gerenciamento de Estado:** React Context API (fortemente centralizado no `AppContext`).
*   **Persistência/ORM:** Camada de repositórios customizada com queries SQL raw.
*   **Estrutura de Pastas:** Padrão modular simplificado (`src/components`, `src/screens`, `src/database`, `src/services`, `src/context`, `src/types`, `src/hooks`).
*   **Estratégia Offline:** 100% dos dados residem no SQLite local.
*   **Estratégia de Backup:** Exportação/Importação manual em formato JSON.

**Fluxo de Funcionamento:**
A inicialização do aplicativo invoca migrações de banco de dados e carrega o estado global no `AppContext`. Todas as telas consomem este contexto. A gravação de dados ocorre através de repositórios, que por sua vez sinalizam ao `AppContext` para recarregar as tabelas inteiras para a memória e forçar a re-renderização (ex: `notificarMudancaDados`). Regras de negócio estão majoritariamente nos Repositórios e Serviços (como `creditCardEngine`), mas com vazamento significativo de lógica para a UI e Contexto.

---

## 2. Mapeamento Funcional

| Módulo | Situação | Observações |
| :--- | :--- | :--- |
| **Dashboard (Home)** | Implementado | Funcional, mas sofre re-renders desnecessários pelo estado global. |
| **Contas (Múltiplas)** | Parcial | Migração de DB e UI básicas feitas. Faltam integrações complexas (transferências entre contas). |
| **Cartões de Crédito** | Implementado | Estrutura de DB criada. |
| **Faturas** | Implementado | `creditCardEngine` agrupa transações. Pagamento de fatura implementado como "pseudo-despesa". |
| **Transações (Lançamentos)** | Implementado | CRUD completo. Suporta parcelamentos, mas a lógica de geração de parcelas futuras mistura apresentação e dados. |
| **Categorias** | Implementado | CRUD completo. Possui categorização automática (`autoCategories.ts`). |
| **Transações Recorrentes** | Implementado | `recurringRepo` gera transações mês a mês baseadas na data de abertura do app. |
| **Importação (OFX/CSV)** | Parcial | Parser implementado. Necessário reforçar hash único (`codigo_bancario_hash`) para evitar duplicidade. |
| **Relatórios / Gráficos** | Implementado | AnalyticsScreen lê do Contexto, com alto processamento na thread de UI. |
| **Backup / Restauração** | Problemático | Geração de JSON em memória pode dar crash (OOM) com banco de dados grande. |
| **Segurança / Biometria** | Implementado | `BiometricLockScreen` protege a entrada. |

---

## 3. Auditoria da Arquitetura

### 3.1. Estado Global Centralizado (God Object)
*   **Problema:** `AppContext` carrega todas as transações, categorias, contas, cartões e faturas para arrays na memória. Toda vez que um registro é alterado, `notificarMudancaDados` recarrega *tudo* e re-renderiza o app.
*   **Por que é um problema:** Causa gargalos de CPU e memória. À medida que o usuário acumular meses de dados, a navegação ficará travada (frame drops).
*   **Impacto:** Má UX, consumo de bateria, lentidão extrema a longo prazo.
*   **Solução Recomendada:** Adotar paginação real nas listagens e Queries Locais (ex: `TanStack Query` ou Zustand) no lugar de um Contexto gigante. A tela deve buscar apenas os dados do mês/conta ativa diretamente do SQLite, sem passar por um estado intermediário gigante.

### 3.2. Acoplamento de Domínio, Repositório e Contexto
*   **Problema:** O AppContext atua como banco de dados em memória e controlador. A UI chama funções do contexto, que chamam o repositório. Lógicas como o particionamento de parcelas estão na UI (`TransactionModal`).
*   **Por que é um problema:** Dificulta testes unitários das regras financeiras e espalha a responsabilidade.
*   **Solução Recomendada:** Extrair toda regra de negócio (criação de transação parcelada, conciliação, estorno) para um padrão de *Use Cases* ou *Services* puros.

### 3.3. Injeção Direta de Lógica de UI (Code Duplication / Fat Components)
*   **Problema:** `HomeScreen` e `AnalyticsScreen` realizam cálculos de soma, filtragem de faturas e processamento de arrays pesados (reduce) na renderização.
*   **Solução Recomendada:** Mover esses cálculos para queries SQL específicas. O banco SQLite é muito mais rápido para sumarizar dados (ex: `obterResumoMes` já faz isso em parte, mas a UI faz processamento adicional).

---

## 4. Auditoria do Banco de Dados

### 4.1. Tipos de Dados Monetários (Ponto Crítico)
*   **Problema:** A coluna `valor` na tabela `transacoes` (e `faturas`, `cartoes.limite`, etc.) usa o tipo `REAL` no SQLite.
*   **Por que é um problema:** Tipos de ponto flutuante (`float`/`double`) sofrem perda de precisão. Ex: `0.1 + 0.2 = 0.30000000000000004`. Em acumulações financeiras (relatórios anuais), isso gera inconsistências de centavos.
*   **Impacto:** Perda de confiança do usuário; saldos errados.
*   **Solução Recomendada:** Mudar o armazenamento para `INTEGER` representando centavos (ex: R$ 10,50 vira `1050`). O frontend formata dividindo por 100 ao exibir. (Exige script de migração para multiplicar valores atuais por 100).

### 4.2. Deleção Física (Hard Delete)
*   **Problema:** O sistema usa `DELETE FROM transacoes`.
*   **Por que é um problema:** Impossibilita trilhas de auditoria, lixeiras, desfazimento (undo), e dificulta imensamente uma futura sincronização em nuvem (como você enviará a instrução "registro deletado" para a nuvem se ele não existe mais?).
*   **Solução Recomendada:** Adicionar coluna `deleted_at INTEGER` (Unix timestamp) e implementar Soft Delete (atualizar queries para `WHERE deleted_at IS NULL`).

### 4.3. Integridade Referencial Híbrida
*   **Problema:** O SQLite no React Native nem sempre tem as `PRAGMA foreign_keys = ON` ativadas por padrão em todas as transações, o que pode permitir deletar uma Categoria que possui transações vinculadas.
*   **Solução:** Garantir a restrição `ON DELETE RESTRICT` nas FKs e forçar ativação de PRAGMA.

---

## 5. Auditoria das Regras Financeiras

### 5.1. Duplicidade de Despesas no Fechamento de Fatura (Risco Mitigado, Mas Frágil)
*   **Situação:** Quando o usuário paga a fatura, cria-se uma despesa com `forma_pagamento = 'pagamento_fatura'`. A query `obterResumoMes` exclui explicitamente essa "forma de pagamento" do total de despesas (para não dobrar com a compra original) mas a inclui no cálculo de `saldoRealizado`.
*   **Por que é um problema:** A regra de negócio financeira foi atrelada a uma string mágica de "forma de pagamento". Se em outro lugar (ex: tela de relatórios, `AnalyticsScreen`, extrato) o desenvolvedor esquecer de fazer esse `IF`, a despesa aparecerá duplicada no fluxo de caixa.
*   **Impacto:** Inconsistência nos gráficos e dashboards dependendo de quem faz a query.
*   **Solução Recomendada:** "Pagamento de Fatura" deve ser modelado como uma **Transferência** (saída da Conta Corrente -> entrada na Fatura), ou a transação deve ter um subtipo estrutural (ex: `is_transfer = 1`), ignorado permanentemente nos cálculos de "Despesa/Receita".

### 5.2. Parcelamentos (Sem Amarração Forte)
*   **Problema:** As parcelas são criadas soltas (vários INSERTs com descrições concatenadas "1/3", "2/3"). Se o usuário errou e quiser excluir a compra, precisa excluir manualmente cada parcela, ou o sistema faz uma exclusão cega por nome/dia.
*   **Solução Recomendada:** Criar uma entidade (tabela) `compras_parceladas (id, descricao, valor_total, qtde_parcelas)` e adicionar `compra_parcelada_id` nas `transacoes`. A alteração ou cancelamento de uma afeta as demais com precisão matemática.

---

## 6. Cenários Extremos (Perda de Dados e Regressões)

*   **OOM no Backup:** O `backupRepo.ts` extrai todas as tabelas e transforma em uma string JSON `JSON.stringify()`. Quando o banco tiver 10.000 transações, isso estourará a memória do app (limites da engine do JS-Core no mobile).
    *   **Solução:** Fazer streaming do JSON ou usar cópia direta do arquivo `.db` do SQLite para o sistema de arquivos via `expo-file-system`.
*   **Geração Infinita de Recorrências:** O `recurringRepo.ts` roda no início do app e insere transações para meses futuros se não existirem. Se houver um bug na validação de data, ele pode gerar recorrências infinitamente e travar o app na inicialização (Infinite Loop).
*   **Inconsistência de Fuso Horário:** Datas armazenadas como strings ou baseadas no locale local (`new Date()`). Se o usuário viaja de país, lançamentos agendados para a meia-noite podem mudar de dia, corrompendo a organização mensal. Armazenar UTC (ISO-8601) e processar fuso apenas na view.

---

## 7. Backup, Restauração e Retenção

*   **Vulnerabilidade:** Restaurar um backup (JSON) apaga o banco atual (`db.execAsync(...)` com DROP TABLES). Se o JSON for inválido, corrompido, ou a migração falhar no meio do processo, o usuário perde os dados antigos E os dados novos não são inseridos.
*   **Mitigação (Plano de Resiliência):**
    1. A Restauração deve gerar um arquivo cópia (ex: `database_backup_temp.db`).
    2. Realizar os testes no arquivo temporário.
    3. Somente se tudo estiver íntegro, renomear o arquivo original para `.old` e assumir o novo. (Swap de arquivos atômico).

---

## 8. Estratégia de Implementação e Correção (Para o Agente Desenvolvedor)

Esta etapa orienta as modificações estruturais que devem ser feitas no código.

**Fase 1: Infraestrutura de Banco e Tipos (Segurança de Dados)**
1.  **Refatoração Monetária:** Adicionar script de migração (Migração 8) para multiplicar todos os valores (`transacoes.valor`, `cartoes.limite`, `faturas.valor_total`, `contas.saldo_inicial`) por 100. Alterar lógica de apresentação no `formatters.ts` para exibir `valor / 100`.
2.  **Soft Delete:** Adicionar `deleted_at INTEGER` a todas as tabelas principais. Atualizar todos os métodos `delete` dos Repositórios para fazer `UPDATE deleted_at = X`. Atualizar `get`, `buscarPor...` para `WHERE deleted_at IS NULL`.
3.  **Backup Seguro:** Alterar `backupRepo.ts` para exportar diretamente o binário `.db` através do `expo-file-system` ou paginar o JSON limitando chunks, removendo o gargalo de memória.

**Fase 2: Arquitetura e Performance**
1.  **Descentralização do Estado:** Remover os arrays estáticos do `AppContext`. Substituir a abordagem para que as telas consigam "Assinar" (subscribe) eventos do banco e usar paginação (ex: carregar histórico sob demanda usando FlatList).
2.  **Encapsular Faturas:** Implementar lógica de Transferência. O pagamento de fatura deve debitar a Conta Bancária X e creditar a "Conta Fatura", deixando de ser categorizada perigosamente como uma "despesa" baseada em string de pagamento.

**Fase 3: UX e Validações**
1.  **ID Pai para Parcelamentos:** Adicionar `parent_id` (auto-relacionamento na tabela transacoes) ou nova tabela para agrupar as parcelas, refazendo o `TransactionModal` para excluir a cadeia inteira caso solicitado.
2.  **Performance em Relatórios:** Mover os cálculos do `AnalyticsScreen` para consultas SQL (`GROUP BY`, `SUM`) no repositório. O JS não deve percorrer milhares de itens calculando agrupamentos.

---

## 9. Plano de Rollback

Como qualquer mudança de esquema de banco de dados offline é crítica, as migrações exigem segurança dupla:
1.  **Snapshot Pré-Migração:** Antes de invocar o `executarMigracao` na versão com o valor em Centavos (x100), o sistema DEVE fazer uma cópia automática do arquivo `.db` atual (`financas.db` -> `financas.backup_pre_migracao_8.db`).
2.  **Tratamento de Falhas:** Se `try/catch` falhar durante a conversão dos centavos, restaurar silenciosamente o `financas.backup_pre_migracao_8.db` para que o usuário não abra o app vazio ou com saldos bizarros.

---

## 10. Checklist de Validação (Pós-Implementação)

O Agente encarregado de implementar deve verificar obrigatoriamente:
- [ ] Ao salvar valor de R$ 10,50, o console exibe gravação de `1050` no banco e UI exibe `R$ 10,50`.
- [ ] O cálculo de Saldo (Receitas - Despesas) não sofre discrepâncias.
- [ ] Pagamento de Fatura debita da conta corrente corretamente, zera a fatura, mas NÃO aparece duplicado no gráfico de despesas (Analytics).
- [ ] Exportação de Backup gera arquivo final e, na simulação de arquivo com 50MB, não ocorre crash por OOM.
- [ ] Excluir uma transação a oculta da tela (Soft Delete), mas o registro permanece auditável via CLI no banco.
- [ ] Scroll rápido na tela de histórico de um mês não causa warnings de renderização ou lentidão (sinal de sucesso na retirada de lógica de repetição e melhoria de contexto).
- [ ] Criar parcelamento de 3 vezes permite, através de longo toque em uma das parcelas, escolher "Excluir todas as futuras".
