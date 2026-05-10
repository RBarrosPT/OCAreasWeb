#!/bin/bash

# Script de Rollback para OCMapas
# Uso: ./scripts/rollback.sh <environment> <backup_file>
# Exemplo: ./scripts/rollback.sh production backups/db_production_20240510_143022.sql

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1}
BACKUP_FILE=${2}

if [[ -z "$ENVIRONMENT" ]] || [[ -z "$BACKUP_FILE" ]]; then
    echo -e "${RED}❌ Uso inválido${NC}"
    echo "   ./scripts/rollback.sh <environment> <backup_file>"
    echo ""
    echo "Backups disponíveis:"
    ls -lh "$PROJECT_DIR/backups/" 2>/dev/null | tail -10 || echo "   (nenhum backup encontrado)"
    exit 1
fi

# Validar arquivo
if [[ ! -f "$BACKUP_FILE" ]]; then
    # Tentar com prefixo de caminho
    if [[ ! -f "$PROJECT_DIR/$BACKUP_FILE" ]]; then
        echo -e "${RED}❌ Arquivo de backup não encontrado: $BACKUP_FILE${NC}"
        exit 1
    fi
    BACKUP_FILE="$PROJECT_DIR/$BACKUP_FILE"
fi

# Validar ambiente
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Ambiente inválido: $ENVIRONMENT${NC}"
    exit 1
fi

# Confirmação
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}⚠️  ATENÇÃO: Você está prestes a fazer ROLLBACK em PRODUÇÃO${NC}"
    echo -e "   Backup a restaurar: ${YELLOW}$(basename $BACKUP_FILE)${NC}"
    echo -ne "${YELLOW}Tem certeza? Digite 'rollback' para continuar: ${NC}"
    read -r confirmation
    if [[ "$confirmation" != "rollback" ]]; then
        echo -e "${RED}Rollback cancelado${NC}"
        exit 1
    fi
fi

cd "$PROJECT_DIR"

# Validar arquivo .env
if [[ ! -f ".env.$ENVIRONMENT" ]]; then
    echo -e "${RED}❌ Arquivo .env.$ENVIRONMENT não encontrado${NC}"
    exit 1
fi

source ".env.$ENVIRONMENT"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🔄 Rollback - OCMapas${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Ambiente: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Backup: ${YELLOW}$(basename $BACKUP_FILE)${NC}"
echo -e "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

echo -e "${BLUE}1. Verificando containers${NC}"
if ! docker compose --env-file=".env.$ENVIRONMENT" ps db --quiet &> /dev/null; then
    echo -e "${RED}❌ Base de dados não está em execução${NC}"
    exit 1
fi
echo -e "   ✓ Base de dados ativa"

echo -e "${BLUE}2. Restaurando backup${NC}"
if cat "$BACKUP_FILE" | docker compose --env-file=".env.$ENVIRONMENT" exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" 2>&1 | tail -5; then
    echo -e "   ✓ Backup restaurado com sucesso"
else
    echo -e "${RED}❌ Erro ao restaurar backup${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Rollback bem-sucedido!${NC}"
echo ""
echo "Próximos passos:"
echo "  - Reiniciar aplicação: docker compose --env-file=.env.$ENVIRONMENT restart app"
echo "  - Verificar logs: docker compose --env-file=.env.$ENVIRONMENT logs -f app"
echo ""
