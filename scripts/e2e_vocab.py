"""Kiểm thử end-to-end trang Bộ từ vựng và Từ vựng qua giao diện thật."""
import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:5173'
OUT = Path('/home/claude/shots/vocab')
OUT.mkdir(parents=True, exist_ok=True)
FILES = Path('/home/claude/testfiles')
EMAIL = 'e2e@matong.dev'
step = 0


def shot(page, name):
    global step
    step += 1
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / f'{step:02d}-{name}.png'))


def login(page):
    req = urllib.request.Request('http://localhost:4000/api/auth/email/request-code', data=json.dumps({'email': EMAIL}).encode(),
                                 headers={'Content-Type': 'application/json'})
    code = json.loads(urllib.request.urlopen(req).read())['devCode']
    page.goto(f'{BASE}/login')
    page.evaluate("""async ([e, c]) => { await fetch('/api/auth/email/verify-code', {method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include', body: JSON.stringify({email: e, code: c})}); }""", [EMAIL, code])


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1504, 'height': 812}, accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    login(page)

    # 1. Trang bộ từ trống
    page.goto(f'{BASE}/category-list')
    expect(page.get_by_text('Bạn chưa có bộ từ nào')).to_be_visible()
    shot(page, 'empty')

    # 2. Tạo thư mục
    page.get_by_role('button', name='Tạo folder').click()
    page.get_by_placeholder('VD: IELTS').fill('IELTS')
    page.get_by_role('button', name='Tạo thư mục').click()
    expect(page.get_by_text('Đã tạo thư mục')).to_be_visible()

    # 3. Tạo 2 bộ từ (mở modal, chọn biểu tượng)
    for name, icon in [('Unit 1 – Môi trường', '⭐'), ('Reading Cam 18', '📕')]:
        page.get_by_role('button', name='Tạo bộ từ').click()
        shot(page, 'create-modal') if name.startswith('Unit') else None
        page.get_by_placeholder('VD: IELTS Speaking').fill(name)
        page.get_by_label(f'Biểu tượng {icon}').click()
        page.get_by_role('button', name='Tạo mới').click()
        expect(page.get_by_text(name)).to_be_visible()
    shot(page, 'decks-created')

    # 4. Chọn bộ "Unit 1" -> Thêm vào thư mục
    page.get_by_label('Chọn Unit 1 – Môi trường').locator('xpath=..').click()
    page.get_by_role('button', name='Thêm vào thư mục (1)').click()
    page.get_by_role('dialog').get_by_role('button', name='Thêm vào thư mục').click()
    expect(page.get_by_text('Đã thêm 1 bộ từ vào thư mục')).to_be_visible()
    shot(page, 'moved')

    # 5. Trang Từ vựng: nhập CSV vào "Unit 1"
    page.goto(f'{BASE}/words')
    expect(page.get_by_text('Chưa có từ vựng')).to_be_visible()
    page.get_by_role('button', name='Thêm nhiều từ').click()
    dlg = page.get_by_role('dialog')
    dlg.locator('select').select_option(label='Unit 1 – Môi trường')
    page.set_input_files('[data-testid=file-input]', str(FILES / 'words.csv'))
    expect(page.get_by_text('Đã đọc 4 dòng')).to_be_visible()
    shot(page, 'bulk-csv')
    dlg.get_by_role('button', name='Lưu 3 từ').click()
    expect(page.get_by_text('Đã lưu 3 từ')).to_be_visible()

    # 6. Nhập Excel + Thêm nhanh vào "Reading Cam 18"
    page.get_by_role('button', name='Thêm nhiều từ').click()
    dlg = page.get_by_role('dialog')
    dlg.locator('select').select_option(label='Reading Cam 18')
    page.set_input_files('[data-testid=file-input]', str(FILES / 'words.xlsx'))
    expect(page.get_by_text('Đã đọc 3 dòng')).to_be_visible()
    dlg.get_by_role('button', name='Thêm nhanh').click()
    page.locator('textarea').last.fill('war | /wɔː/ | noun | chiến tranh | the war ended |\nkindness | | noun | lòng tốt | |')
    page.get_by_role('button', name='Xem trước (2 dòng)').click()
    shot(page, 'bulk-xlsx-quick')
    page.get_by_role('dialog').get_by_role('button', name='Lưu 5 từ').click()
    expect(page.get_by_text('Đã lưu 5 từ')).to_be_visible()
    page.wait_for_timeout(600)
    shot(page, 'words-list')
    total = page.get_by_text('Tổng').locator('xpath=following-sibling::*[1]').inner_text()
    print('Tổng từ sau khi nhập:', total)

    # 7. Tìm kiếm + sửa một từ
    page.get_by_placeholder('Tìm từ...').fill('motiv')
    page.wait_for_timeout(700)
    page.get_by_text('motivate', exact=True).click()
    page.get_by_placeholder('VD: Quả táo').fill('tạo động lực, thúc đẩy')
    page.get_by_role('button', name='Cập nhật').click()
    expect(page.get_by_text('tạo động lực, thúc đẩy')).to_be_visible()
    page.get_by_placeholder('Tìm từ...').fill('')
    page.wait_for_timeout(700)

    shot(page, 'before-8')
    # 8. Bật "Thuộc" cho 1 từ, chọn nhiều + Xóa 1 từ
    page.get_by_label('Đánh dấu war đã thuộc').locator('xpath=..').click()
    page.wait_for_timeout(500)
    page.get_by_label('Chọn kindness').locator('xpath=..').click()
    expect(page.get_by_text('Đã chọn 1 từ')).to_be_visible()
    shot(page, 'selection-bar')
    page.get_by_role('button', name='Xóa', exact=True).click()
    page.get_by_role('alertdialog').get_by_role('button', name='Xóa').click()
    expect(page.get_by_text('Đã xóa 1 từ')).to_be_visible()

    # 9. Quay lại bộ từ: mở thư mục, xem bộ từ, sửa inline, xuất CSV/Excel
    page.goto(f'{BASE}/category-list')
    page.get_by_text('IELTS', exact=True).click()
    expect(page.get_by_text('Quay lại')).to_be_visible()
    shot(page, 'folder-open')
    page.get_by_role('button', name='Xem', exact=True).first.click()
    dlg = page.get_by_role('dialog')
    expect(dlg.get_by_text('3 từ vựng')).to_be_visible()
    shot(page, 'view-modal')
    with page.expect_download() as d1:
        dlg.get_by_role('button', name='Xuất').click()
        page.get_by_role('menuitem', name='CSV').click()
    csv_path = OUT / d1.value.suggested_filename
    d1.value.save_as(csv_path)
    with page.expect_download() as d2:
        dlg.get_by_role('button', name='Xuất').click()
        page.get_by_role('menuitem', name='Excel').click()
    xlsx_path = OUT / d2.value.suggested_filename
    d2.value.save_as(xlsx_path)
    print('Xuất:', csv_path.name, xlsx_path.name)

    dlg.get_by_role('button', name='Chỉnh sửa').click()
    dlg.get_by_placeholder('Loại từ').first.fill('n')
    dlg.get_by_label('Xóa từ').last.click()
    expect(dlg.get_by_text('2 thay đổi chưa lưu')).to_be_visible()
    shot(page, 'inline-edit')
    dlg.get_by_role('button', name='Lưu').click()
    expect(page.get_by_text('Đã lưu thay đổi')).to_be_visible()
    expect(dlg.get_by_text('2 từ vựng')).to_be_visible()
    page.keyboard.press('Escape')

    # 10. Sửa bộ từ, bỏ khỏi thư mục, xóa thư mục
    page.get_by_label('Bỏ khỏi thư mục').first.click()
    expect(page.get_by_text('Thư mục trống')).to_be_visible()
    page.get_by_role('button', name='Quay lại').click()
    page.get_by_label('Tùy chọn thư mục').click()
    page.get_by_role('menuitem', name='Xóa').click()
    page.get_by_role('alertdialog').get_by_role('button', name='Xóa').click()
    expect(page.get_by_text('Đã xóa thư mục')).to_be_visible()
    page.wait_for_timeout(500)
    shot(page, 'final-list')

    # Mobile
    m = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mp = m.new_page()
    login(mp)
    for path in ['/category-list', '/words']:
        mp.goto(f'{BASE}{path}')
        mp.wait_for_timeout(900)
        shot(mp, 'mobile' + path.replace('/', '-'))
    print('JS errors:', errors or 'none')
    b.close()
