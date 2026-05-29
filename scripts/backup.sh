#!/bin/bash
#
# Daily backup do Postgres da VPS (remix-prod-postgres) com:
#   - pg_dump comprimido em /var/backups/remix/remix-YYYYMMDD-HHMMSS.sql.gz
#   - retenção local de 7 dias
#   - upload para Google Drive via rclone (reusa config do user `recorder`)
#
# Uso: rodado pelo cron /etc/cron.d/remix-backup (como root).
# Para rodar à mão: sudo /opt/remix-songs/scripts/backup.sh
#
set -euo pipefail

# Caminhos
BACKUP_DIR=/var/backups/remix
PG_CONTAINER=remix-prod-postgres
PG_USER=postgres
PG_DB=remix
RCLONE_REMOTE=gdrive:remix-songs-backups

# rclone configurado para o user `recorder` — root lê por ser super-user
export RCLONE_CONFIG=/home/recorder/.config/rclone/rclone.conf

# Helpers
log() { echo "$(date -Is) [backup] $*"; }
die() { echo "$(date -Is) [backup] ERROR: $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/remix-$STAMP.sql.gz"

# 1) pg_dump → gzip
log "iniciando pg_dump de $PG_DB"
if ! docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" \
    --no-owner --clean --if-exists | gzip > "$FILE"; then
  die "pg_dump falhou"
fi

# Verifica que o dump não saiu vazio (ex.: container morto ou senha errada)
if [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  die "dump ficou vazio"
fi
SIZE=$(du -h "$FILE" | cut -f1)
log "dump OK: $FILE ($SIZE)"

# 2) Retenção local (7 dias)
DELETED=$(find "$BACKUP_DIR" -name "remix-*.sql.gz" -mtime +7 -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && log "retenção: removidos $DELETED dump(s) > 7 dias"

# 3) Upload pro Google Drive
log "enviando pro Google Drive: $RCLONE_REMOTE/"
if ! rclone copy "$FILE" "$RCLONE_REMOTE/" --quiet; then
  die "rclone copy falhou (arquivo local preservado em $FILE)"
fi
log "upload OK"

log "backup concluído: $FILE"
