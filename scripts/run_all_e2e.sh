#!/usr/bin/env bash
# Chạy toàn bộ kiểm thử E2E, mỗi bộ trên một CSDL sạch. Cần Chrome + Playwright (Python).
cd "$(dirname "$0")/.."
(python3 scripts/mock_claude.py >/tmp/mock.log 2>&1 &)
export ANTHROPIC_API_KEY=test ANTHROPIC_API_URL=http://localhost:4999/v1/messages
export NODE_TLS_REJECT_UNAUTHORIZED=0  # chỉ để test push với máy chủ push giả (chứng chỉ tự ký)
fail=0
for t in vocab practice srs roadmap social store community classes ai_games landing push; do
  bash scripts/dev-restart.sh reset >/dev/null 2>&1; sleep 3
  if timeout 600 python3 "scripts/e2e_$t.py" > "/tmp/e2e_$t.log" 2>&1; then echo "PASS $t"; else echo "FAIL $t (xem /tmp/e2e_$t.log)"; fail=1; fi
done
exit $fail
