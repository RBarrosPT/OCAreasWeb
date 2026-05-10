# Acesso ao Adminer

## URL

```text
http://127.0.0.1:8081/
```

## Credenciais

- Sistema: `PostgreSQL`
- Servidor: `db`
- Utilizador: `ocmapas`
- Password: `ocmapas`
- Base de dados: `ocmapas`

## Observações

- O serviço Adminer é iniciado via `docker compose`.
- Não iniciar o Adminer com `docker run`, para não ficar fora da rede `ocmapas_default`.
- A porta pode ser alterada através da variável `ADMINER_HOST_PORT` no ficheiro `.env`.

## Reset rápido do Adminer

Se surgir erro de resolução de hostname (ex.: `db`), executar no diretório do projeto:

```bash
docker rm -f ocmapas-adminer && docker compose up -d --force-recreate adminer
```

Validação opcional:

```bash
docker exec ocmapas-adminer getent hosts db
```

```bash
docker compose logs --tail=100 adminer
```