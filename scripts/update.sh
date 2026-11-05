#!/usr/bin/env bash
# Cập nhật Mật Ong trên VPS: lấy code mới từ GitHub, build lại giao diện, khởi động lại.
# Dùng: bash /opt/matong/scripts/update.sh
set -e
cd "$(dirname "$0")/.."
git pull
(cd client && npm install && npm run build)
(cd server && npm install --omit=dev)
pm2 restart matong
echo "Đã cập nhật xong."
