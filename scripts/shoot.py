"""Chụp màn hình bản Mật Ong để so với site mẫu.
Cách dùng: python3 shoot.py <thư mục ra> [đường dẫn ...]"""
import json
import sys
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'shots')
PAGES = sys.argv[2:] or ['/home']
OUT.mkdir(parents=True, exist_ok=True)
EMAIL = 'test@matong.dev'


def post(path, body, ctx=None):
    req = urllib.request.Request(f'http://localhost:4000/api{path}', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # trang đăng nhập (chưa đăng nhập)
    anon = browser.new_page(viewport={'width': 1280, 'height': 720})
    anon.goto(f'{BASE}/login')
    anon.wait_for_timeout(800)
    anon.screenshot(path=str(OUT / 'login.png'))

    for name, vp, mobile in [('desktop1504', (1504, 812), False), ('desktop1106', (1106, 862), False), ('mobile', (390, 844), True)]:
        ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mobile, has_touch=mobile,
                                  device_scale_factor=1)
        page = ctx.new_page()
        code = post('/auth/email/request-code', {'email': EMAIL})['devCode']
        page.goto(f'{BASE}/login')
        page.evaluate("""async ([email, code]) => { await fetch('/api/auth/email/verify-code', {method:'POST',
            headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({email, code})}); }""",
                      [EMAIL, code])
        for path in PAGES:
            page.goto(f'{BASE}{path}')
            page.wait_for_timeout(1200)
            slug = path.strip('/').replace('/', '_') or 'root'
            page.screenshot(path=str(OUT / f'{slug}-{name}.png'), full_page=(name == 'desktop1504'))
        ctx.close()
    browser.close()
print('ok', sorted(x.name for x in OUT.iterdir()))
