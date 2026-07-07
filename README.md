# ShiftControl — Платформа управления строительными сменами

## Стек

- **API:** NestJS, Prisma, PostgreSQL, Redis, BullMQ, MinIO
- **Web:** Next.js 15 (админ + бригадир)
- **Mini App:** React + Vite (Telegram)
- **Deploy:** Docker Compose + nginx + Let's Encrypt

## Быстрый старт (разработка)

### 1. Зависимости

```bash
pnpm install
cp .env.example .env
```

### 2. Инфраструктура

```bash
docker compose up -d
```

### 3. База данных

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Запуск

```bash
pnpm --filter @shiftcontrol/api dev
pnpm --filter @shiftcontrol/web dev
pnpm --filter @shiftcontrol/miniapp dev
```

### URLs

| Сервис | URL |
|--------|-----|
| API + Swagger | http://localhost:3001/api/v1 / http://localhost:3001/api/docs |
| Admin | http://localhost:3000/login |
| Mini App | http://localhost:5173 |

### Тестовые аккаунты (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Superadmin | admin@shiftcontrol.local | Admin123!@# |
| Manager | manager@shiftcontrol.local | Manager123!@# |
| Foreman | foreman@shiftcontrol.local | Foreman123!@# |

## Production (VPS)

### Быстрая установка (Ubuntu/Debian)

```bash
# На VPS под root:
git clone https://github.com/Hlor4ik/shift_conrol.git /opt/shiftcontrol
cd /opt/shiftcontrol
chmod +x scripts/*.sh
./scripts/setup-vps.sh --domain your-domain.com --email your@email.com
```

Или одной командой:
```bash
curl -fsSL https://raw.githubusercontent.com/Hlor4ik/shift_conrol/main/scripts/setup-vps.sh | bash -s -- \
  --domain your-domain.com --email your@email.com
```

### Обновление

```bash
cd /opt/shiftcontrol
./scripts/deploy.sh
```

### URLs после деплоя

| Сервис | URL |
|--------|-----|
| Mini App | `https://your-domain.com/` |
| Админка | `https://your-domain.com/login` |
| API + Swagger | `https://your-domain.com/api/docs` |

Требования: VPS с 2+ GB RAM, Ubuntu 22.04+, домен направлен на IP сервера (A-запись).
