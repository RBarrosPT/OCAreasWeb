# OCMapas

Aplicação web para edição de mapas SVG com backend Node.js + PostgreSQL, autenticação, partilha entre utilizadores e permissões de edição.

## Funcionalidades

- Coloração interativa de quadras no mapa SVG.
- Legenda por cor (notas por cor) e notas gerais do mapa.
- Login e registo de utilizadores.
- Registo apenas com email previamente autorizado na base de dados.
- Persistência em base de dados PostgreSQL (sem `localStorage` para mapas).
- Lista de mapas com permissões:
  - proprietário
  - partilhado com edição
  - partilhado só leitura
- Partilha de mapas por lista de utilizadores (checkbox), com opção de permitir edição por utilizador.
- Opção de tornar mapa público (leitura para utilizadores autenticados).
- Cópia de mapas do próprio utilizador.
- Importar/Exportar mapas em JSON.
- Indicador de estado (`Tudo guardado` / `Alterações por guardar`).
- Página inicial por utilizador com separação entre mapas próprios e partilhados, incluindo resumo dos utilizadores com quem cada mapa está partilhado.

## Stack

- Frontend: HTML + CSS + JavaScript (sem framework)
- Backend: Node.js + Express
- Base de dados: PostgreSQL
- Containers: Docker + Docker Compose

## Estrutura

- `backend/server.js` — servidor HTTP, API e ficheiros estáticos
- `backend/routes/auth.js` — login, registo e sessão
- `backend/routes/maps.js` — mapas, partilhas, permissões e cópias
- `backend/db/schema.sql` — esquema SQL
- `docker-compose.yml` — orquestração app + base de dados
- `Dockerfile` — imagem da aplicação

## Arranque com Docker

1. Criar ficheiro `.env` com base no `.env.example`:

```bash
cp .env.example .env
```

2. Iniciar serviços:

```bash
docker compose up --build
```

3. Abrir no browser:

```text
http://127.0.0.1:8091/
```

4. Aceder ao Adminer:

```text
http://127.0.0.1:8081/
```

## Notas

- A criação das tabelas é automática no arranque do backend.
- O utilizador dono do mapa controla partilha, permissões e visibilidade pública.
- Pode alterar a porta exposta no host através de `APP_HOST_PORT` no ficheiro `.env`.
- Pode alterar a porta do Adminer através de `ADMINER_HOST_PORT` no ficheiro `.env`.
- No Adminer, usar:
  - Sistema: `PostgreSQL`
  - Servidor: `db`
  - Utilizador: `ocmapas`
  - Password: `ocmapas`
  - Base de dados: `ocmapas`

## Logs úteis

### Adminer

- Ver logs: `docker compose logs adminer`
- Ver logs em tempo real: `docker compose logs -f adminer`
- Ver últimas 100 linhas: `docker compose logs --tail=100 adminer`

### App (`ocmapas-app`)

- Ver logs: `docker logs ocmapas-app`
- Ver logs em tempo real: `docker logs -f ocmapas-app`
- Filtrar só autenticações falhadas: `docker logs ocmapas-app | grep '\[auth\]\[login\]\[failed\]'`

As autenticações falhadas em `/api/auth/login` são registadas no backend (sem password), com este formato:

```text
[auth][login][failed] username=<username> ip=<ip> reason=<missing_credentials|user_not_found|invalid_password>
```

### Alertas por email (falhas de login)

Para ativar envio de alertas por email quando há várias falhas de login para o mesmo `username + ip`, configurar no `.env`:

```env
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_TO=alertas@empresa.pt
ALERT_EMAIL_FROM=ocmapas@empresa.pt
ALERT_SMTP_HOST=smtp.empresa.pt
ALERT_SMTP_PORT=587
ALERT_SMTP_SECURE=false
ALERT_SMTP_USER=utilizador_smtp
ALERT_SMTP_PASS=senha_smtp
ALERT_LOGIN_THRESHOLD=5
ALERT_LOGIN_WINDOW_MS=600000
ALERT_LOGIN_COOLDOWN_MS=1800000
```

- `ALERT_LOGIN_THRESHOLD`: nº de falhas para disparar alerta.
- `ALERT_LOGIN_WINDOW_MS`: janela temporal para contar falhas.
- `ALERT_LOGIN_COOLDOWN_MS`: tempo mínimo entre emails para a mesma chave (`username + ip`).

Depois de alterar o `.env`, reiniciar a app:

```bash
docker compose up -d --build app
```

## Registo com emails autorizados

O registo de novos utilizadores só é permitido quando o email já tiver sido previamente inserido pelo administrador na tabela `allowed_registration_emails`.

Exemplo para autorizar um utilizador:

```sql
INSERT INTO allowed_registration_emails (email)
VALUES ('utilizador@empresa.pt')
ON CONFLICT (email) DO NOTHING;
```

Depois disso, o próprio utilizador pode abrir a aplicação e registar-se com:

- email autorizado
- nome de utilizador
- password

Se o email não existir nessa tabela, o registo é recusado.

Se quiser voltar a permitir novo registo com um email já usado, o administrador pode libertá-lo manualmente:

```sql
UPDATE allowed_registration_emails
SET used_by_user_id = NULL,
    used_at = NULL
WHERE email = 'utilizador@empresa.pt';
```
