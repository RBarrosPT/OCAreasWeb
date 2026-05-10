#!/bin/bash

# Script para limpar containers, volumes e cache
# Uso: ./scripts/clean.sh [environment]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ENVIRONMENT=${1:-development}
YELLOW='\033[1;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

cd "$PROJECT_DIR"

echo -e "${RED}⚠️  Você está prestes a limpar o ambiente: $ENVIRONMENT${NC}"
echo "Isto irá:"
echo "  - Parar todos os containers"
echo "  - Remover volumes de dados"
echo "  - Remover imagens dangling"
echo ""
echo -ne "${YELLOW}Tem certeza? Digite 'clean' para continuar: ${NC}"
read -r confirmation

if [[ "$confirmation" != "clean" ]]; then
    echo "Operação cancelada"
    exit 0
fi

echo -e "${YELLOW}Parando containers...${NC}"
docker compose --env-file=".env.$ENVIRONMENT" down -v

echo -e "${YELLOW}Removendo imagens dangling...${NC}"
docker image prune -f

echo -e "${YELLOW}Removendo volumes órfãos...${NC}"
docker volume prune -f

echo -e "${GREEN}✅ Limpeza concluída${NC}"
echo ""
echo "Para recomeçar:"
echo "  ./scripts/deploy.sh $ENVIRONMENT"
