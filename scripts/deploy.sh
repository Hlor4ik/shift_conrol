#!/bin/bash
# =============================================================================
# ShiftControl — обновление на VPS
#
# Использование:
#   cd /opt/shiftcontrol
#   ./scripts/deploy.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

log() { echo "==> $*"; }

if [[ ! -f .env.production ]]; then
  echo "Ошибка: .env.production не найден"
  echo "Сначала запусти: ./scripts/setup-vps.sh --domain YOUR_DOMAIN --email YOUR_EMAIL"
  exit 1
fi

log "ShiftControl Deploy"

log "Получение обновлений из git..."
git pull origin main

log "Сборка контейнеров..."
docker compose -f docker-compose.prod.yml build

log "Миграции базы данных..."
docker compose -f docker-compose.prod.yml run --rm api \
  sh -c "cd packages/database && npx prisma migrate deploy"

log "Перезапуск сервисов..."
docker compose -f docker-compose.prod.yml up -d

log "Ожидание (10 сек)..."
sleep 10

if curl -sfk "https://localhost/api/v1/health" -o /dev/null 2>/dev/null || \
   curl -sf "http://localhost/api/v1/health" -o /dev/null 2>/dev/null; then
  log "Health check: OK"
else
  log "Предупреждение: health check не прошёл"
  docker compose -f docker-compose.prod.yml ps
  docker compose -f docker-compose.prod.yml logs --tail=30 api
fi

log "Деплой завершён"
