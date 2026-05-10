#!/bin/bash

# Script de Setup para Desenvolvimento Local
# Uso: ./scripts/dev-setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🛠️  Configuração de Desenvolvimento - OCMapas${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

cd "$PROJECT_DIR"

echo -e "${BLUE}1. Criando arquivo .env para desenvolvimento${NC}"
if [[ ! -f .env ]]; then
    cp .env.development .env
    echo -e "   ${GREEN}✓ .env criado${NC}"
else
    echo -e "   ℹ️  .env já existe"
fi

echo -e "${BLUE}2. Instalando dependências Node.js${NC}"
if [[ ! -d node_modules ]]; then
    npm install
    echo -e "   ${GREEN}✓ Dependências instaladas${NC}"
else
    echo -e "   ℹ️  node_modules já existem"
fi

echo -e "${BLUE}3. Iniciando containers Docker${NC}"
docker compose up -d
echo -e "   ${GREEN}✓ Containers iniciados${NC}"

echo -e "${BLUE}4. Aguardando base de dados estar pronta${NC}"
sleep 5
docker compose logs db | tail -5

echo ""
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo "Próximos passos:"
echo "  - Iniciar modo desenvolvimento: npm run dev"
echo "  - Acessar aplicação: http://localhost:8091"
echo "  - Acessar Adminer: http://localhost:8081"
echo "  - Ver logs: docker compose logs -f"
echo ""
