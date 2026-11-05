"""E2E: Cửa hàng – quà hằng ngày, mua/áp dụng/gỡ avatar, hình nền, giao diện mùa, meme, đá streak, upload ảnh."""
import base64
import json
import subprocess
import urllib.request
import urllib.error
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/store')
OUT.mkdir(parents=True, exist_ok=True)
SERVER = Path('/home/claude/matong/server')


class User:
    def __init__(self, email):
        self.email = email
        self.jar = CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        code = self.call('/auth/email/request-code', {'email': email})['devCode']
        self.user = self.call('/auth/email/verify-code', {'email': email, 'code': code})['user']

    def call(self, path, body=None, method=None):
        req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
        return json.loads(self.op.open(req).read())

    def err(self, path, body=None):
        try:
            self.call(path, body if body is not None else {})
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())['error']
        return None


def sql(q):
    subprocess.run(['node', '-e', f"const {{DatabaseSync}}=require('node:sqlite');new DatabaseSync('data/matong.db').exec({json.dumps(q)})"],
                   cwd=SERVER, check=True)


u = User('shop@matong.dev')
uid = u.user['id']
sql(f'UPDATE users SET coins = 200000 WHERE id = {uid}')

# --- API: freeze không có ngày trống thì vẫn lấp ngày gần nhất, không tính vào BXH lượt chơi
cat = u.call('/categories', {'name': 'shop'})
u.call('/vocabularies/bulk', {'categoryId': cat['id'], 'items': [{'word': 'apple', 'meaning': 'quả táo'}, {'word': 'banana', 'meaning': 'quả chuối'},
                                                                  {'word': 'cherry', 'meaning': 'quả anh đào'}, {'word': 'grape', 'meaning': 'quả nho'}]})
r = u.call('/shop/streak-freeze', {})
assert r['user']['coins'] == 200000 - 2000, r
lb = u.call('/activity/leaderboard?type=games')
assert not any(x['id'] == uid for x in lb), 'freeze không được tính lượt chơi'
assert u.call('/practice/history') == []
# upload: sai định dạng / chưa mua
assert u.err('/shop/upload/avatar-upload', {'dataUrl': 'data:image/png;base64,AAAA'})[0] == 403
assert u.err('/shop/purchase/avatar-to-ong')[0] == 400  # miễn phí, đã có
print('api ok')

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
png_path = OUT / 'tiny.png'
png_path.write_bytes(PNG)

errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 1504, 'height': 900})
    ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
    ctx.add_init_script("localStorage.setItem('matong.gameSettings', JSON.stringify({autoDelay: 1, autoNext: true, soundOn: false}))")
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))

    pg.goto(f'{BASE}/store')
    expect(pg.get_by_test_id('store-coins')).to_have_text('198.000')
    pg.screenshot(path=str(OUT / '1-avatar-tab.png'), full_page=True)

    # mua avatar "Rừng thông" → tự áp dụng, hiện trên card trang chủ
    pg.get_by_test_id('buy-avatar-rung').click()
    pg.get_by_test_id('confirm-ok').click()
    expect(pg.get_by_test_id('item-avatar-rung').get_by_text('ĐANG DÙNG')).to_be_visible()
    expect(pg.get_by_test_id('store-coins')).to_have_text('196.000')

    # upload avatar
    pg.get_by_test_id('buy-avatar-upload').click()
    pg.get_by_test_id('confirm-ok').click()
    expect(pg.get_by_test_id('upload-avatar-upload')).to_be_visible()
    pg.get_by_test_id('file-avatar-upload').set_input_files(str(png_path))
    expect(pg.get_by_test_id('item-avatar-upload').get_by_text('ĐANG DÙNG')).to_be_visible()
    expect(pg.get_by_text('Mỗi lần đổi ảnh mất 5.000 xu.')).to_be_visible()
    me = u.call('/auth/profile')['user']
    assert me['avatarUrl'].startswith('/uploads/'), me['avatarUrl']
    assert urllib.request.urlopen(f'http://localhost:5173{me["avatarUrl"]}').read() == PNG
    # áp dụng lại Rừng thông
    pg.get_by_test_id('equip-avatar-rung').click()
    expect(pg.get_by_test_id('item-avatar-rung').get_by_text('ĐANG DÙNG')).to_be_visible()

    # hình nền
    pg.get_by_role('button', name='🖼 Hình nền').click()
    pg.get_by_test_id('buy-wall-dots').click()
    pg.get_by_test_id('confirm-ok').click()
    expect(pg.get_by_test_id('wallpaper')).to_be_attached()
    pg.get_by_test_id('panorama').click()
    pg.screenshot(path=str(OUT / '2-panorama.png'))
    pg.get_by_test_id('panorama-off').click()

    # đặc biệt: quà hằng ngày, theme, meme
    pg.get_by_role('button', name='☆ Đặc biệt').click()
    assert 'tab=special' in pg.url
    pg.get_by_test_id('daily-reward').click()
    expect(pg.get_by_test_id('daily-reward')).to_have_text('Đã nhận hôm nay')
    pg.get_by_test_id('buy-theme-tet').click()
    pg.get_by_test_id('confirm-ok').click()
    expect(pg.get_by_test_id('particles-tet')).to_be_attached()
    assert pg.evaluate("document.documentElement.getAttribute('data-theme-style')") == 'tet'
    for m in ('meme-ong-like', 'meme-meo-hoi'):
        pg.get_by_test_id(f'buy-{m}').click()
        pg.get_by_test_id('confirm-ok').click()
        expect(pg.get_by_test_id(f'item-{m}').get_by_text('ĐANG DÙNG')).to_be_visible()
    pg.screenshot(path=str(OUT / '3-special.png'), full_page=True)

    coins = u.call('/auth/profile')['user']['coins']
    assert coins == 200000 - 2000 - 2000 - 10000 - 3000 - 50000 - 3000 - 3000 + 50, coins

    # trang chủ: avatar + theme
    pg.goto(f'{BASE}/home')
    pg.wait_for_timeout(500)
    assert 'rung-thong.svg' in pg.content() or pg.evaluate("[...document.querySelectorAll('*')].some(e => getComputedStyle(e).backgroundImage.includes('rung-thong'))")
    pg.screenshot(path=str(OUT / '4-home-tet.png'))

    # meme hiện khi trả lời trong trò chơi trắc nghiệm
    pg.goto(f'{BASE}/practice')
    pg.get_by_test_id('mode-quiz').click()
    pg.get_by_text('Từ -> Nghĩa').click()
    pg.wait_for_selector('[data-testid=opt-1]')
    pg.locator('[data-correct=true]').first.click()
    expect(pg.get_by_test_id('meme-correct')).to_be_visible()
    pg.screenshot(path=str(OUT / '5-meme.png'))

    # gỡ theme
    pg.goto(f'{BASE}/store?tab=special')
    pg.get_by_test_id('unequip-theme-tet').click()
    expect(pg.get_by_test_id('particles-tet')).not_to_be_attached()

    # mobile
    m = br.new_context(viewport={'width': 390, 'height': 844})
    m.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
    mp = m.new_page()
    mp.goto(f'{BASE}/store')
    expect(mp.get_by_test_id('store-coins')).to_be_visible()
    mp.screenshot(path=str(OUT / '6-mobile.png'), full_page=True)
    sw = mp.evaluate('document.documentElement.scrollWidth')
    assert sw <= 392, sw
    br.close()

print('errors:', errors)
assert not errors
print('STORE E2E OK')
