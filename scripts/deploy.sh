#!/bin/bash
#
# Deploy do remix-songs na VPS.
#
# Uso (na VPS, após /opt/remix-songs estar configurado):
#   sudo /opt/remix-songs/scripts/deploy.sh
#
# Workflow esperado:
#   1) git push origin main (do seu PC)
#   2) SSH na VPS
#   3) sudo /opt/remix-songs/scripts/deploy.sh
#
# O que faz:
#   - git pull --ff-only origin main (traz o código novo)
#   - rebuilda a imagem 'next' (Postgres e Caddy não precisam recriar)
#   - aplica migrations (idempotente)
#   - up -d next (só recria o container Next)
#   - mostra tail do log do Next pra confirmar Ready
#
set -euo pipefail

REPO_DIR=/opt/remix-songs
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
ENV_FILE="$REPO_DIR/.env.production"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

log() { echo "$(date -Is) [deploy] $*"; }

cd "$REPO_DIR"

# Confirma branch (main após Fase 11)
BRANCH=$(git branch --show-current)
log "branch atual: $BRANCH"

# Pull
log "git pull --ff-only"
git pull --ff-only origin "$BRANCH"

# Build do Next (deps cache fica em layer; só rebuilda o que mudou)
log "build da imagem 'next'"
compose build next

# Aplicar migrations (idempotente — drizzle-kit detecta se já aplicadas)
log "rodando migrate (idempotente)"
compose run --rm migrate

# Recriar só o container Next (postgres e caddy continuam de pé)
log "up -d next (recriação só do Next)"
compose up -d next

# Aguardar Next ficar Ready
log "aguardando Next responder..."
sleep 5

# Tail dos logs do Next pra mostrar Ready (ou erro)
log "últimas linhas do log do Next:"
compose logs --tail=15 next

# Estado final
log "estado dos containers:"
compose ps

log "deploy concluído"
