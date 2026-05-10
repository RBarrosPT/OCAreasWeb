# 📋 Sumário de Configuração - Deployment OCMapas

## ✅ O que foi criado

### 📚 Documentação
- **[DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md)** - Documentação completa de estratégia
- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** - Boas práticas e troubleshooting
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Guia rápido de referência
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Este arquivo (resumo)

### 🔧 Scripts Executáveis
```
scripts/
├── deploy.sh          # Deploy para desenvolvimento/staging/produção
├── rollback.sh        # Revert para versão anterior
├── dev-setup.sh       # Setup inicial de desenvolvimento
└── clean.sh           # Limpeza de containers e volumes
```

### ⚙️ Configuração de Ambientes
```
.env.development      # Desenvolvimento local (porta 8091)
.env.staging          # Staging/Testes (porta 8092)
.env.production       # Produção (porta 8090)
.env.example          # Template para referência
```

### 🐳 Docker
- **docker-compose.override.yml** - Configurações de desenvolvimento local

### 🤖 CI/CD
- **.github/workflows/ci-cd.yml** - Testes automáticos em cada push

### 💊 Health Check
- **backend/health.js** - Endpoints de monitoramento
  - GET /health → Status geral
  - GET /ready → Readiness probe
  - GET /live → Liveness probe
  - GET /metrics → Métricas

### 📂 Segurança
- **.gitignore** - Arquivos que não devem ser commitados

---

## 🚀 Como Usar

### 1️⃣ Setup Inicial (Uma vez)
```bash
cd /srv/docker/ocmapas
./scripts/dev-setup.sh
```

### 2️⃣ Desenvolvimento Diário
```bash
# Terminal 1: Containers
docker compose up -d

# Terminal 2: Aplicação
npm run dev

# Terminal 3: Logs
docker compose logs -f app
```

### 3️⃣ Deploy em Staging (Testes)
```bash
git checkout staging
git merge --no-ff develop
./scripts/deploy.sh staging staging
# Acesso: http://localhost:8092
```

### 4️⃣ Deploy em Produção
```bash
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin main --tags

./scripts/deploy.sh production main
# Acesso: http://localhost:8090
```

### 5️⃣ Se Algo Der Errado (Rollback)
```bash
ls -lh backups/                                    # Ver backups
./scripts/rollback.sh production backups/db_*.sql # Revert BD
docker compose restart app                         # Reiniciar
```

---

## 📊 Arquitetura de Branches

```
┌─────────────────────────────────────────────────────┐
│ PRODUÇÃO (main) - v1.0.0, v1.1.0, v1.2.0, ...      │
│ 3 ambientes, 3 branches, 3 bancos de dados         │
└─────────────────────────────────────────────────────┘
        ↑ merge com tag (release)
        │
┌─────────────────────────────────────────────────────┐
│ STAGING (staging) - Testes com dados reais         │
└─────────────────────────────────────────────────────┘
        ↑ merge automático de develop
        │
┌─────────────────────────────────────────────────────┐
│ DESENVOLVIMENTO (develop) - Integração contínua     │
└─────────────────────────────────────────────────────┘
        ↑ Pull Requests
        │
     ┌──┴──┬──────────┬─────────────┐
     │     │          │             │
feature/  feature/   feature/   feature/
 novo1    novo2      novo3      novo4
```

---

## 🔐 Ambientes e Portas

| Ambiente | Branch | Porta App | Porta Adminer | Banco | URL |
|----------|--------|-----------|---------------|-------|-----|
| Development | `feature/*` | 8091 | 8081 | ocmapas_dev | localhost:8091 |
| Staging | `staging` | 8092 | 8082 | ocmapas_staging | localhost:8092 |
| Production | `main` | 8090 | ❌ | ocmapas_prod | localhost:8090 |

---

## 📈 Workflow Completo (Exemplo)

### Dia 1: Criar Feature
```bash
git checkout develop
git checkout -b feature/novo-editor
# Coding...
git add .
git commit -m "feat: novo editor visual"
git push origin feature/novo-editor
```

### Dia 2: Code Review
- Abrir PR no GitHub
- Revisor testa localmente
- Feedback e ajustes

### Dia 3: Merge para Develop
- PR aprovada
- Merge automático para develop
- GitHub Actions roda testes

### Dia 4-5: Testes em Staging
```bash
git checkout staging
git merge --no-ff develop
./scripts/deploy.sh staging staging
# Testar em http://localhost:8092
```

