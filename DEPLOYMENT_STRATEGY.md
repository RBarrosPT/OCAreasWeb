# Estratégia de Deployment - OCMapas

## Visão Geral
Sistema com 3 ambientes separados usando Git branching e Docker:
- **`develop`** → Ambiente de Desenvolvimento
- **`staging`** → Ambiente de Testes
- **`main`** → Ambiente de Produção

---

## 1. Git Branching Strategy (Git Flow)

### Branch Principal
```
main (produção)
 ↑
 └─ tagged com versões (v1.0.0, v1.1.0, etc.)
```

### Branch de Desenvolvimento
```
develop (integração contínua)
 ├─ feature/nova-funcionalidade
 ├─ feature/melhorias
 └─ ...
```

### Workflow de Features
```bash
# 1. Criar feature branch a partir de develop
git checkout develop
git pull origin develop
git checkout -b feature/minha-feature

# 2. Desenvolver e fazer commits
git add .
git commit -m "feat: adicionar nova funcionalidade"

# 3. Push para repositório
git push origin feature/minha-feature

# 4. Criar Pull Request para develop
# (No GitHub) → Verificar testes automáticos

# 5. Merge em develop após aprovação
git checkout develop
git pull origin develop
git merge --no-ff feature/minha-feature
git push origin develop
```

### Workflow de Release
```bash
# 1. Criar release branch a partir de develop
git checkout develop
git pull origin develop
git checkout -b release/1.1.0

# 2. Atualizar package.json com nova versão
# Editar: package.json → "version": "1.1.0"
git add package.json
git commit -m "chore: bump version to 1.1.0"

# 3. Push para staging (testes)
git push origin release/1.1.0

# 4. Após testes bem-sucedidos, merge para main
git checkout main
git pull origin main
git merge --no-ff release/1.1.0
git tag -a v1.1.0 -m "Release versão 1.1.0"
git push origin main
git push origin v1.1.0

# 5. Merge também volta para develop
git checkout develop
git pull origin develop
git merge --no-ff release/1.1.0
git push origin develop

# 6. Deletar release branch
git branch -d release/1.1.0
git push origin --delete release/1.1.0
```

---

## 2. Docker Environments

### Arquivo `.env.development` (Desenvolvimento)
```env
NODE_ENV=development
APP_HOST_PORT=8091
ADMINER_HOST_PORT=8081
POSTGRES_DB=ocmapas_dev
POSTGRES_USER=ocmapas_dev
POSTGRES_PASSWORD=dev_password_123
BUILD_VERSION=dev
```

### Arquivo `.env.staging` (Testes)
```env
NODE_ENV=staging
APP_HOST_PORT=8092
ADMINER_HOST_PORT=8082
POSTGRES_DB=ocmapas_staging
POSTGRES_USER=ocmapas_staging
POSTGRES_PASSWORD=staging_password_456
BUILD_VERSION=staging-$(date +%Y%m%d-%H%M%S)
```

### Arquivo `.env.production` (Produção)
```env
NODE_ENV=production
APP_HOST_PORT=8090
ADMINER_HOST_PORT=
POSTGRES_DB=ocmapas_prod
POSTGRES_USER=ocmapas_prod
POSTGRES_PASSWORD=prod_secure_password_789
BUILD_VERSION=1.0.0
```

### Arquivo `docker-compose.override.yml` (Desenvolvimento Local)
```yaml
# Este arquivo é carregado automaticamente em desenvolvimento local
# Permite sobrescrever configurações do docker-compose.yml
services:
  app:
    environment:
      NODE_ENV: development
      DEBUG: "ocmapas:*"
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

---

## 3. Dockerfile com Stages

### Dockerfile Otimizado
```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

ARG BUILD_VERSION=dev
ARG NODE_ENV=production

