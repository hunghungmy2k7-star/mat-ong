"""E2E: Trang giới thiệu, Điều khoản, Quyền riêng tư, 404, chuyển hướng khi đã đăng nhập, xóa tài khoản."""
import json
import re
import urllib.request
import urllib.error
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)
BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/landing')
OUT.mkdir(parents=True, exist_ok=True)


class User:
    def __init__(self, email):
        self.jar = CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        code = self.call('/auth/email/request-code', {'email': email})['devCode']
        self.call('/auth/email/verify-code', {'email': email, 'code': code})

    def call(self, path, body=None, method=None):
        req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
        return json.loads(self.op.open(req).read())


errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for w, h, tag in ((1504, 900, 'desktop'), (390, 844, 'mobile')):
        pg = br.new_context(viewport={'width': w, 'height': h}).new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and '401' not in m.text and errors.append(m.text))
        pg.goto(f'{BASE}/')
        expect(pg.get_by_role('heading', level=1)).to_contain_text('Học từ vựng tiếng Anh')
        pg.screenshot(path=str(OUT / f'landing-{tag}.png'), full_page=True)
        assert pg.evaluate('document.documentElement.scrollWidth') <= w + 2
        pg.get_by_text('Mật Ong có mất phí không?').click()
        expect(pg.get_by_text('Mọi tính năng đều miễn phí', exact=False)).to_be_visible()
        pg.get_by_role('button', name='Bắt đầu học ngay').click()
        expect(pg).to_have_url(f'{BASE}/register')
        pg.get_by_role('link', name='Chính sách quyền riêng tư').click()
        expect(pg.get_by_role('heading', level=1)).to_have_text('Chính sách quyền riêng tư')
        pg.get_by_role('link', name='Điều khoản sử dụng').last.click()
        expect(pg.get_by_role('heading', level=1)).to_have_text('Điều khoản sử dụng')
        pg.screenshot(path=str(OUT / f'terms-{tag}.png'))
        pg.goto(f'{BASE}/khong-co-trang-nay')
        expect(pg.get_by_text('Không tìm thấy trang')).to_be_visible()
        pg.get_by_role('button', name='Về trang giới thiệu').click()
        expect(pg).to_have_url(f'{BASE}/')

    # đã đăng nhập → "/" chuyển sang /home; xóa tài khoản
    u = User('xoa@matong.dev')
    cat = u.call('/categories', {'name': 'Tạm'})['id']
    u.call('/vocabularies/bulk', {'categoryId': cat, 'items': [{'word': 'bye', 'meaning': 'tạm biệt'}]})
    ctx = br.new_context(viewport={'width': 1504, 'height': 900})
    ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(f'{BASE}/')
    expect(pg).to_have_url(f'{BASE}/home')
    pg.get_by_text('Nhấn để xem hồ sơ').click()
    pg.get_by_role('button', name='Xóa tài khoản').click()
    btn = pg.get_by_role('button', name='Xóa vĩnh viễn')
    expect(btn).to_be_disabled()
    pg.get_by_label('Email xác nhận').fill('XOA@matong.dev')
    btn.click()
    expect(pg).to_have_url(f'{BASE}/')
    try:
        u.call('/auth/profile')
        raise AssertionError('tài khoản vẫn còn')
    except urllib.error.HTTPError as e:
        assert e.code == 401
    # đăng ký lại cùng email = tài khoản mới, không còn dữ liệu cũ
    u2 = User('xoa@matong.dev')
    assert u2.call('/vocabularies?pageSize=5')['items'] == []
    br.close()

print('errors:', errors)
assert not errors
print('LANDING E2E OK')
