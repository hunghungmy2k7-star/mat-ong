"""E2E: Lớp học – tạo/vào lớp, tài liệu, giao bài, học sinh làm bài, kết quả, tiến độ, quyền truy cập."""
import json
import re
import urllib.request
import urllib.error
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)
BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/classes')
OUT.mkdir(parents=True, exist_ok=True)


class User:
    def __init__(self, email, name):
        self.jar = CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        code = self.call('/auth/email/request-code', {'email': email})['devCode']
        self.id = self.call('/auth/email/verify-code', {'email': email, 'code': code})['user']['id']
        self.call('/auth/profile', {'name': name}, method='PATCH')

    def call(self, path, body=None, method=None):
        req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
        return json.loads(self.op.open(req).read())

    def status(self, path, body=None, method=None):
        try:
            self.call(path, body, method)
            return 200
        except urllib.error.HTTPError as e:
            return e.code


teacher, stu, outsider = User('gv@matong.dev', 'Cô Hoa'), User('hs@matong.dev', 'Minh Anh'), User('ngoai@matong.dev', 'Người Ngoài')
fid = teacher.call('/folders', {'name': 'Unit 1'})['id']
cat = teacher.call('/categories', {'name': 'Animals', 'folderId': fid})['id']
WORDS = {'cat': 'con mèo', 'dog': 'con chó', 'bird': 'con chim', 'fish': 'con cá', 'horse': 'con ngựa'}
teacher.call('/vocabularies/bulk', {'categoryId': cat, 'items': [{'word': w, 'meaning': m} for w, m in WORDS.items()]})
MEANING_TO_WORD = {m: w for w, m in WORDS.items()}

# riêng tư: người ngoài không xem được
assert outsider.status(f'/community/categories/{cat}/words') == 404
assert teacher.status('/activity/calendar?userId=2') == 200  # luôn trả lịch của chính mình

errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

    def page_for(u, w=1504, h=900):
        ctx = br.new_context(viewport={'width': w, 'height': h})
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
        ctx.add_init_script("localStorage.setItem('matong.gameSettings', JSON.stringify({autoDelay: 1, autoNext: true, soundOn: false}))")
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and '404' not in m.text and errors.append(m.text))
        return pg

    # --- giáo viên tạo lớp
    pt = page_for(teacher)
    pt.goto(f'{BASE}/category-list')
    pt.get_by_role('button', name='Lớp học').click()
    expect(pt).to_have_url(f'{BASE}/classes')
    pt.screenshot(path=str(OUT / '1-classes.png'), full_page=True)
    pt.get_by_placeholder('Tên lớp').fill('Lớp 6A')
    pt.get_by_role('button', name='Tạo', exact=True).click()
    expect(pt).to_have_url(re.compile(r'/classes/\d+\?tab=members'))
    class_id = int(re.search(r'/classes/(\d+)', pt.url).group(1))
    code = pt.get_by_test_id('class-code').inner_text().split(': ')[1]
    assert len(code) == 6

    # tài liệu: chia sẻ folder
    pt.get_by_role('button', name='📖 Tài liệu').click()
    pt.get_by_label('Tài liệu cần chia sẻ').select_option(label='Unit 1')
    pt.get_by_role('button', name='Chia sẻ', exact=True).click()
    expect(pt.get_by_test_id(f'resource-folder-{fid}')).to_be_visible()

    # bài tập: giao bài trắc nghiệm, cần 4/5 câu đúng
    pt.get_by_role('button', name='📋 Bài tập').click()
    pt.get_by_role('button', name='Giao bài').click()
    pt.get_by_label('Bộ từ').select_option(label='Animals (5 từ)')
    pt.get_by_label('Số câu đúng').fill('4')
    pt.get_by_test_id('assignment-submit').click()
    expect(pt.get_by_text('Đã giao bài cho lớp')).to_be_visible()
    expect(pt.get_by_text(re.compile(r'Còn lại 6 ngày|Còn lại 7 ngày'))).to_be_visible()
    aid = teacher.call(f'/classes/{class_id}/assignments')[0]['id']
    pt.screenshot(path=str(OUT / '2-assignments-teacher.png'))

    # --- học sinh vào lớp bằng link mời
    ps = page_for(stu)
    ps.goto(f'{BASE}/classes?join={code}')
    ps.get_by_role('button', name='Tham gia').click()
    expect(ps).to_have_url(f'{BASE}/classes/{class_id}')
    # xem & sao chép tài liệu
    ps.get_by_test_id(f'resource-folder-{fid}').click()
    ps.get_by_test_id(f'public-deck-{cat}').get_by_role('button', name='Xem').click()
    expect(ps.get_by_text('con ngựa')).to_be_visible()
    ps.keyboard.press('Escape')
    ps.get_by_test_id(f'copy-deck-{cat}').click()
    expect(ps.get_by_text('Đã sao chép "Animals" (5 từ) vào Bộ từ của tôi')).to_be_visible()
    # người ngoài vẫn không xem được
    assert outsider.status(f'/community/categories/{cat}/words') == 404
    assert outsider.status(f'/classes/{class_id}') == 404
    assert stu.status(f'/assignments/{aid}/results') == 403

    # làm bài: lần 1 sai 2 câu (chưa đạt), lần 2 đúng hết
    def play(wrong):
        ps.goto(f'{BASE}/classes/{class_id}?tab=assignments')
        ps.get_by_test_id(f'play-{aid}').click()
        for i in range(5):
            ps.wait_for_selector('[data-testid=opt-1]')
            sel = '[data-testid^=opt-]:not([data-correct])' if i < wrong else '[data-correct=true]'
            ps.locator(sel).first.click()
            ps.wait_for_selector('[data-testid=sheet-correct], [data-testid=sheet-wrong]')
            ps.get_by_role('button', name=re.compile('^Tiếp tục')).click()
        expect(ps.get_by_test_id('result')).to_be_visible()
        assert ps.get_by_text('Chọn từ đánh dấu "Đã thuộc"').count() == 0
        ps.get_by_role('button', name=re.compile('Lưu')).click()

    play(2)
    expect(ps.get_by_text('Chưa đạt: 3/4 câu đúng. Làm lại nhé!')).to_be_visible()
    play(0)
    expect(ps.get_by_text('Đạt yêu cầu (5/4 câu đúng) 🎉')).to_be_visible()
    ps.goto(f'{BASE}/classes/{class_id}?tab=assignments')
    expect(ps.get_by_test_id(f'status-{aid}')).to_have_text('ĐẠT')
    ps.screenshot(path=str(OUT / '3-assignments-student.png'))
    me = stu.call('/auth/profile')['user']
    assert me['coins'] == (3 + 5) * 100, me['coins']
    assert stu.call('/activity/streak')['activeToday']

    # --- giáo viên xem kết quả và tiến độ
    pt.reload()
    pt.get_by_test_id(f'assignment-{aid}').click()
    row = pt.get_by_test_id(f'result-row-{stu.id}')
    expect(row).to_contain_text('Minh Anh')
    expect(row).to_contain_text('5/5')
    expect(row).to_contain_text('ĐẠT')
    expect(row).to_contain_text('2')
    pt.screenshot(path=str(OUT / '4-results.png'))
    pt.keyboard.press('Escape')
    pt.get_by_role('button', name='👥 Thành viên').click()
    pt.get_by_test_id(f'progress-{stu.id}').click()
    expect(pt.get_by_text('Hoạt động học tập')).to_be_visible()
    expect(pt.get_by_text('Tổng từ')).to_be_visible()
    pt.screenshot(path=str(OUT / '5-progress.png'))
    pt.keyboard.press('Escape')
    prog = teacher.call(f'/classes/{class_id}/members/{stu.id}/progress')
    assert prog['total'] == 5, prog

    # hết hạn → không nộp được
    import subprocess
    subprocess.run(['node', '-e', f"const {{DatabaseSync}}=require('node:sqlite');new DatabaseSync('data/matong.db').exec(\"UPDATE assignments SET deadline='2020-01-01T00:00:00.000Z' WHERE id={aid}\")"],
                   cwd='/home/claude/matong/server', check=True)
    vid = stu.call(f'/assignments/{aid}/play')['items'][0]['id']
    assert stu.status(f'/assignments/{aid}/attempts', {'mode': 'quiz', 'results': [{'id': vid, 'correct': True}]}) == 400

    # học sinh rời lớp
    ps.goto(f'{BASE}/classes/{class_id}?tab=members')
    ps.get_by_role('button', name='Rời lớp').click()
    ps.get_by_test_id('confirm-ok').click()
    expect(ps).to_have_url(f'{BASE}/classes')
    assert stu.status(f'/classes/{class_id}') == 404

    # mobile
    pm = page_for(teacher, 390, 844)
    pm.goto(f'{BASE}/classes/{class_id}?tab=assignments')
    expect(pm.get_by_test_id(f'assignment-{aid}')).to_be_visible()
    pm.screenshot(path=str(OUT / '6-mobile.png'), full_page=True)
    assert pm.evaluate('document.documentElement.scrollWidth') <= 392
    br.close()

print('errors:', errors)
assert not errors
print('CLASSES E2E OK')
