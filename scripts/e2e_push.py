"""E2E: Nhắc học bằng Web Push + đếm ngược ngày thi trên Header.
Dịch vụ push của trình duyệt được giả lập bằng một máy chủ HTTPS cục bộ (chứng chỉ tự ký) để kiểm tra máy chủ gửi đúng.
Cần API chạy với NODE_TLS_REJECT_UNAUTHORIZED=0 (chỉ khi kiểm thử).
"""
import base64
import json
import os
import ssl
import subprocess
import threading
import urllib.request
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)
BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/push')
OUT.mkdir(parents=True, exist_ok=True)
SERVER = Path('/home/claude/matong/server')

# ---- máy chủ push giả (HTTPS) ----
RECEIVED = []
cert = OUT / 'cert.pem'
key = OUT / 'key.pem'
if not cert.exists():
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', str(key), '-out', str(cert),
                    '-days', '2', '-subj', '/CN=localhost'], check=True, capture_output=True)


class Push(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        RECEIVED.append({'path': self.path, 'auth': self.headers.get('Authorization', ''), 'ttl': self.headers.get('TTL'),
                         'enc': self.headers.get('Content-Encoding'), 'len': len(body)})
        self.send_response(410 if 'gone' in self.path else 201)
        self.end_headers()


httpd = HTTPServer(('127.0.0.1', 4998), Push)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(str(cert), str(key))
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

# khóa p256dh hợp lệ (P-256) cho subscription giả
P256 = subprocess.run(['node', '-e', "const c=require('crypto').createECDH('prime256v1');c.generateKeys();process.stdout.write(c.getPublicKey().toString('base64url'))"],
                      capture_output=True, text=True, check=True).stdout
AUTH = base64.urlsafe_b64encode(os.urandom(16)).decode().rstrip('=')


class User:
    def __init__(self, email):
        self.jar = CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        code = self.call('/auth/email/request-code', {'email': email})['devCode']
        self.id = self.call('/auth/email/verify-code', {'email': email, 'code': code})['user']['id']

    def call(self, path, body=None, method=None):
        req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
        return json.loads(self.op.open(req).read())


def run_reminders(iso):
    out = subprocess.run(['node', '-e', f"import('./src/push.js').then(m=>m.runReminders(new Date('{iso}'))).then(n=>process.stdout.write(String(n)))"],
                         cwd=SERVER, capture_output=True, text=True, env={**os.environ, 'NODE_TLS_REJECT_UNAUTHORIZED': '0', 'NODE_NO_WARNINGS': '1'})
    assert out.returncode == 0, out.stderr
    return int(out.stdout.strip().splitlines()[-1])


u = User('nhac@matong.dev')
cat = u.call('/categories', {'name': 'Nhắc'})['id']
u.call('/vocabularies/bulk', {'categoryId': cat, 'items': [{'word': 'remind', 'meaning': 'nhắc nhở'}, {'word': 'habit', 'meaning': 'thói quen'}]})

errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = br.new_context(viewport={'width': 1504, 'height': 900})
    c.grant_permissions(['notifications'], origin=BASE)
    c.add_cookies([{'name': x.name, 'value': x.value, 'domain': 'localhost', 'path': '/'} for x in u.jar])
    c.add_init_script(f"""
      const fake = {{ endpoint: 'https://localhost:4998/push/abc', keys: {{ p256dh: '{P256}', auth: '{AUTH}' }} }};
      fake.toJSON = () => ({{ endpoint: fake.endpoint, keys: fake.keys }});
      fake.unsubscribe = async () => true;
      let subscribed = null;
      if (window.PushManager) {{
        PushManager.prototype.subscribe = async function () {{ subscribed = fake; return fake; }};
        PushManager.prototype.getSubscription = async function () {{ return subscribed; }};
      }}
    """)
    pg = c.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.goto(f'{BASE}/home')
    pg.get_by_text('Nhấn để xem hồ sơ').click()

    # ngày thi → đếm ngược trên Header
    exam = (datetime.now(timezone(timedelta(hours=7))) + timedelta(days=10)).strftime('%Y-%m-%d')
    pg.locator('input[type=date]').fill(exam)
    expect(pg.get_by_test_id('exam-countdown')).to_contain_text('ngày')

    # bật nhắc học
    pg.get_by_text('21:00', exact=True).click()
    pg.locator('[data-testid=remind-switch]').click()
    expect(pg.get_by_text('Đã bật nhắc học lúc 21:00 mỗi ngày')).to_be_visible()
    assert pg.evaluate("navigator.serviceWorker.getRegistration('/sw.js').then(r => !!r)")
    pg.get_by_test_id('remind-test').click()
    expect(pg.get_by_text('Đã gửi thông báo thử')).to_be_visible()
    pg.screenshot(path=str(OUT / 'profile-remind.png'))
    pg.keyboard.press('Escape')
    expect(pg.get_by_test_id('exam-countdown')).to_contain_text(':')
    pg.screenshot(path=str(OUT / 'header-countdown.png'))

    # thông báo mở thẳng modal SRS
    pg.goto(f'{BASE}/practice?srs=1')
    expect(pg.get_by_text('PHÂN BỐ TỪ VỰNG THEO CẤP ĐỘ', exact=False)).to_be_visible()
    br.close()

assert len(RECEIVED) == 1, RECEIVED
r = RECEIVED[0]
assert r['path'] == '/push/abc' and r['auth'].startswith('vapid ') and r['enc'] == 'aes128gcm' and r['len'] > 0, r

# lịch nhắc: đúng 21:00 giờ VN mới gửi, mỗi ngày một lần
today_vn = datetime.now(timezone(timedelta(hours=7))).date()
at = lambda hh, mm: datetime(today_vn.year, today_vn.month, today_vn.day, hh, mm, tzinfo=timezone(timedelta(hours=7))).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
assert run_reminders(at(20, 59)) == 0
assert run_reminders(at(21, 0)) == 1
assert run_reminders(at(21, 0)) == 0  # đã nhắc hôm nay
assert len(RECEIVED) == 2

# subscription hết hạn (410) bị xóa
u.call('/push/subscribe', {'subscription': {'endpoint': 'https://localhost:4998/push/gone', 'keys': {'p256dh': P256, 'auth': AUTH}}})
subprocess.run(['node', '-e', "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('data/matong.db');d.exec(\"UPDATE users SET settings_json=json_remove(settings_json,'$.lastRemindDay')\")"],
               cwd=SERVER, check=True)
assert run_reminders(at(21, 0)) == 1  # abc gửi được, gone bị xóa
n = subprocess.run(['node', '-e', "const {DatabaseSync}=require('node:sqlite');process.stdout.write(String(new DatabaseSync('data/matong.db').prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n))"],
                   cwd=SERVER, capture_output=True, text=True).stdout
assert n == '1', n

print('errors:', errors)
assert not errors
print('PUSH E2E OK')
