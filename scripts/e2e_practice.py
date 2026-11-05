"""E2E: chơi hết từng dạng bài qua giao diện thật, lưu kết quả, kiểm tra xu/SRS/lịch sử."""
import json
import re
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:5173'
API = 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/practice')
OUT.mkdir(parents=True, exist_ok=True)
EMAIL = 'player@matong.dev'
WORDS = [
    ('consequence', 'hậu quả', 'noun', 'You must accept the consequence of your actions.'),
    ('menace', 'mối đe dọa', 'noun', 'Pollution is a menace to public health.'),
    ('destruction', 'sự tàn phá', 'noun', 'The storm caused great destruction.'),
    ('refine', 'tinh chỉnh', 'verb', 'You should refine your essay before submitting.'),
    ('motivate', 'tạo động lực', 'verb', 'Good teachers motivate their students.'),
    ('ancient', 'cổ đại', 'adjective', 'We visited an ancient temple.'),
    ('kindness', 'lòng tốt', 'noun', 'Thank you for your kindness.'),
    ('improve', 'cải thiện', 'verb', 'Practice will improve your skills.'),
    ('journey', 'chuyến đi', 'noun', 'The journey took three hours.'),
    ('brave', 'dũng cảm', 'adjective', 'She was brave enough to speak.'),
]
MEANING_TO_WORD = {m: w for w, m, _, _ in WORDS}
step = 0

jar = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def call(path, body=None, method=None):
    req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
    return json.loads(opener.open(req).read())


def shot(page, name, full=False):
    global step
    step += 1
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / f'{step:02d}-{name}.png'), full_page=full)


# --- Chuẩn bị dữ liệu qua API ---
code = call('/auth/email/request-code', {'email': EMAIL})['devCode']
call('/auth/email/verify-code', {'email': EMAIL, 'code': code})
cat = call('/categories', {'name': 'Bộ luyện tập', 'icon': '🎯'})
call('/vocabularies/bulk', {'categoryId': cat['id'], 'items': [{'word': w, 'meaning': m, 'pos': p, 'example': e} for w, m, p, e in WORDS]})
print('prepared', cat['id'])

INIT = """
localStorage.setItem('matong.gameSettings', JSON.stringify({soundOn:false, volume:70, coinSound:false, questionTime:30, autoNext:true, autoDelay:1}));
window.__spoken = [];
if (window.speechSynthesis) { const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = (u) => { window.__spoken.push(u.text); try { orig(u); } catch (e) {} }; }
"""


def answer_current(page, make_wrong=False):
    """Trả lời câu hiện tại của Trắc nghiệm / Gõ từ / Nghe viết / Hỗn hợp."""
    page.wait_for_selector('[data-testid=opt-1], [data-testid=answer-input]')
    if page.locator('[data-testid=opt-1]').count():
        sel = '[data-testid^=opt-]:not([data-correct])' if make_wrong else '[data-correct=true]'
        page.locator(sel).first.click()
    else:
        inp = page.locator('[data-testid=answer-input]')
        if page.get_by_text('Nghe và gõ từ tiếng Anh').count():
            page.wait_for_function('window.__spoken.length > (window.__used || 0)')
            word = page.evaluate('(window.__used = window.__spoken.length, window.__spoken[window.__spoken.length - 1])')
        else:
            word = MEANING_TO_WORD[page.locator('[data-testid=prompt]').inner_text()]
        inp.fill('sai rồi' if make_wrong else word.upper())  # viết hoa để kiểm tra so khớp không phân biệt hoa/thường
        inp.press('Enter')
    page.wait_for_selector('[data-testid=sheet-correct], [data-testid=sheet-wrong]')
    ok = page.locator('[data-testid=sheet-correct]').count() > 0
    # bottom sheet tự đọc lại từ vừa làm (đúng hay sai)
    page.wait_for_function('window.__spoken.length > (window.__used || 0)')
    page.evaluate('window.__used = window.__spoken.length')
    page.get_by_role('button', name=re.compile('^Tiếp tục')).click()
    return ok


def play_questions(page, n, wrong_at=()):
    got = []
    for i in range(n):
        got.append(answer_current(page, make_wrong=i in wrong_at))
        if i < n - 1:
            page.wait_for_timeout(150)
    return got


