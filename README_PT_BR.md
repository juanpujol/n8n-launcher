# N8N Launcher

[🇺🇸 English](README.md) | [🇪🇸 Español](README_ES.md)

Uma aplicação desktop multiplataforma para iniciar facilmente sua instância local do N8N. Este launcher fornece uma interface amigável para gerenciamento do ciclo de vida de contêineres Docker, monitoramento de status e visualização de logs para uma stack completa do N8N.

![Screenshot do N8N Launcher](app-print.jpg)

## 🐳 Pré-requisitos

**O Docker Desktop deve estar instalado e rodando** em sua máquina antes de usar o N8N Launcher. A aplicação gerencia o N8N através de contêineres Docker.

- **Baixar Docker Desktop**: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Certifique-se de que o Docker esteja rodando** antes de executar o N8N Launcher

## ⚠️ Aviso Importante de Segurança

**O N8N Launcher é um protótipo simples construído sem certificados oficiais de assinatura de código da Apple ou Microsoft.** Isso significa que seu sistema operacional mostrará avisos de segurança quando você executar a aplicação pela primeira vez.

### 🍎 Instalação no macOS

1. **Baixe e abra o arquivo .dmg**
2. **Arraste o N8N Launcher para a pasta Aplicativos**
3. **Quando executar o app pela primeira vez**, o macOS mostrará: *"N8N Launcher não pode ser aberto porque é de um desenvolvedor não identificado"*
4. **Para autorizar o app:**
   - Vá para **Preferências do Sistema** → **Segurança e Privacidade** → **Geral**
   - Você verá uma mensagem sobre o N8N Launcher sendo bloqueado
   - Clique em **"Abrir Mesmo Assim"**
   - Confirme clicando em **"Abrir"** no diálogo

### 🪟 Instalação no Windows

1. **Baixe e execute o instalador .msi**
2. **O Windows pode mostrar**: *"O Windows protegeu seu PC"* ou *"Editor desconhecido"*
3. **Para autorizar o app:**
   - Clique em **"Mais informações"** no diálogo do Windows Defender SmartScreen
   - Clique em **"Executar mesmo assim"**
   - Complete a instalação normalmente

> **Por que isso acontece:** Como esta é uma aplicação protótipo, eu não comprei certificados caros de assinatura de código da Apple ou Microsoft. O app é completamente seguro de usar - seu SO está apenas sendo cauteloso sobre aplicações não assinadas.

## 📥 Download

Baixe a versão mais recente do N8N Launcher para sua plataforma:

