# 📱 Finanças Offline — App Android de Controle Financeiro Pessoal

Aplicativo de finanças pessoais desenvolvido com **React Native (Expo SDK) + TypeScript**, focado em simplicidade, privacidade e funcionamento **100% offline** (sem internet, sem servidores, sem nuvem — todos os dados são gravados localmente em banco **SQLite** no aparelho).

---

## 🚀 Como testar imediatamente no seu celular Android

Você pode testar o app em tempo real no seu smartphone em menos de 1 minuto:

1. Instale o aplicativo gratuito **Expo Go** na Google Play Store no seu celular Android.
2. No terminal do computador, dentro da pasta do projeto, execute:
   ```bash
   npx expo start
   ```
3. Um QR Code aparecerá no terminal. Abra o aplicativo **Expo Go** no celular e escaneie o QR Code.
4. O app será carregado instantaneamente no seu celular, funcionando 100% offline!

---

## 📦 Como gerar o arquivo `.apk` para instalar no Android

Existem duas formas simples de gerar o `.apk`:

### Opção 1: Gerar o APK na Nuvem via EAS Build (Recomendado — Sem precisar instalar Android Studio)
Esta é a melhor opção porque compila o `.apk` direto nos servidores do Expo de forma gratuita e fornece um link direto para baixar o arquivo `.apk` no celular.

1. Instale o EAS CLI (se ainda não tiver):
   ```bash
   npm install -g eas-cli
   ```
2. Faça login na sua conta gratuita do Expo:
   ```bash
   npx eas login
   ```
3. Inicie o build do APK:
   ```bash
   npx eas build -p android --profile preview
   ```
4. Ao finalizar, o terminal exibirá a URL de download direto do arquivo `.apk`. Baixe e instale no seu aparelho!

---

### Opção 2: Gerar o APK Localmente com Gradle
Se você tiver o **Android SDK** instalado no seu computador:

1. Gere o diretório nativo Android:
   ```bash
   npx expo prebuild --platform android
   ```
2. Entre na pasta android e gere o APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. O APK gerado estará em:
   `android/app/build/outputs/apk/release/app-release.apk`

---

## ✨ Funcionalidades Implementadas

### 1. ⚡ Lançamento Ultrarrápido (2 a 3 toques)
- **Botão de Ação Flutuante (FAB)** sempre visível para adicionar lançamentos com 1 toque.
- **Teclado numérico com foco imediato** ao abrir a tela de lançamento.
- Formatação monetária em tempo real (R$).
- Alternância rápida entre **Despesa** e **Receita**.
- **Criação de categoria nova direto no fluxo**, sem fechar nem perder os dados digitados.
- Botões de data rápida: **Hoje** e **Ontem**.
- Opção de **Duplicar lançamentos recentes** para despesas ou receitas recorrentes com 1 clique.

### 2. 🗂️ Categorias ("Departamentos") Totalmente Flexíveis
- Já vem com categorias padrão: *Alimentação, Transporte, Moradia, Lazer, Saúde, Salário/Renda, Outros*.
- Cada categoria possui **nome, ícone vetorial e cor**.
- **Mesclar Categorias**: transfere automaticamente todos os lançamentos históricos de uma categoria para outra.
- **Exclusão Segura**: ao excluir, transfere automaticamente os lançamentos para não quebrar nem perder o histórico.

### 3. 📜 Histórico Completo & Agrupamento Cronológico
- Lançamentos agrupados por **Dia**, com total diário calculado.
- **Busca por texto em tempo real** (filtra por descrição ou categoria).
- Filtros dinâmicos por **Tipo (Todos, Despesas, Receitas)** e por **Categoria**.
- Ações rápidas em cada item: **Editar**, **Duplicar** e **Excluir com confirmação**.

### 4. 🔍 Análise & Diagnóstico ("Onde estou sangrando")
- **Diagnóstico em Destaque**: Identifica explicitamente a categoria número 1 que mais está drenando seu dinheiro no mês.
- **Comparação com o Mês Anterior**: Indica se os gastos na categoria cresceram (+%) ou diminuíram (-%).
- **Gráfico de Rosca (Donut Chart)** em SVG vetorial leve e interativo com percentuais de gastos.
- **Ranking com Barras de Progresso** ordenado do maior para o menor gasto.
- Resumo do mês: **Total de Receitas, Total de Despesas, Saldo Líquido e Taxa de Economia**.

### 5. 📑 Importação & Conciliação de Extratos Bancários (OFX e CSV)
- Importa arquivos `.ofx` e `.csv` de qualquer banco (Nubank, Inter, Itaú, Bradesco, Santander, etc.) direto do armazenamento do aparelho.
- **Algoritmo de Conciliação Inteligente**:
  - Compara os registros do extrato com o que já foi lançado manualmente por valor e proximidade de data (+/- 3 dias de compensação).
  - Marca como **"Já conciliado"** o que já existe no banco (para não duplicar).
  - Marca como **"Pendente"** novos lançamentos.
- **Autocategorização por Inteligência de Palavras-Chave**:
  - Detecta automaticamente nomes de estabelecimentos (ex: *Uber -> Transporte*, *iFood -> Alimentação*, *Drogasil -> Saúde*, *Shell -> Transporte*, *Netflix -> Lazer*).
- **Revisão em Lote**:
  - Visualize todos os itens antes de salvar.
  - Selecione ou desmarque itens em lote.
  - Altere a categoria sugerida com um toque.
  - Confirme a gravação em massa no SQLite em frações de segundo.

### 6. 🔒 100% Offline & Privacidade Absoluta
- **Zero chamadas de rede**: O aplicativo nem sequer solicita a permissão `android.permission.INTERNET` no AndroidManifest (`blockedPermissions` configurado).
- **Banco de Dados SQLite Local** com tabelas indexadas, transações atômicas e modo WAL.
- **Backup Manual**:
  - Gera um arquivo `.json` com todas as suas categorias e transações.
  - Permite salvar na memória do aparelho, Google Drive local ou compartilhar de forma nativa.
  - Restauração de backup atômica e segura.
- Suporte a **Modo Escuro (Dark Mode)**, Modo Claro ou Seguir o Sistema.

---

## 📁 Arquivos de Teste Inclusos
Dentro da pasta `assets/`, você encontrará dois arquivos reais para testar a conciliação bancária:
- `assets/amostra_extrato.ofx`
- `assets/amostra_extrato.csv`

---

## 🛠️ Tecnologias Utilizadas
- **React Native 0.86 & Expo SDK 57**
- **TypeScript 5+**
- **expo-sqlite** (SQLite nativo compilado em C via JSI)
- **expo-document-picker** (Seletor de arquivos do dispositivo)
- **expo-file-system & expo-sharing** (Armazenamento e backup local)
- **react-native-svg** (Gráficos vetoriais de rosca e barras)
- **@expo/vector-icons** (Ionicons)
