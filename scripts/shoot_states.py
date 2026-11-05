"""Chụp các trạng thái tương tác: drawer mobile, thu gọn sidebar, dark mode, hồ sơ, luồng đăng nhập email."""
import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = Path('/home/claude/shots')
EMAIL = 'test@matong.dev'


def dev_code():
    req = urllib.request.Request('http://localhost:4000/api/auth/email/request-code', data=json.dumps({'email': EMAIL}).encode(),
                                 headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())['devCode']


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

    # Luồng đăng nhập email qua giao diện thật
    page = b.new_page(viewport={'width': 1280, 'height': 720})
    page.goto(f'{BASE}/login')
    page.get_by_text('Tiếp tục với email').click()
    page.get_by_placeholder('ban@email.com').fill(EMAIL)
    page.get_by_role('button', name='Gửi mã').click()
    page.wait_for_selector('text=Nhập mã xác nhận')
    page.screenshot(path=str(OUT / 'state-login-code.png'))
    code = page.locator('text=mã của bạn là').locator('b').inner_text()
    page.locator('input').first.click()
    page.keyboard.type(code)
    page.wait_for_url('**/home', timeout=8000)
    page.wait_for_timeout(800)
    print('login via UI ok ->', page.url)

    # Thu gọn sidebar
    page.get_by_label('Thu gọn thanh bên').click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / 'state-collapsed.png'))
    page.get_by_label('Mở rộng thanh bên').click()

    # Dark mode
    page.get_by_text('Tối', exact=True).click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / 'state-dark.png'))
    page.get_by_text('Sáng', exact=True).click()

    # Hồ sơ
    page.get_by_text('Nhấn để xem hồ sơ').click()
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / 'state-profile.png'))
    page.keyboard.press('Escape')

    # Cộng đồng
    page.get_by_text('Chọn Fb hoặc Zalo').click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / 'state-community.png'))

    # Drawer mobile
    m = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mp = m.new_page()
    mp.goto(f'{BASE}/login')
    mp.evaluate("""async ([e, c]) => { await fetch('/api/auth/email/verify-code', {method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include', body: JSON.stringify({email: e, code: c})}); }""", [EMAIL, dev_code()])
    mp.goto(f'{BASE}/home')
    mp.wait_for_timeout(800)
    mp.get_by_label('Mở menu').click()
    mp.wait_for_timeout(500)
    mp.screenshot(path=str(OUT / 'state-drawer.png'))
    mp.get_by_text('Bộ từ vựng').click()
    mp.wait_for_timeout(500)
    print('drawer nav ->', mp.url)
    b.close()