| Plataforma | Download |
|------------|----------|
| 🍎 **macOS** | [Baixar para macOS](https://github.com/juanpujol/n8n-launcher/releases/download/v0.1.3/n8n-launcher_0.1.3_aarch64.dmg) |
| 🪟 **Windows** | [Baixar para Windows](https://github.com/juanpujol/n8n-launcher/releases/download/v0.1.3/n8n-launcher_0.1.3_x64_en-US.msi) |

> 💡 **Dica**: Para as versões mais recentes e todos os formatos disponíveis, visite nossa [página de Releases](https://github.com/juanpujol/n8n-launcher/releases).

## Recursos

- 🐳 **Gerenciamento Docker**: Iniciar/parar stack N8N com PostgreSQL, Redis e serviços N8N
- 📊 **Monitoramento de Status**: Verificação de status de contêineres Docker em tempo real
- 📝 **Visualização de Logs**: Ver logs dos contêineres N8N diretamente no app
- 🖥️ **Multiplataforma**: Suporta macOS (Intel/Apple Silicon) e Windows
- 🔒 **Seguro**: Acesso restrito ao shell com capacidades Tauri
- ⚡ **Rápido**: Construído com backend Rust e frontend React

## Pré-requisitos

- **Docker Desktop** deve estar instalado e rodando
- **Bun** runtime para desenvolvimento

## Instalação

### A partir dos Releases
Baixe a versão mais recente para sua plataforma:
- **macOS**: Baixe o arquivo `.dmg` ou `.zip` contendo o bundle `.app`
- **Windows**: Baixe o instalador `.msi` ou a versão portável `.exe`

### Configuração de Desenvolvimento

1. Clone o repositório:
```bash
git clone <repository-url>
cd pocket-n8n
```

2. Instale as dependências:
```bash
bun install
```

## Desenvolvimento

### Desenvolvimento Frontend
```bash
# Iniciar servidor de desenvolvimento Vite (porta 5173)
bun run dev

# Construir frontend para produção
bun run build

# Visualizar build de produção
bun run preview
```

### Desenvolvimento Tauri
```bash
# Iniciar app Tauri em modo desenvolvimento (inclui hot reload do frontend)
bun run tauri:dev

# Construir app Tauri para produção/distribuição
bun run tauri:build
```

### Builds Específicos por Plataforma
```bash
# Construir para macOS Apple Silicon
bun run tauri:build:mac

# Construir para macOS Intel
bun run tauri:build:mac-intel

# Compilação cruzada para Windows/Linux não suportada localmente
# Use o workflow do GitHub Actions para builds multiplataforma
```

### Formatação de Código
```bash
# Formatar código com Biome
bun run lint
```

## Arquitetura

### Stack Tecnológico
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Estilos**: Tailwind CSS + componentes Radix UI
- **Build**: Bundler Tauri para empacotamento de app nativo

### Stack Docker
A aplicação gerencia um ambiente N8N completo com:
- **PostgreSQL 16**: Banco de dados com verificações de saúde
- **Redis 7**: Gerenciamento de filas com autenticação
- **N8N Editor**: Interface principal (porta 5678)
- **N8N Webhook**: Processador dedicado de webhooks
- **N8N Worker**: Processador de jobs em background

### Segurança
- Acesso ao shell restrito a comandos Docker específicos via capacidades Tauri
- Assinatura de código ad-hoc habilitada para builds macOS
- Sem acesso direto ao sistema de arquivos além das permissões configuradas

## Uso

1. **Execute o app** - O N8N Launcher iniciará com uma interface limpa
2. **Verifique o status do Docker** - O app verifica se o Docker está instalado e rodando
3. **Inicie o N8N** - Clique para iniciar a stack completa do N8N via Docker Compose
4. **Monitore o status** - Veja status de contêineres e logs em tempo real
5. **Acesse o N8N** - Abra a interface web do N8N em `http://localhost:5678`
6. **Pare quando terminar** - Pare todos os contêineres de forma limpa quando finalizar

## Configuração

### Variáveis de Ambiente
A stack Docker suporta personalização via variáveis de ambiente:
- `N8N_PORT`, `N8N_HOST`, `N8N_PROTOCOL` - Configuração de URL
- `DB_POSTGRESDB_*` - Credenciais do banco de dados
- `QUEUE_BULL_REDIS_PASSWORD` - Autenticação do Redis
- `EXECUTIONS_DATA_MAX_AGE`, `EXECUTIONS_DATA_PRUNE_MAX_COUNT` - Limites de execução

### Configuração do N8N
- Porta padrão: 5678 (configurável via N8N_PORT)
- Execução baseada em filas com suporte Redis
- PostgreSQL para armazenamento persistente de dados
- Limpeza automática de dados (idade máxima de 168 horas, limite de 1000 execuções)
- Volume compartilhado para persistência de dados entre reinicializações de contêiner

## Contribuindo

Este projeto usa:
- **Bun** para gerenciamento de pacotes e execução de scripts
- **Biome** para formatação e linting de código
- **GitHub Actions** para builds e releases automatizados

## Construindo Releases

Os releases são automatizados via GitHub Actions. Para criar um novo release:

1. Use o workflow "Cross-Platform Release" no GitHub Actions
2. Escolha o tipo de incremento de versão (patch/minor/major) ou especifique versão customizada
3. O workflow irá:
   - Atualizar versão em todos os arquivos relevantes
   - Criar tag git
   - Construir para todas as plataformas
   - Criar release no GitHub com changelog
   - Upload de artefatos específicos por plataforma

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.