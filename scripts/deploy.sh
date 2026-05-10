#!/bin/bash

# Script de Deploy para OCMapas
# Uso: ./scripts/deploy.sh <environment> [branch]
# Exemplo: ./scripts/deploy.sh staging staging
# Exemplo: ./scripts/deploy.sh production main

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parâmetros
ENVIRONMENT=${1:-development}
BRANCH=${2:-develop}

# Validação
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Ambiente inválido: $ENVIRONMENT${NC}"
    echo "   Use: development, staging ou production"
    exit 1
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🚀 OCMapas Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Ambiente: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Branch: ${YELLOW}$BRANCH${NC}"
echo -e "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# Verificar arquivo .env
if [[ ! -f "$PROJECT_DIR/.env.$ENVIRONMENT" ]]; then
    echo -e "${RED}❌ Arquivo .env.$ENVIRONMENT não encontrado${NC}"
    exit 1
fi

source "$PROJECT_DIR/.env.$ENVIRONMENT"

# Validar ambiente
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}⚠️  ATENÇÃO: Você está prestes a fazer deploy em PRODUÇÃO${NC}"
    echo -ne "${YELLOW}Tem certeza? Digite 'production' para continuar: ${NC}"
    read -r confirmation
    if [[ "$confirmation" != "production" ]]; then
        echo -e "${RED}Deploy cancelado${NC}"
        exit 1
    fi
fi

# Mudar para diretório do projeto
cd "$PROJECT_DIR"

echo -e "${BLUE}1. Validando Git${NC}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    echo -e "   Checkout para branch: ${YELLOW}$BRANCH${NC}"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    echo -e "   ✓ Já no branch: ${YELLOW}$BRANCH${NC}"
    git pull origin "$BRANCH"
fi

echo -e "${BLUE}2. Verificando dependências${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não instalado${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não instalado${NC}"
    exit 1
fi
echo "   ✓ Docker e Docker Compose disponíveis"

echo -e "${BLUE}3. Fazendo backup da base de dados${NC}"
mkdir -p "$PROJECT_DIR/backups"

if docker compose --env-file=".env.$ENVIRONMENT" ps db --quiet &> /dev/null; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$PROJECT_DIR/backups/db_${ENVIRONMENT}_${TIMESTAMP}.sql"
    
    if docker compose --env-file=".env.$ENVIRONMENT" exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE" 2>/dev/null; then
        echo -e "   ✓ Backup criado: ${YELLOW}backups/db_${ENVIRONMENT}_${TIMESTAMP}.sql${NC}"
    else
        echo -e "   ⚠️  Aviso: Não foi possível fazer backup (BD pode não estar pronta)"
    fi
else
    echo -e "   ℹ️  Base de dados não está em execução (primeiro deploy?)"
fi

echo -e "${BLUE}4. Construindo imagens Docker${NC}"
if docker compose --env-file=".env.$ENVIRONMENT" build --no-cache app 2>&1 | tail -5; then
    echo -e "   ✓ Build bem-sucedido"
else
    echo -e "${RED}❌ Erro no build${NC}"
    exit 1
fi

echo -e "${BLUE}5. Iniciando containers${NC}"
if docker compose --env-file=".env.$ENVIRONMENT" up -d 2>&1 | grep -E "(Creating|Starting|Stopping)"; then
    echo -e "   ✓ Containers iniciados"
else
    echo -e "   ✓ Containers atualizados"
fi

echo -e "${BLUE}6. Aguardando aplicação iniciar${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
    if docker compose --env-file=".env.$ENVIRONMENT" exec -T app node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" &>/dev/null; then
        echo -e "   ✓ Aplicação pronta"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -ne "   Tentativa $ATTEMPT/$MAX_ATTEMPTS...\r"
    sleep 2
done

if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    echo -e "${RED}❌ Health check falhou após $MAX_ATTEMPTS tentativas${NC}"
    echo -e "   Verificar logs: docker compose --env-file=.env.$ENVIRONMENT logs app"
    exit 1
fi

echo ""
echo -e "${BLUE}7. Resumo do Deploy${NC}"
echo -e "   Ambiente: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "   Versão: ${YELLOW}$BUILD_VERSION${NC}"
echo -e "   URL da Aplicação: ${YELLOW}http://localhost:$APP_HOST_PORT${NC}"

if [[ -n "$ADMINER_HOST_PORT" ]]; then
    echo -e "   URL do Adminer: ${YELLOW}http://localhost:$ADMINER_HOST_PORT${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment bem-sucedido!${NC}"
echo ""
echo "Próximos passos:"
echo "  - Verificar logs: docker compose --env-file=.env.$ENVIRONMENT logs -f app"
echo "  - Ver containers: docker compose --env-file=.env.$ENVIRONMENT ps"
echo "  - Fazer rollback: ./scripts/rollback.sh $ENVIRONMENT <backup_file>"
echo ""
