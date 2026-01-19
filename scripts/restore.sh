#!/usr/bin/env bash
set -euo pipefail
umask 077

usage() {
  echo "Usage: $0 --force /path/to/backup.tar.gz"
  echo "Or set BACKUP_RESTORE_CONFIRM=yes and run without --force."
}

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

force="false"
if [ "${1:-}" = "--force" ]; then
  force="true"
  shift
fi

archive="${1:-}"
if [ -z "$archive" ]; then
  usage
  exit 1
fi

if [ "$force" != "true" ] && [ "${BACKUP_RESTORE_CONFIRM:-}" != "yes" ]; then
  echo "This will overwrite database/media. Re-run with --force or BACKUP_RESTORE_CONFIRM=yes."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${BACKUP_ENV_FILE:-$ROOT_DIR/.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

COMPOSE_FILE="${BACKUP_COMPOSE_FILE:-$ROOT_DIR/infra/docker-compose.yml}"
MEDIA_DIR="${BACKUP_MEDIA_DIR:-${MEDIA_DIR:-$ROOT_DIR/api/media}}"
if [ "${MEDIA_DIR#/}" = "$MEDIA_DIR" ]; then
  MEDIA_DIR="$ROOT_DIR/$MEDIA_DIR"
fi

BACKUP_RESTORE_CLEAN_MEDIA="${BACKUP_RESTORE_CLEAN_MEDIA:-false}"

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

if [ ! -f "$archive" ]; then
  log "Archive not found: $archive"
  exit 1
fi

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

log "Extracting backup."
tar -xzf "$archive" -C "$WORK_DIR"

dump_file="$WORK_DIR/db.dump"
if [ ! -f "$dump_file" ]; then
  log "db.dump not found in archive."
  exit 1
fi

log "Restoring database."
if cid="$(get_db_container)"; then
  docker exec -i "$cid" sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"' >/dev/null
  docker exec -i "$cid" sh -lc 'pg_restore --clean --if-exists --no-owner --dbname "$POSTGRES_DB"' < "$dump_file"
else
  if ! command -v pg_restore >/dev/null 2>&1; then
    log "pg_restore not found and no db container detected."
    exit 1
  fi
  if [ -z "${DATABASE_URL:-}" ]; then
    log "DATABASE_URL is not set; cannot run pg_restore."
    exit 1
  fi
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" >/dev/null
  fi
  pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" < "$dump_file"
fi

media_archive="$WORK_DIR/media.tar.gz"
if [ -f "$media_archive" ]; then
  if [ "${BACKUP_RESTORE_CLEAN_MEDIA,,}" = "true" ]; then
    log "Cleaning media dir before restore: $MEDIA_DIR"
    rm -rf "$MEDIA_DIR"
  fi
  mkdir -p "$MEDIA_DIR"
  log "Restoring media to $MEDIA_DIR."
  tar -xzf "$media_archive" -C "$MEDIA_DIR"
else
  log "No media archive found in backup."
fi

log "Restore completed."
