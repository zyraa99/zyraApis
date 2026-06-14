#!/bin/bash
set -e

trap "kill 0" EXIT

cd /home/container

echo "[Startup] Working directory: $(pwd)"
echo "[Startup] CMD: ${CMD_RUN}"

if [[ "${CLOUDFLARE_TUNNEL}" == "true" || "${CLOUDFLARE_TUNNEL}" == "1" ]]; then

  echo "[Cloudflare Tunnel] Enabled"

  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "[Cloudflare Tunnel] ERROR: cloudflared not installed"
    exit 1
  fi

  if [[ -z "${CLOUDFLARE_TOKEN}" ]]; then
    echo "[Cloudflare Tunnel] ERROR: CLOUDFLARE_TOKEN is empty"
    exit 1
  fi

  echo "[Cloudflare Tunnel] Starting tunnel..."

  nohup cloudflared tunnel run --no-autoupdate --token "${CLOUDFLARE_TOKEN}" > /tmp/cloudflared.log 2>&1 &

  CF_PID=$!

  echo "[Cloudflare Tunnel] PID: ${CF_PID}"

  sleep 3

  if ! kill -0 "$CF_PID" 2>/dev/null; then
    echo "[Cloudflare Tunnel] ERROR: cloudflared failed to start"
    cat /tmp/cloudflared.log || true
    exit 1
  fi

  for i in {1..15}; do
    if grep -q "Registered tunnel connection" /tmp/cloudflared.log 2>/dev/null; then
      echo "[Cloudflare Tunnel] Tunnel started successfully"
      break
    fi
    sleep 2
  done

  if ! grep -q "Registered tunnel connection" /tmp/cloudflared.log 2>/dev/null; then
    echo "[Cloudflare Tunnel] WARNING: Tunnel may not be fully connected"
    cat /tmp/cloudflared.log || true
  fi

else

  echo "[Cloudflare Tunnel] Disabled"

fi

echo "[Startup] Running main command..."
exec bash -c "${CMD_RUN}"