def save_result(page, name):
    expect(page.get_by_test_id('result')).to_be_visible()
    shot(page, f'{name}-result')
    page.get_by_role('button', name='Lưu & Hoàn thành').click()
    expect(page.get_by_text('Đã nhận')).to_be_visible()
    gain = page.get_by_test_id('coin-gain').inner_text()
    shot(page, f'{name}-saved')
    return gain


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1504, 'height': 812})
    ctx.add_init_script(INIT)
    for c in jar:
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'}])
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    page.goto(f'{BASE}/practice')
    expect(page.get_by_test_id('ready-count')).to_have_text(re.compile('10 từ sẵn sàng', re.I))
    page.get_by_role('combobox', name='Số lượng').select_option('10')
    shot(page, 'menu')

    # Cài đặt game
    page.get_by_label('Cài đặt game').click()
    expect(page.get_by_text('Thời gian mỗi câu hỏi')).to_be_visible()
    shot(page, 'settings')
    page.get_by_role('button', name='Xong').click()

    # Bộ chọn bộ từ
    page.get_by_test_id('deck-picker').click()
    page.get_by_text('🎯 Bộ luyện tập').click()
    shot(page, 'deck-picker')
    page.keyboard.press('Escape')

    # 1) Flashcard: lật, check nghĩa, Thuộc 7 / Quên 3
    page.get_by_test_id('mode-flashcard').click()
    expect(page.get_by_test_id('flashcard')).to_be_visible()
    shot(page, 'flashcard-front')
    word = page.get_by_test_id('card-main').inner_text()
    page.keyboard.press('Space')
    page.wait_for_timeout(600)
    shot(page, 'flashcard-back')
    expect(page.get_by_test_id('flashcard')).to_have_attribute('data-side', 'back')
    expect(page.get_by_test_id('card-main')).to_have_text(dict((w, m) for w, m, _, _ in WORDS)[word])
    # mặt sau không bị lật ngược (không còn transform sau khi hiệu ứng kết thúc)
    assert page.evaluate("getComputedStyle(document.querySelector('[data-testid=card-main]').parentElement).transform") in ('none', 'matrix(1, 0, 0, 1, 0, 0)')
    page.get_by_test_id('fc-input').fill(dict((w, m) for w, m, _, _ in WORDS)[word])
    page.get_by_role('button', name='Check').click()
    expect(page.get_by_text('✓ Chính xác!')).to_be_visible()
    for i in range(10):
        before = page.evaluate('window.__spoken.length')
        page.get_by_role('button', name='Quên' if i % 4 == 3 else 'Thuộc').click()
        page.wait_for_timeout(120)
        assert page.evaluate('window.__spoken.length') > before, 'phải tự đọc từ sau khi đánh dấu'
    print('flashcard', save_result(page, 'flashcard'))
    page.get_by_role('button', name='Chọn game khác').click()
    expect(page.get_by_test_id('ready-count')).to_have_text(re.compile('2 từ sẵn sàng', re.I))  # 8 từ vừa được đánh dấu đã thuộc
    page.get_by_role('combobox', name='Bộ lọc').select_option('all')
    expect(page.get_by_test_id('ready-count')).to_have_text(re.compile('10 từ sẵn sàng', re.I))

    # 2) Trắc nghiệm Từ -> Nghĩa (2 câu sai)
    page.get_by_test_id('mode-quiz').click()
    page.get_by_text('Từ -> Nghĩa').click()
    page.wait_for_selector('[data-testid=opt-1]')
    shot(page, 'quiz-question')
    answer_current(page, make_wrong=True)
    shot(page, 'quiz-feedback-after')
    play_questions(page, 9, wrong_at=(4,))
    print('quiz', save_result(page, 'quiz'))

    # 3) Làm lại câu sai -> rồi Ngữ cảnh
    page.get_by_role('button', name=re.compile('Làm lại câu sai')).click()
    play_questions(page, 2)
    print('retry', save_result(page, 'retry'))
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_test_id('mode-quiz').click()
    page.get_by_text('Ngữ cảnh').click()
    expect(page.get_by_text('ĐIỀN TỪ VÀO CHỖ TRỐNG')).to_be_visible()
    shot(page, 'quiz-context')
    play_questions(page, 10)
    print('context', save_result(page, 'context'))

    # 4) Nối từ: 1 lần ghép sai rồi ghép đúng hết
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_test_id('mode-match').click()
    page.wait_for_selector('[data-testid^=L-]')
    ids = [x.get_attribute('data-testid')[2:] for x in page.locator('[data-testid^=L-]').all()]
    shot(page, 'match')
    page.get_by_test_id(f'L-{ids[0]}').click()
    page.get_by_test_id(f'R-{ids[1]}').click()
    page.wait_for_timeout(650)
    for i in ids:
        page.get_by_test_id(f'L-{i}').click()
        page.get_by_test_id(f'R-{i}').click()
        page.wait_for_timeout(300)
    page.wait_for_timeout(600)
    if page.locator('[data-testid^=L-]').count() and not page.get_by_test_id('result').count():  # vòng 2
        for x in page.locator('[data-testid^=L-]').all():
            i = x.get_attribute('data-testid')[2:]
            page.get_by_test_id(f'L-{i}').click()
            page.get_by_test_id(f'R-{i}').click()
            page.wait_for_timeout(300)
    print('match', save_result(page, 'match'))

    # 5) Gõ từ (dùng gợi ý 1 lần, 1 câu sai)
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_test_id('mode-typing').click()
    page.wait_for_selector('[data-testid=answer-input]')
    page.get_by_role('button', name=re.compile('Gợi ý')).click()
    shot(page, 'typing-hint')
    play_questions(page, 10, wrong_at=(3,))
    print('typing', save_result(page, 'typing'))

    # 6) Nghe viết
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_test_id('mode-listening').click()
    page.wait_for_selector('[data-testid=answer-input]')
    shot(page, 'listening')
    play_questions(page, 10)
    print('listening', save_result(page, 'listening'))

    # 7) Đặc biệt -> Hỗn hợp
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_test_id('mode-special').click()
    page.get_by_test_id('special-mixed').click()
    play_questions(page, 10)
    print('mixed', save_result(page, 'mixed'))

    # 8) Thoát giữa chừng: chưa làm -> thoát không lưu; đã làm 2 câu -> kết thúc lượt
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_test_id('mode-typing').click()
    page.get_by_role('button', name='Thoát').click()
    expect(page.get_by_text('Tiến trình sẽ không được lưu')).to_be_visible()
    page.get_by_role('alertdialog').get_by_role('button', name='Thoát').click()
    expect(page.get_by_test_id('mode-typing')).to_be_visible()
    page.get_by_test_id('mode-typing').click()
    play_questions(page, 2)
    page.get_by_role('button', name='Thoát').click()
    expect(page.get_by_text('Bạn đã làm 2 từ')).to_be_visible()
    shot(page, 'end-early-dialog')
    page.get_by_role('button', name='Kết thúc lượt').click()
    expect(page.get_by_text('✓ 2 đúng')).to_be_visible()
    print('early', save_result(page, 'early'))

    # 9) Lịch sử + thống kê + số xu trên sidebar
    page.get_by_role('button', name='Chọn game khác').click()
    page.mouse.wheel(0, 900)
    shot(page, 'history')
    page.get_by_role('button', name='Xem thống kê').click()
    shot(page, 'stats')
    streak_txt = page.locator('header').inner_text()
    print('header:', ' '.join(streak_txt.split()))
    prof = call('/auth/profile')['user']
    stats = call('/vocabularies/stats')
    print('coins', prof['coins'], 'vocab stats', stats)

    # Mobile: một màn chơi
    m = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    m.add_init_script(INIT)
    for c in jar:
        m.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'}])
    mp = m.new_page()
    mp.goto(f'{BASE}/practice')
    mp.wait_for_timeout(900)
    mp.get_by_role('combobox', name='Bộ lọc').select_option('all')
    mp.wait_for_timeout(400)
    shot(mp, 'mobile-menu')
    mp.get_by_test_id('mode-quiz').click()
    mp.get_by_text('Từ -> Nghĩa').click()
    mp.wait_for_selector('[data-testid=opt-1]')
    shot(mp, 'mobile-quiz')
    mp.locator('[data-correct=true]').click()
    shot(mp, 'mobile-quiz-feedback')
    print('JS errors:', errors or 'none')
    b.close()
