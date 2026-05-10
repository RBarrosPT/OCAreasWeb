# Guia Rápido - Workflow de Desenvolvimento e Deployment

## 🚀 Início Rápido

### Primeira vez (Setup Desenvolvimento)
```bash
cd /srv/docker/ocmapas
./scripts/dev-setup.sh
npm run dev
# Acesso: http://localhost:8091
```

### Desenvolvimento Diário
```bash
# Terminal 1: Containers
docker compose up -d

# Terminal 2: Aplicação em watch mode
npm run dev

# Terminal 3: Ver logs
docker compose logs -f app
```

---

## 📋 Workflow Completo - Nova Feature

### 1️⃣ Criar Feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/minha-feature
```

### 2️⃣ Desenvolver Localmente
```bash
# Seu código aqui...
git add .
git commit -m "feat: descrição da feature"
git push origin feature/minha-feature
```

### 3️⃣ Pull Request para Develop
- Abrir PR no GitHub: `feature/minha-feature` → `develop`
- Aguardar testes CI passarem
- Code review

### 4️⃣ Testar em Staging (Pré-produção)
```bash
git checkout staging
git pull origin staging
git merge --no-ff develop

# Deploy em staging
./scripts/deploy.sh staging staging
# Acesso: http://localhost:8092
```

### 5️⃣ Release para Produção
```bash
# Criar release branch
git checkout develop
git pull origin develop
git checkout -b release/1.1.0

# Atualizar versão em package.json
# "version": "1.1.0"

git add package.json
git commit -m "chore: bump version to 1.1.0"
git push origin release/1.1.0

# Após aprovação...
git checkout main
git merge --no-ff release/1.1.0
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin main --tags

# Deploy em produção
./scripts/deploy.sh production main
```

---

## 🔧 Scripts Úteis

### Deploy
```bash
# Desenvolvimento
./scripts/deploy.sh development

# Staging (testes)
./scripts/deploy.sh staging staging

# Produção
./scripts/deploy.sh production main
```

### Rollback (Reverter para versão anterior)
```bash
# Listar backups disponíveis
ls -lh backups/

# Fazer rollback
./scripts/rollback.sh production backups/db_production_20240510_143022.sql
```

### Limpeza
```bash
# Remover containers, volumes e images
./scripts/clean.sh production
```

---

## 📁 Estrutura de Branches

```
main (produção) ← tagged v1.0.0, v1.1.0, v1.2.0
 ↑
 └─ release/1.1.0 (preparação de release)

develop (staging)
 ↑
 ├─ feature/novo-editor
 ├─ feature/melhorias
 └─ ...
```

---

## 🔐 Variáveis de Ambiente

### Não fazer commit de:
- `.env` (desenvolvimento local)
- `.env.production` (senhas reais)

### Deve estar em .gitignore:
```
.env
.env.*.local
.env.production
backups/
node_modules/
```

---

## 📊 Ambientes

| Ambiente | Branch | Porta | Banco | Uso |
|----------|--------|-------|-------|-----|
| Desenvolvimento | feature/* | 8091 | ocmapas_dev | Local |
| Staging | staging | 8092 | ocmapas_staging | Testes |
| Produção | main | 8090 | ocmapas_prod | Usuários finais |

---

## ✅ Checklist Pré-Produção

- [ ] Feature completa e testada localmente
- [ ] Testes em staging bem-sucedidos
- [ ] Code review aprovado
- [ ] Backup automático criado
- [ ] Versão atualizada em package.json
- [ ] Tag Git criada (v1.1.0)
- [ ] Documentação atualizada
- [ ] Plano de rollback definido

---

## 🐛 Troubleshooting

### Aplicação não inicia
```bash
docker compose logs -f app
docker compose restart app
```

### Base de dados com erro
```bash
# Rollback para backup anterior
./scripts/rollback.sh production backups/db_production_XXXXXXX.sql

# Ou limpar e recomeçar
./scripts/clean.sh production
./scripts/deploy.sh production main
```

### Limpar cache local
```bash
./scripts/clean.sh development
npm install
./scripts/dev-setup.sh
```

---

## 📞 Referência Rápida de Comandos

```bash
# Git
git checkout develop            # Mudar branch
git pull origin develop         # Atualizar branch
git merge --no-ff feature/xyz   # Merge com merge commit
git tag -a v1.0.0 -m "msg"     # Criar tag

# Docker
docker compose up -d            # Iniciar containers
docker compose down -v          # Parar e remover volumes
docker compose logs -f app      # Ver logs em tempo real
docker compose ps               # Ver status

# Scripts
./scripts/deploy.sh staging     # Deploy em staging
./scripts/deploy.sh production main  # Deploy em produção
./scripts/rollback.sh prod ./backups/db_prod_*.sql  # Rollback
./scripts/clean.sh production   # Limpeza completa
```

---

## 🔗 Arquivos Importantes

- [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) - Documentação completa
- [.env.development](.env.development) - Configuração desenvolvimento
- [.env.staging](.env.staging) - Configuração staging
- [.env.production](.env.production) - Configuração produção
- [docker-compose.yml](docker-compose.yml) - Configuração containers
- [docker-compose.override.yml](docker-compose.override.yml) - Overrides local
