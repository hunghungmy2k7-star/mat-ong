#!/usr/bin/env bash
# Sao lưu dữ liệu Mật Ong (CSDL + ảnh tải lên + khóa thông báo). Giữ 14 bản gần nhất.
# Dùng: bash /opt/matong/scripts/backup.sh [thư-mục-lưu]   (mặc định /root/matong-backups)
# Cần: apt install -y sqlite3
set -e
cd "$(dirname "$0")/../server"
DATA="${DATA_DIR:-data}"
OUT="${1:-/root/matong-backups}"
mkdir -p "$OUT"
STAMP=$(date +%F-%H%M)
sqlite3 "$DATA/matong.db" ".backup '$OUT/matong-$STAMP.db'"
FILES=$(cd "$DATA" && ls -d uploads vapid.json 2>/dev/null || true)
[ -n "$FILES" ] && tar -czf "$OUT/files-$STAMP.tgz" -C "$DATA" $FILES
ls -1t "$OUT"/matong-*.db | tail -n +15 | xargs -r rm --
ls -1t "$OUT"/files-*.tgz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Đã sao lưu vào $OUT ($STAMP)"