ENV NODE_ENV=${NODE_ENV}
ENV BUILD_VERSION=${BUILD_VERSION}

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "backend/server.js"]
```

---

## 4. Scripts para Gerenciar Ambientes

### Script `scripts/deploy.sh` (Bash)
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-development}
BRANCH=${2:-develop}

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Ambiente inválido. Use: development, staging ou production"
    exit 1
fi

echo "🚀 Iniciando deployment para $ENVIRONMENT (branch: $BRANCH)..."

# 1. Validar branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    echo "⚠️  Você está em $CURRENT_BRANCH. Checkout para $BRANCH"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
fi

# 2. Validar .env
if [[ ! -f ".env.$ENVIRONMENT" ]]; then
    echo "❌ Arquivo .env.$ENVIRONMENT não encontrado"
    exit 1
fi

# 3. Backup da base de dados
echo "📦 Fazendo backup da base de dados..."
docker compose --env-file=".env.$ENVIRONMENT" exec -T db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "backups/db_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).sql" || echo "⚠️  Backup não realizado"

# 4. Build e start
echo "🔨 Building images..."
docker compose --env-file=".env.$ENVIRONMENT" build --no-cache app

echo "🐳 Starting containers..."
docker compose --env-file=".env.$ENVIRONMENT" up -d

# 5. Aguardar aplicação estar pronta
echo "⏳ Aguardando aplicação iniciar..."
sleep 10

# 6. Health check
if curl -f http://localhost:$(grep APP_HOST_PORT ".env.$ENVIRONMENT" | cut -d'=' -f2)/health > /dev/null 2>&1; then
    echo "✅ Deployment bem-sucedido em $ENVIRONMENT!"
else
    echo "❌ Health check falhou. Revertendo..."
    docker compose --env-file=".env.$ENVIRONMENT" down
    exit 1
fi
```

### Script `scripts/rollback.sh`
```bash
#!/bin/bash

ENVIRONMENT=${1:-production}
BACKUP_FILE=${2}

if [[ -z "$BACKUP_FILE" ]]; then
    echo "❌ Uso: ./scripts/rollback.sh <environment> <backup_file>"
    echo "   Backups disponíveis em backups/"
    ls -lh backups/
    exit 1
fi

echo "🔄 Revertendo para backup: $BACKUP_FILE"

docker compose --env-file=".env.$ENVIRONMENT" exec -T db psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" < "$BACKUP_FILE"

echo "✅ Rollback concluído"
```

---

## 5. Workflow Prático - Passo a Passo

### Cenário: Nova Feature

#### Passo 1: Criar Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/novo-editor
```

#### Passo 2: Desenvolver Localmente
```bash
cp .env.development .env
docker compose up -d
npm install  # se necessário
docker compose logs -f app
```

#### Passo 3: Testar Localmente
- Acessar: `http://localhost:8091`
- Verificar funcionalidades

#### Passo 4: Commit e Push
```bash
git add .
git commit -m "feat: adicionar novo editor"
git push origin feature/novo-editor
```

#### Passo 5: Pull Request para Develop
- Ir ao GitHub
- Criar PR `feature/novo-editor` → `develop`
- Verificar testes automáticos (CI)

#### Passo 6: Deploy em Staging (Testes)
```bash
git checkout staging
git pull origin staging
git merge --no-ff develop
./scripts/deploy.sh staging staging
```

- Testar em: `http://localhost:8092` (ou servidor de staging)
- Validar com dados reais

#### Passo 7: Release para Produção
```bash
# Criar release branch
git checkout develop
git pull origin develop
git checkout -b release/1.1.0

# Atualizar versão
# (editar package.json: "version": "1.1.0")

git add package.json
git commit -m "chore: bump to 1.1.0"
git push origin release/1.1.0

# Após aprovação, merge para main
git checkout main
git pull origin main
git merge --no-ff release/1.1.0
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin main --tags

# Deploy em produção
./scripts/deploy.sh production main

# Merge de volta para develop
git checkout develop
git merge --no-ff release/1.1.0
git push origin develop
```

---

## 6. Checklist de Produção

Antes de fazer deploy em produção:
- [ ] Todos os testes passam (CI/CD)
- [ ] Code review aprovado
- [ ] Funcionalidades testadas em staging
- [ ] Base de dados com backup
- [ ] Health checks configurados
- [ ] Logs configurados
- [ ] Plano de rollback definido
- [ ] Janela de manutenção informada (se necessário)

---

## 7. Monitoramento

### Health Check Endpoint
Adicionar em `backend/server.js`:
```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: process.env.BUILD_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});
```

### Logs
```bash
# Desenvolvimento
docker compose logs -f app

# Staging
docker compose --env-file=.env.staging logs -f app

# Produção
docker compose --env-file=.env.production logs -f app --tail=100
```

---

## 8. Resumo das Branches

| Branch | Propósito | Ambiente |
|--------|----------|----------|
| `main` | Produção | Production |
| `develop` | Integração contínua | Development |
| `feature/*` | Novas features | Local |
| `release/*` | Preparação de release | Staging |

---

## 9. Variáveis de Ambiente

**NUNCA** commit `.env` files com senhas reais:
```bash
# .gitignore
.env
.env.production
.env.*.local
node_modules/
backups/
```

Use `.env.example`:
```bash
NODE_ENV=development
APP_HOST_PORT=8091
ADMINER_HOST_PORT=8081
POSTGRES_DB=ocmapas_dev
POSTGRES_USER=ocmapas_dev
POSTGRES_PASSWORD=changeme
BUILD_VERSION=dev
```
