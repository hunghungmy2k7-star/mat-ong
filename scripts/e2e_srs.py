"""E2E: Ôn tập SRS – modal phân bố level, cài đặt dạng bài, phiên ôn, cập nhật level."""
import re
import sys
sys.argv = ['x']
exec(open('/home/claude/matong/scripts/e2e_practice.py').read().split('with sync_playwright() as p:')[0]
     .replace("EMAIL = 'player@matong.dev'", "EMAIL = 'srs@matong.dev'").replace("OUT = Path('/home/claude/shots/practice')", "OUT = Path('/home/claude/shots/srs')"))

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
    page.get_by_role('button', name='Bắt đầu ôn tập').click()
    expect(page.get_by_test_id('srs-due')).to_have_text(re.compile('10 TỪ CẦN ÔN'))
    shot(page, 'srs-modal')
    # cài đặt dạng bài theo level
    page.get_by_label('Cài đặt dạng bài theo level').click()
    expect(page.get_by_text('Chu kỳ ôn Level 5', exact=True)).to_be_visible()
    shot(page, 'srs-settings')
    page.get_by_role('button', name='Xong').click()
    expect(page.get_by_text('Đã lưu cài đặt ôn tập')).to_be_visible()
    # phiên ôn: Lv0 -> Quiz
    page.get_by_role('dialog').get_by_role('button', name='Bắt đầu ôn tập').click()
    page.wait_for_selector('[data-testid=opt-1]')
    got = play_questions(page, 10, wrong_at=(0,))
    print('srs answers', got)
    print('srs', save_result(page, 'srs'))
    page.get_by_role('button', name='Chọn game khác').click()
    page.get_by_role('button', name='Bắt đầu ôn tập').click()
    expect(page.get_by_test_id('srs-due')).to_have_text(re.compile('1 TỪ CẦN ÔN'))
    lv = page.get_by_test_id('srs-levels').inner_text().split()
    print('levels after:', lv)
    shot(page, 'srs-after')
    print('JS errors:', errors or 'none')
    b.close()
