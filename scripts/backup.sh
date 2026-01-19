#!/usr/bin/env bash
set -euo pipefail
umask 077

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${BACKUP_ENV_FILE:-$ROOT_DIR/.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_NAME_PREFIX="${BACKUP_NAME_PREFIX:-recallio}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DRIVE_RETENTION_DAYS="${BACKUP_DRIVE_RETENTION_DAYS:-90}"
COMPOSE_FILE="${BACKUP_COMPOSE_FILE:-$ROOT_DIR/infra/docker-compose.yml}"

MEDIA_DIR="${BACKUP_MEDIA_DIR:-${MEDIA_DIR:-$ROOT_DIR/api/media}}"
if [ "${MEDIA_DIR#/}" = "$MEDIA_DIR" ]; then
  MEDIA_DIR="$ROOT_DIR/$MEDIA_DIR"
fi

BACKUP_ENABLE_TELEGRAM="${BACKUP_ENABLE_TELEGRAM:-true}"
BACKUP_TELEGRAM_BOT_TOKEN="${BACKUP_TELEGRAM_BOT_TOKEN:-}"
BACKUP_TELEGRAM_CHAT_ID="${BACKUP_TELEGRAM_CHAT_ID:-}"
BACKUP_TELEGRAM_MAX_BYTES="${BACKUP_TELEGRAM_MAX_BYTES:-0}"

BACKUP_ENABLE_DRIVE="${BACKUP_ENABLE_DRIVE:-true}"
BACKUP_DRIVE_REMOTE="${BACKUP_DRIVE_REMOTE:-}"

mkdir -p "$BACKUP_DIR"

compose_cmd=()
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    compose_cmd=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    compose_cmd=(docker-compose)
  fi
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
fi

file_size_bytes() {
  local path="$1"
  if stat -c%s "$path" >/dev/null 2>&1; then
    stat -c%s "$path"
  else
    wc -c < "$path"
  fi
}

get_db_container() {
  if [ ${#compose_cmd[@]} -eq 0 ]; then
    return 1
  fi
  if [ ! -f "$COMPOSE_FILE" ]; then
    return 1
  fi
  local cid
  cid="$("${compose_cmd[@]}" -f "$COMPOSE_FILE" ps -q db 2>/dev/null || true)"
  if [ -n "$cid" ]; then
    echo "$cid"
    return 0
  fi
  return 1
}

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

timestamp="$(date -u +'%Y%m%d_%H%M%S')"
iso_time="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
archive_name="${BACKUP_NAME_PREFIX}_${timestamp}.tar.gz"
archive_path="$BACKUP_DIR/$archive_name"

dump_file="$WORK_DIR/db.dump"
log "Creating database dump."
if cid="$(get_db_container)"; then
  log "Using docker container $cid for pg_dump."
  docker exec -i "$cid" sh -lc 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$dump_file"
else
  if ! command -v pg_dump >/dev/null 2>&1; then
    log "pg_dump not found and no db container detected."
    exit 1
  fi
  if [ -z "${DATABASE_URL:-}" ]; then
    log "DATABASE_URL is not set; cannot run pg_dump."
    exit 1
  fi
  pg_dump -Fc "$DATABASE_URL" > "$dump_file"
fi

if [ ! -s "$dump_file" ]; then
  log "Database dump is empty."
  exit 1
fi

media_included="false"
if [ -d "$MEDIA_DIR" ]; then
  media_included="true"
  log "Archiving media from $MEDIA_DIR."
  tar -C "$MEDIA_DIR" -czf "$WORK_DIR/media.tar.gz" .
else
  log "Media dir not found, skipping: $MEDIA_DIR"
fi

git_commit="unknown"
if command -v git >/dev/null 2>&1 && [ -d "$ROOT_DIR/.git" ]; then
  git_commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
fi

cat > "$WORK_DIR/manifest.txt" <<EOF
created_at_utc=$iso_time
hostname=$(hostname)
git_commit=$git_commit
db_format=pg_dump_custom
media_included=$media_included
EOF

log "Creating archive $archive_path."
tar -C "$WORK_DIR" -czf "$archive_path" .
sha256sum "$archive_path" > "${archive_path}.sha256"

log "Backup size: $(du -h "$archive_path" | cut -f1)."

if [ "${BACKUP_ENABLE_TELEGRAM,,}" = "true" ]; then
  if [ -z "$BACKUP_TELEGRAM_BOT_TOKEN" ] || [ -z "$BACKUP_TELEGRAM_CHAT_ID" ]; then
    log "Telegram is enabled but BACKUP_TELEGRAM_BOT_TOKEN or BACKUP_TELEGRAM_CHAT_ID is missing."
  else
    if [ "$BACKUP_TELEGRAM_MAX_BYTES" -gt 0 ]; then
      size_bytes="$(file_size_bytes "$archive_path")"
      if [ "$size_bytes" -gt "$BACKUP_TELEGRAM_MAX_BYTES" ]; then
        log "Archive exceeds Telegram limit (${BACKUP_TELEGRAM_MAX_BYTES} bytes), skipping upload."
      else
        log "Sending archive to Telegram."
        if ! curl -fsS \
          --retry 3 \
          --retry-delay 5 \
          -F "chat_id=$BACKUP_TELEGRAM_CHAT_ID" \
          -F "document=@$archive_path" \
          -F "caption=Backup $archive_name ($iso_time UTC)" \
          "https://api.telegram.org/bot${BACKUP_TELEGRAM_BOT_TOKEN}/sendDocument" >/dev/null; then
          log "Telegram upload failed."
        fi
      fi
    else
      log "Sending archive to Telegram."
      if ! curl -fsS \
        --retry 3 \
        --retry-delay 5 \
        -F "chat_id=$BACKUP_TELEGRAM_CHAT_ID" \
        -F "document=@$archive_path" \
        -F "caption=Backup $archive_name ($iso_time UTC)" \
        "https://api.telegram.org/bot${BACKUP_TELEGRAM_BOT_TOKEN}/sendDocument" >/dev/null; then
        log "Telegram upload failed."
      fi
    fi
  fi
fi

if [ "${BACKUP_ENABLE_DRIVE,,}" = "true" ]; then
  if [ -z "$BACKUP_DRIVE_REMOTE" ]; then
    log "Drive is enabled but BACKUP_DRIVE_REMOTE is missing."
  elif ! command -v rclone >/dev/null 2>&1; then
    log "rclone not found; skipping Drive upload."
  else
    log "Uploading archive to Drive: $BACKUP_DRIVE_REMOTE."
    rclone copy "$archive_path" "$BACKUP_DRIVE_REMOTE" --checksum --no-traverse
    rclone copy "${archive_path}.sha256" "$BACKUP_DRIVE_REMOTE" --checksum --no-traverse
    if [ -n "$BACKUP_DRIVE_RETENTION_DAYS" ]; then
      rclone delete "$BACKUP_DRIVE_REMOTE" \
        --min-age "${BACKUP_DRIVE_RETENTION_DAYS}d" \
        --filter "+ ${BACKUP_NAME_PREFIX}_*.tar.gz" \
        --filter "+ ${BACKUP_NAME_PREFIX}_*.tar.gz.sha256" \
        --filter "- *"
    fi
  fi
fi

if [ -n "$BACKUP_RETENTION_DAYS" ]; then
  find "$BACKUP_DIR" -type f -name "${BACKUP_NAME_PREFIX}_*.tar.gz*" \
    -mtime "+$BACKUP_RETENTION_DAYS" -print -delete
fi

log "Backup completed: $archive_path"
