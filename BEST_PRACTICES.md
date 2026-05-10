# Boas Práticas de Deployment e Staging

## ✅ Antes de Fazer Deploy

### Checklist de Código
- [ ] Código revisado por outro desenvolvedor
- [ ] Testes unitários passam
- [ ] Testes de integração passam
- [ ] Sem console.log() em produção (usar logger estruturado)
- [ ] Sem credentials em código (usar .env)
- [ ] Migrações de BD testadas em staging

### Checklist de Configuração
- [ ] Variáveis de ambiente corretas para ambiente alvo
- [ ] Senhas e tokens seguros (mínimo 16 caracteres)
- [ ] Backup de BD automático configurado
- [ ] Logs configurados
- [ ] Health checks funcionando

---

## 🔐 Segurança

### Senhas e Tokens
```bash
# Gerar senha segura (Linux/Mac)
openssl rand -base64 32

# Ou usando Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Variáveis de Ambiente Sensíveis
```bash
# ❌ NUNCA fazer isso:
DATABASE_PASSWORD=admin123  # em .gitignore mas visível em histórico

# ✅ FAZER isso:
# 1. Usar .env (não fazer commit)
# 2. Em CI/CD, usar GitHub Secrets ou variáveis de ambiente
# 3. Em servidor, usar gerenciador de secrets (Vault, etc)
```

### Health Check
Implementar em `backend/server.js`:
```javascript
app.get('/health', (req, res) => {
  // Verificar BD
  const dbHealthy = true; // implementar verificação real
  
  if (dbHealthy) {
    res.json({
      status: 'ok',
      version: process.env.BUILD_VERSION,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Para Kubernetes/Docker
app.get('/ready', (req, res) => {
  // Verificações mais rigorosas
  res.json({ ready: true });
});
```

---

## 🔄 Zero-Downtime Deployment

### Blue-Green Deployment (Produção)
```bash
# Versão Azul (atual)
docker compose --env-file=.env.production up -d app_blue

# Versão Verde (nova)
docker compose --env-file=.env.production up -d app_green

# Testar verde
curl http://localhost:8091/health

# Se OK, redirecionar tráfego
# Nginx ou Load Balancer aponta para verde

# Manter azul como fallback
```

### Rolling Update (Com Múltiplas Instâncias)
```yaml
# docker-compose para múltiplas instâncias
services:
  app-1:
    build: .
    environment:
      INSTANCE: 1
    restart: unless-stopped
  
  app-2:
    build: .
    environment:
      INSTANCE: 2
    restart: unless-stopped
  
  # Nginx faz load balancing entre app-1 e app-2
```

---

## 📊 Monitoramento em Produção

### Logs Estruturados
```javascript
// backend/logger.js
const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: msg,
      ...meta
    }));
  },
  
  error: (msg, err) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: msg,
      error: err?.message,
      stack: err?.stack
    }));
  }
};

module.exports = logger;
```

### Alertas
```bash
# Monitorar logs de erro
docker compose logs app | grep ERROR

# Monitorar CPU/Memória
docker stats

# Uptime
docker compose ps
```

---

## 🛠️ Troubleshooting Comum

### Problema: Aplicação lenta após deploy
```bash
# Verificar uso de recursos
docker compose exec app node --inspect-brk=0.0.0.0:9229 backend/server.js

# Verificar conexões ao BD
docker compose exec db ps aux | grep postgres

# Verificar logs
docker compose logs --tail=100 app
```

### Problema: Falha silenciosa (container para)
```bash
# Verificar logs
docker compose logs app

# Verificar exit code
docker compose ps

# Testar comando manualmente
docker compose exec app node backend/server.js
```

### Problema: Base de dados corrompida
```bash
# Fazer rollback para backup anterior
./scripts/rollback.sh production backups/db_production_TIMESTAMP.sql

# Verificar integridade
docker compose exec db pg_isready
```

---

## 📈 Versionamento Semântico

Seguir [semver.org](https://semver.org/):

### Versão: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes (incompatível com versão anterior)
  - Exemplo: Mudança em API, remoção de features
  
- **MINOR**: Novas features, compatível com versão anterior
  - Exemplo: Novo endpoint, novo campo em DB
  
- **PATCH**: Bugfixes, performance improvements
  - Exemplo: Corrigir erro de validação

### Exemplos
```
1.0.0 - Release inicial
1.1.0 - Nova feature de editor
1.1.1 - Bugfix em validação
2.0.0 - Redesign, breaking changes
```

---

## 🔄 Processo de Release

### 1. Feature branch (3-5 dias)
```bash
git checkout -b feature/nova-feature
# Desenvolver, testar, commit
```

### 2. Code review (1-2 dias)
```bash
# PR → Code review no GitHub
# Ajustar feedback
```

### 3. Staging (1-2 dias)
```bash
./scripts/deploy.sh staging staging
# Testes com dados reais
# Validação com stakeholders
```

### 4. Release (mesma semana)
```bash
# Release branch + bump version
# Deploy em produção
# Monitorar 24h
```

### 5. Hotfix (se necessário)
```bash
# Criar hotfix branch de main
git checkout -b hotfix/bug-critico
# Fix rápido
# Merge para main e develop
```

---

## 🚨 Plano de Contingência

### Se algo der errado em produção

1. **Identificar problema** (2 min)
   ```bash
   docker compose --env-file=.env.production logs app | tail -50
   curl http://localhost:8090/health
   ```

2. **Fazer rollback** (5 min)
   ```bash
   ./scripts/rollback.sh production backups/db_production_LATEST.sql
   docker compose --env-file=.env.production restart app
   ```

3. **Comunicar** (imediato)
   - Notificar stakeholders
   - Estimar tempo de resolução

4. **Investigar pós-mortem** (dentro de 24h)
   - O que causou o problema?
   - Como prevenir?
   - Update documentation

---

## 📝 Documentação

### Manter atualizado
- [ ] README.md com instruções de setup
- [ ] DEPLOYMENT_STRATEGY.md com processo
- [ ] QUICK_REFERENCE.md para referência rápida
- [ ] Comentários em código complexo
- [ ] Changelog com versões

### Exemplo CHANGELOG.md
```markdown
## [1.1.0] - 2024-05-10
### Added
- Novo editor visual

### Fixed
- Bug em validação de mapas

## [1.0.0] - 2024-05-01
### Added
- Release inicial
```

---

## 🎯 Objetivos de Confiabilidade

- **Uptime**: 99.9% (máximo 43 minutos/mês de downtime)
- **MTTR** (Mean Time To Recover): < 15 minutos
- **RTO** (Recovery Time Objective): < 1 hora
- **RPO** (Recovery Point Objective): < 1 hora de dados
