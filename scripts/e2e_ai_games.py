"""E2E: AI (tạo từ theo chủ đề / đọc hiểu / ảnh, chấm câu, dịch ví dụ) qua máy chủ Claude giả lập + 4 game đặc biệt.
Cần: python3 scripts/mock_claude.py &  và API chạy với ANTHROPIC_API_KEY=test ANTHROPIC_API_URL=http://localhost:4999/v1/messages
"""
import base64
import json
import re
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)
BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/ai')
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


u = User('ai@matong.dev')
cat_id = u.call('/categories', {'name': 'Sân bay'})['id']
st = u.call('/ai/status')
assert st['enabled'] and st['remaining'] == st['limit'], st
PNG = OUT / 'words.png'
PNG.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))

errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 1504, 'height': 900})
    ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
    ctx.add_init_script("""
      localStorage.setItem('matong.gameSettings', JSON.stringify({autoDelay: 1, autoNext: true, soundOn: false}));
      window.__spoken = []; const _s = window.speechSynthesis && window.speechSynthesis.speak.bind(window.speechSynthesis);
      if (window.speechSynthesis) window.speechSynthesis.speak = (u) => { window.__spoken.push(u.text); };
    """)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))

    # ---------- AI tạo từ: chủ đề ----------
    pg.goto(f'{BASE}/words')
    expect(pg.locator('.chakra-modal__content-container')).to_have_count(0)
    pg.get_by_role('button', name='Thêm từ với AI').click()
    expect(pg.get_by_test_id('ai-remaining')).to_have_text(re.compile(r'CÒN \d+/\d+ LƯỢT HÔM NAY'))
    pg.get_by_test_id('ai-topic').fill('Từ vựng chủ đề sân bay')
    pg.get_by_test_id('ai-generate').click()
    expect(pg.get_by_text('AI đã tạo 3 từ. Kiểm tra lại rồi bấm Lưu nhé!')).to_be_visible()
    expect(pg.get_by_role('button', name='Lưu 3 từ')).to_be_visible()
    pg.screenshot(path=str(OUT / '1-ai-rows.png'))
    pg.get_by_role('button', name='Lưu 3 từ').click()
    expect(pg.get_by_text('Đã lưu 3 từ')).to_be_visible()

    # ---------- AI: đọc hiểu (bôi đen) ----------
    expect(pg.locator('.chakra-modal__content-container')).to_have_count(0)
    pg.get_by_role('button', name='Thêm từ với AI').click()
    pg.get_by_role('tab', name='Đọc hiểu').click()
    ta = pg.get_by_test_id('ai-text')
    ta.fill('Passengers must check in before the departure gate closes.')
    ta.evaluate("(el) => { const s = el.value.indexOf('departure'); el.setSelectionRange(s, s + 'departure'.length); }")
    pg.get_by_role('button', name='Thêm từ đã bôi đen').click()
    expect(pg.get_by_role('dialog').get_by_text('departure', exact=True)).to_be_visible()
    pg.get_by_test_id('ai-generate').click()
    expect(pg.get_by_role('button', name='Lưu 1 từ')).to_be_visible()
    pg.get_by_role('button', name='Lưu 1 từ').click()
    expect(pg.get_by_text('Đã lưu 1 từ').last).to_be_visible()

    # ---------- AI: ảnh ----------
    expect(pg.locator('.chakra-modal__content-container')).to_have_count(0)
    pg.get_by_role('button', name='Thêm từ với AI').click()
    pg.get_by_role('tab', name='Hình ảnh').click()
    pg.get_by_test_id('ai-image').set_input_files(str(PNG))
    expect(pg.get_by_alt_text('Ảnh đã chọn')).to_be_visible()
    pg.get_by_test_id('ai-generate').click()
    expect(pg.get_by_role('button', name='Lưu 1 từ')).to_be_visible()
    pg.get_by_role('button', name='Lưu 1 từ').click()
    expect(pg.get_by_text('Đã lưu 1 từ').last).to_be_visible()

    words = u.call('/vocabularies?pageSize=50')['items']
    assert sorted(w['word'] for w in words) == ['boarding pass', 'delay', 'departure', 'harbor', 'luggage'], words
    assert next(w for w in words if w['word'] == 'delay')['pos'] == 'verb'
    BY_MEANING = {w['meaning']: w for w in words}
    BY_WORD = {w['word']: w for w in words}
    assert u.call('/ai/status')['used'] == 3

    def open_special(key):
        pg.goto(f'{BASE}/practice')
        pg.get_by_role('combobox', name='Bộ lọc').select_option('all')
        pg.get_by_test_id('mode-special').click()
        pg.get_by_test_id(f'special-{key}').click()

    def save_result(expected_coins):
        expect(pg.get_by_test_id('result')).to_be_visible(timeout=90000)
        before = u.call('/auth/profile')['user']['coins']
        pg.get_by_role('button', name=re.compile('Lưu')).click()
        expect(pg.get_by_text(re.compile('Đã lưu kết quả'))).to_be_visible()
        gained = u.call('/auth/profile')['user']['coins'] - before
        if expected_coins is not None:
            assert gained == expected_coins, (gained, expected_coins)
        return gained

    # ---------- Dịch câu ----------
    open_special('translate')
    pg.wait_for_selector('[data-testid=prompt]')
    pg.screenshot(path=str(OUT / '2-translate.png'))
    for i in range(5):
        prompt = pg.get_by_test_id('prompt').inner_text()
        w = BY_MEANING[prompt]
        inp = pg.get_by_test_id('answer-input')
        if i == 0:
            inp.fill(w['example'].split()[0])  # gõ từ đầu tiên → mở 1 ô
            expect(pg.get_by_test_id('masked')).to_contain_text(w['example'].split()[0])
            inp.fill('wrong sentence')
        else:
            inp.fill(w['example'].upper())  # không phân biệt hoa/thường
        inp.press('Enter')
        pg.wait_for_selector('[data-testid=sheet-correct], [data-testid=sheet-wrong]')
        assert (pg.locator('[data-testid=sheet-correct]').count() > 0) == (i > 0)
        pg.get_by_role('button', name=re.compile('^Tiếp tục')).click()
    save_result(4 * 20)

    # chế độ câu tiếng Việt (AI dịch ví dụ)
    open_special('translate')
    pg.get_by_test_id('vi-mode').click()
    expect(pg.get_by_test_id('prompt')).to_have_text(re.compile(r'^\[VI\] '))
    pg.screenshot(path=str(OUT / '3-translate-vi.png'))
    assert u.call('/ai/status')['used'] == 4
    pg.get_by_role('button', name='Thoát').click()
    pg.get_by_role('button', name='Thoát').last.click()

    # ---------- Luyện đặt câu (AI chấm) ----------
    open_special('sentence')
    for i in range(5):
        word = pg.get_by_test_id('prompt').inner_text()
        if i == 4:
            pg.get_by_role('button', name='Bỏ qua').click()
            break
        pg.get_by_test_id('answer-input').fill(f'I really like the {word} here.' if i else 'Hello there.')
        pg.get_by_test_id('submit').click()
        expect(pg.get_by_test_id('ai-score')).to_have_text('90/100' if i else '10/100')
        if i == 1:
            pg.screenshot(path=str(OUT / '4-sentence-review.png'))
        pg.get_by_test_id('next').click()
    save_result(3 * 20)
    assert u.call('/ai/status')['used'] == 8

    # ---------- Chim Chăm Chỉ (lái tự động bằng trạng thái game) ----------
    open_special('flappy')
    pg.wait_for_selector('[data-testid=flappy-canvas]')
    pg.screenshot(path=str(OUT / '5-flappy-ready.png'))
    pg.keyboard.press('Space')
    pg.evaluate("""() => { window.__auto = setInterval(() => {
        const s = window.__flappyState; if (!s || s.target == null) return;
        const aim = s.gateX < 260 ? s.target + 6 : (s.target + 230) / 2;
        if (s.y > aim && s.vy > -1) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
      }, 16); }""")
    pg.wait_for_timeout(9000)
    pg.screenshot(path=str(OUT / '6-flappy-play.png'))
    gained = save_result(None)
    assert gained >= 3 * 20, gained
    pg.evaluate('clearInterval(window.__auto)')

    # ---------- Bắn thiên thạch ----------
    open_special('meteor')
    pg.wait_for_selector('[data-testid=meteor-canvas]')
    shot = False
    for _ in range(400):
        if pg.get_by_test_id('result').count():
            break
        ws = pg.evaluate('window.__meteorState && window.__meteorState.words') or []
        if ws:
            if not shot:
                pg.screenshot(path=str(OUT / '7-meteor.png'))
                shot = True
            pg.get_by_test_id('answer-input').fill(ws[0])
        pg.wait_for_timeout(150)
    save_result(5 * 20)
    br.close()

print('errors:', errors)
assert not errors
print('AI & SPECIAL GAMES E2E OK')
