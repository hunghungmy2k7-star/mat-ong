#!/usr/bin/env bash
# Khởi động lại môi trường dev: API (cổng 4000) + Vite (cổng 5173). Tham số "reset" để xóa dữ liệu dev.
cd "$(dirname "$0")/.."
for port in 4000 5173; do
  pids=$(lsof -t -i:$port 2>/dev/null)
  [ -n "$pids" ] && kill $pids 2>/dev/null
done
for pid in $(pgrep -f "src/index.js" 2>/dev/null); do kill "$pid" 2>/dev/null; done
sleep 1
[ "$1" = "reset" ] && rm -rf server/data
(cd server && nohup node src/index.js > /tmp/server.log 2>&1 &)
(cd client && nohup npx vite --port 5173 > /tmp/vite.log 2>&1 &)
for i in $(seq 1 20); do
  curl -s -o /dev/null localhost:4000/api/auth/profile && curl -s -o /dev/null localhost:5173 && break
  sleep 0.5
done
echo "API: $(curl -s -o /dev/null -w '%{http_code}' localhost:4000/api/auth/profile) · Web: $(curl -s -o /dev/null -w '%{http_code}' localhost:5173)"
