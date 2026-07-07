#!/bin/bash
# =============================================================================
# ShiftControl — первичная установка на VPS (Ubuntu 22.04/24.04, Debian 12)
#
# Использование (на VPS под root):
#   curl -fsSL https://raw.githubusercontent.com/Hlor4ik/shift_conrol/main/scripts/setup-vps.sh | bash -s -- \
#     --domain shift.example.com \
#     --email admin@example.com
#
# Или после git clone:
#   chmod +x scripts/setup-vps.sh
#   sudo ./scripts/setup-vps.sh --domain shift.example.com --email admin@example.com
# =============================================================================
set -euo pipefail

DOMAIN=""
EMAIL=""
INSTALL_DIR="/opt/shiftcontrol"
REPO_URL="https://github.com/Hlor4ik/shift_conrol.git"
BRANCH="main"
SKIP_SSL=false

usage() {
  echo "Usage: $0 --domain DOMAIN --email EMAIL [--dir /opt/shiftcontrol] [--skip-ssl]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --skip-ssl) SKIP_SSL=true; shift ;;
    *) usage ;;
  esac
done

[[ -z "$DOMAIN" || -z "$EMAIL" ]] && usage

if [[ $EUID -ne 0 ]]; then
  echo "Запусти от root: sudo $0 --domain $DOMAIN --email $EMAIL"
  exit 1
fi

log() { echo "==> $*"; }

log "ShiftControl VPS Setup"
log "Домен: $DOMAIN"
log "Директория: $INSTALL_DIR"

# --- Docker ---
if ! command -v docker &>/dev/null; then
  log "Установка Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  log "Docker уже установлен"
fi

if ! docker compose version &>/dev/null; then
  log "Ошибка: docker compose plugin не найден"
  exit 1
fi

# --- Certbot ---
if [[ "$SKIP_SSL" == false ]]; then
  if ! command -v certbot &>/dev/null; then
    log "Установка certbot..."
    apt-get update -qq
    apt-get install -y -qq certbot
  fi

  if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    log "Получение SSL-сертификата для $DOMAIN..."
    systemctl stop nginx 2>/dev/null || true
    docker compose -f "$INSTALL_DIR/docker-compose.prod.yml" down 2>/dev/null || true
    certbot certonly --standalone \
      -d "$DOMAIN" \
      --email "$EMAIL" \
      --agree-tos \
      --non-interactive \
      --preferred-challenges http
  else
    log "SSL-сертификат уже существует"
  fi
fi

# --- Клонирование ---
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  log "Клонирование репозитория..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
else
  log "Обновление репозитория..."
  cd "$INSTALL_DIR"
  git pull origin "$BRANCH"
fi

cd "$INSTALL_DIR"

# --- .env.production ---
if [[ ! -f .env.production ]]; then
  log "Создание .env.production..."
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  PG_PASS=$(openssl rand -hex 16)
  MINIO_PASS=$(openssl rand -hex 16)

  cat > .env.production <<EOF
DOMAIN=${DOMAIN}
POSTGRES_DB=shiftcontrol
POSTGRES_USER=app
POSTGRES_PASSWORD=${PG_PASS}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
YANDEX_MAPS_API_KEY=
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=${MINIO_PASS}
S3_BUCKET=shiftcontrol
S3_PUBLIC_URL=https://${DOMAIN}/files
CORS_ORIGINS=https://${DOMAIN}
API_PORT=3001
WEB_PORT=3000
SUPERADMIN_EMAIL=admin@shiftcontrol.local
SUPERADMIN_PASSWORD=Admin123!@#
EOF
  chmod 600 .env.production
  log ".env.production создан (пароли сгенерированы автоматически)"
else
  log ".env.production уже существует — не перезаписываем"
fi

# --- Сборка и запуск ---
log "Сборка Docker-образов (5–15 мин)..."
docker compose -f docker-compose.prod.yml build

log "Запуск инфраструктуры..."
docker compose -f docker-compose.prod.yml up -d postgres redis minio
sleep 8

log "Миграции базы данных..."
docker compose -f docker-compose.prod.yml run --rm api \
  sh -c "cd packages/database && npx prisma migrate deploy"

log "Первичный seed (если БД пустая)..."
docker compose -f docker-compose.prod.yml run --rm api \
  sh -c "cd packages/database && npx prisma db seed" || true

log "Запуск всех сервисов..."
docker compose -f docker-compose.prod.yml up -d

log "Ожидание старта (15 сек)..."
sleep 15

# --- Health check ---
if curl -sf "http://localhost/api/v1/health" -o /dev/null 2>/dev/null || \
   curl -sfk "https://localhost/api/v1/health" -o /dev/null 2>/dev/null; then
  log "Health check: OK"
else
  log "Health check: не прошёл (сервисы могут ещё стартовать)"
  docker compose -f docker-compose.prod.yml ps
fi

# --- Cron для SSL renewal ---
CRON_CMD="0 3 * * * certbot renew --quiet --deploy-hook 'cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml restart nginx'"
(crontab -l 2>/dev/null | grep -v "certbot renew" || true; echo "$CRON_CMD") | crontab -

echo ""
echo "============================================"
echo "  ShiftControl установлен!"
echo "============================================"
echo "  Mini App:  https://${DOMAIN}/"
echo "  Админка:   https://${DOMAIN}/login"
echo "  API docs:  https://${DOMAIN}/api/docs"
echo ""
echo "  Логин:     admin@shiftcontrol.local"
echo "  Пароль:    Admin123!@#  (смени после входа!)"
echo ""
echo "  Обновление: cd ${INSTALL_DIR} && ./scripts/deploy.sh"
echo "============================================"