### Dia 6: Release
```bash
git checkout -b release/1.1.0
# Atualizar package.json: "version": "1.1.0"
git add package.json
git commit -m "chore: bump to 1.1.0"
git checkout main
git merge --no-ff release/1.1.0
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin main --tags

./scripts/deploy.sh production main
# Deploy concluído ✅
```

---

## 🔍 Verificações de Saúde

### Health Checks Automáticos
```bash
# Durante deploy
curl http://localhost:8091/health

# Mais informações
curl http://localhost:8091/metrics | jq

# Verificar se pronto para tráfego
curl http://localhost:8091/ready

# Verificar se ainda está rodando
curl http://localhost:8091/live
```

### Monitoramento Manual
```bash
# Ver logs em tempo real
docker compose logs -f app

# Ver recursos usados
docker stats

# Status dos containers
docker compose ps

# Verificar BD
docker compose exec db psql -U ocmapas -d ocmapas_dev -c "SELECT COUNT(*) FROM maps;"
```

---

## 🛠️ Troubleshooting Rápido

### Problema: Aplicação não inicia
```bash
docker compose logs app | tail -50
docker compose restart app
```

### Problema: Erro de BD
```bash
# Verificar se BD está rodando
docker compose ps | grep db

# Conectar via Adminer
# http://localhost:8081
# User: ocmapas
# Password: dev_password_123
# Database: ocmapas_dev
```

### Problema: Quero fazer rollback
```bash
# Listar backups
ls -lh backups/ | grep db_

# Restaurar
./scripts/rollback.sh production backups/db_production_20240510_143022.sql
```

### Problema: Limpeza completa
```bash
# Parar tudo
./scripts/clean.sh production

# Recomeçar
./scripts/deploy.sh production main
```

---

## 📋 Checklist para Produção

### Antes de Deploy
- [ ] Versão atualizada em `package.json`
- [ ] Tag Git criada (`v1.0.0`)
- [ ] Testes passam em staging
- [ ] Code review aprovado
- [ ] Backup de BD configurado
- [ ] Senhas seguras em `.env.production`

### Depois de Deploy
- [ ] Aplicação responde em /health
- [ ] Dados migrados corretamente
- [ ] Funcionalidades críticas testadas
- [ ] Logs monitorados
- [ ] Plano de rollback pronto

### Monitoring Contínuo
- [ ] Uptime: 99.9% (< 43 min/mês downtime)
- [ ] Response time: < 500ms
- [ ] CPU: < 70%
- [ ] Memória: < 80%
- [ ] Disk: < 85%

---

## 🔗 Links Rápidos

| Recurso | Localização |
|---------|------------|
| Documentação de Deploy | [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) |
| Boas Práticas | [BEST_PRACTICES.md](BEST_PRACTICES.md) |
| Referência Rápida | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| Scripts de Deploy | `scripts/` |
| Configurações | `.env.*` e `docker-compose*.yml` |
| Health Checks | `backend/health.js` |
| CI/CD Pipeline | `.github/workflows/ci-cd.yml` |

---

## 📞 Suporte e Dúvidas

### Não consigo executar scripts?
```bash
# Tornar executável
chmod +x scripts/*.sh

# Executar
./scripts/deploy.sh staging
```

### Preciso resetar tudo?
```bash
# Limpeza completa
./scripts/clean.sh development

# Recomeçar
./scripts/dev-setup.sh
```

### Como adicionar variável de ambiente?
1. Adicionar em `.env.development`
2. Adicionar em `.env.staging`
3. Adicionar em `.env.production`
4. Usar em `backend/server.js` via `process.env.MINHA_VAR`

---

## 🎯 Próximos Passos

### Integração com Servidor
1. Criar usuário de deploy no servidor
2. Configurar SSH keys para CI/CD
3. Adicionar secrets no GitHub (Deploy key)
4. Testar deploy automático

### Monitoramento Avançado
1. Integrar com ELK Stack (Elasticsearch, Logstash, Kibana)
2. Alertas com Prometheus + Grafana
3. Uptime monitoring com StatusPage
4. Performance monitoring com New Relic

### Backup e Disaster Recovery
1. Backup automático diário
2. Restore procedure testada
3. Cross-region backup
4. RTO/RPO definidos

---

## 📝 Changelog

### v1.0.0 - Setup Inicial (10/05/2024)
- ✅ Estratégia de deployment com 3 ambientes
- ✅ Git Flow branching
- ✅ Scripts de deploy/rollback
- ✅ Múltiplos .env por ambiente
- ✅ Health checks implementados
- ✅ GitHub Actions CI/CD
- ✅ Documentação completa

---

**Status**: ✅ **Sistema de deployment pronto para uso**

Utilize as documentações e scripts para gerenciar suas releases com segurança!
