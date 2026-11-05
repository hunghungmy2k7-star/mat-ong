"""E2E: Lộ trình – danh sách, chi tiết, ghim, học bộ từ, tiến độ, BXH, SRS lộ trình, nhập lộ trình (admin)."""
import re
import sys
sys.argv = ['x']
exec(open('/home/claude/matong/scripts/e2e_practice.py').read().split('# --- Chuẩn bị dữ liệu qua API ---')[0]
     .replace("EMAIL = 'player@matong.dev'", "EMAIL = 'road@matong.dev'").replace("OUT = Path('/home/claude/shots/practice')", "OUT = Path('/home/claude/shots/roadmap')"))
code = call('/auth/email/request-code', {'email': EMAIL})['devCode']
call('/auth/email/verify-code', {'email': EMAIL, 'code': code})
exec(open('/home/claude/matong/scripts/e2e_practice.py').read().split("INIT = \"\"\"")[1].split('"""', 1)[0].join(['INIT = """', '"""']))
exec('\n'.join(open('/home/claude/matong/scripts/e2e_practice.py').read().split('\n')[
    [i for i, l in enumerate(open('/home/claude/matong/scripts/e2e_practice.py').read().split('\n')) if l.startswith('def answer_current')][0]:
    [i for i, l in enumerate(open('/home/claude/matong/scripts/e2e_practice.py').read().split('\n')) if l.startswith('with sync_playwright')][0]]))
# đáp án lấy từ dữ liệu lộ trình A1 – bộ "Số đếm"
MEANING_TO_WORD.update({'một': 'one', 'hai': 'two', 'ba': 'three', 'bốn': 'four', 'năm': 'five', 'mười': 'ten', 'hai mươi': 'twenty',
                        'năm mươi': 'fifty', 'trăm': 'hundred', 'nghìn': 'thousand'})
CSV = Path('/home/claude/testfiles/path.csv')
CSV.write_text('﻿Bộ từ,Từ vựng,Phiên âm,Loại từ,Nghĩa,Ví dụ\nCon vật,cat,/kæt/,noun,con mèo,The cat sleeps.\nCon vật,dog,/dɔːɡ/,noun,con chó,The dog runs.\n'
               'Trường học,teacher,/ˈtiː.tʃɚ/,noun,giáo viên,Our teacher is kind.\nTrường học,student,/ˈstuː.dənt/,noun,học sinh,He is a good student.\n', encoding='utf-8')

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1504, 'height': 812})
    ctx.add_init_script(INIT)
    for c in jar:
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'}])
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'{BASE}/roadmap')
    expect(page.get_by_text('A1 (0-3.0)').first).to_be_visible()
    shot(page, 'list')
    page.get_by_text('A1 (0-3.0)').first.click()
    expect(page.get_by_text('Các bộ từ')).to_be_visible()
    page.get_by_role('button', name=re.compile('Ghim')).click()
    expect(page.get_by_text('Đã ghim lộ trình')).to_be_visible()
    shot(page, 'detail')
    page.get_by_test_id('set-1').click()
    expect(page.get_by_text('Chọn chế độ học')).to_be_visible()
    shot(page, 'set', full=True)
    page.get_by_test_id('set-mode-quiz').click()
    page.wait_for_selector('[data-testid=opt-1]')
    play_questions(page, 10, wrong_at=(2,))
    print('set quiz', save_result(page, 'set-quiz'))
    page.get_by_role('button', name='Chọn game khác').click()
    expect(page.get_by_text('9/10 đã học (90%)')).to_be_visible()
    page.get_by_label('Quay lại').click()
    expect(page.get_by_text('9/80 từ', exact=False)).to_be_visible()
    page.get_by_role('button', name=re.compile('BXH')).click()
    expect(page.get_by_text('Bảng xếp hạng')).to_be_visible()
    page.wait_for_timeout(500)
    shot(page, 'leaderboard')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Học ngắt quãng').click()
    expect(page.get_by_test_id('srs-due')).to_be_visible()
    print('path srs:', page.get_by_test_id('srs-due').inner_text(), page.get_by_test_id('srs-levels').inner_text().split())
    shot(page, 'path-srs')
    page.keyboard.press('Escape')
    # trang chủ hiển thị lộ trình đã ghim
    page.goto(f'{BASE}/home')
    expect(page.get_by_text('Lộ trình đã ghim')).to_be_visible()
    # nhập lộ trình (admin – chế độ dev)
    page.goto(f'{BASE}/roadmap')
    page.get_by_role('button', name='Nhập lộ trình').click()
    page.set_input_files('[data-testid=path-file]', str(CSV))
    expect(page.get_by_text('4 từ · 2 bộ từ')).to_be_visible()
    dlg = page.get_by_role('dialog')
    dlg.locator('select').select_option('__new__')
    dlg.get_by_placeholder('Tên nhóm mới').fill('Chủ đề đời sống')
    dlg.get_by_placeholder('VD: TOEIC 600+').fill('Từ vựng đời sống')
    shot(page, 'import')
    dlg.get_by_role('button', name='Tạo lộ trình').click()
    expect(page.get_by_text('Đã tạo lộ trình với 4 từ')).to_be_visible()
    expect(page.get_by_text('Từ vựng đời sống')).to_be_visible()
    shot(page, 'after-import', full=True)
    print('JS errors:', errors or 'none')
    b.close()
