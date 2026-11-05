"""E2E: Thư viện cộng đồng – công khai thư mục, tìm kiếm, upvote, xem & sao chép bộ từ/thư mục, link chia sẻ."""
import json
import re
import urllib.request
import urllib.error
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)

BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/community')
OUT.mkdir(parents=True, exist_ok=True)


class User:
    def __init__(self, email, name):
        self.jar = CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        code = self.call('/auth/email/request-code', {'email': email})['devCode']
        self.call('/auth/email/verify-code', {'email': email, 'code': code})
        self.call('/auth/profile', {'name': name}, method='PATCH')

    def call(self, path, body=None, method=None):
        req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
        return json.loads(self.op.open(req).read())

    def status(self, path, body=None):
        try:
            self.call(path, body)
            return 200
        except urllib.error.HTTPError as e:
            return e.code


owner, reader = User('chu@matong.dev', 'Lâm Thịnh'), User('doc@matong.dev', 'Đọc Giả')
fid = owner.call('/folders', {'name': 'PTE Core'})['id']
c1 = owner.call('/categories', {'name': 'PTE Reading', 'folderId': fid})['id']
c2 = owner.call('/categories', {'name': 'PTE Listening', 'folderId': fid})['id']
owner.call('/vocabularies/bulk', {'categoryId': c1, 'items': [{'word': 'analyse', 'meaning': 'phân tích', 'pos': 'verb'}, {'word': 'evidence', 'meaning': 'bằng chứng', 'pos': 'noun'}]})
owner.call('/vocabularies/bulk', {'categoryId': c2, 'items': [{'word': 'lecture', 'meaning': 'bài giảng', 'pos': 'noun'}]})
private_f = owner.call('/folders', {'name': 'Riêng tư'})['id']
# chưa công khai → người khác không thấy / không sao chép được
assert reader.status(f'/community/folders/{fid}') == 404
assert reader.status(f'/community/folders/{fid}/copy', {}) == 404
assert reader.status(f'/community/categories/{c1}/words') == 404

errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

    def page_for(u, w=1504, h=900):
        ctx = br.new_context(viewport={'width': w, 'height': h})
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and '404' not in m.text and errors.append(m.text))
        return pg

    # chủ thư mục: menu ⋮ → Chia sẻ → bật công khai
    po = page_for(owner)
    po.goto(f'{BASE}/category-list')
    card = po.locator('div[role=button][tabindex="0"]').filter(has_text='PTE Core')
    expect(card).to_have_count(1)
    card.get_by_role('button', name='Tùy chọn thư mục').click()
    po.get_by_role('menuitem', name='Chia sẻ').click()
    link = po.get_by_test_id('share-link')
    expect(link).to_have_value(re.compile(r'/share/[\w-]+$'))
    folder_link = link.input_value()
    po.locator('[data-testid=share-public]').click()
    expect(po.get_by_text('Thư mục đã hiện trong Thư viện cộng đồng')).to_be_visible()
    po.screenshot(path=str(OUT / '1-share-folder.png'))
    po.keyboard.press('Escape')
    expect(card.get_by_text('🌐')).to_be_visible()

    # chia sẻ 1 bộ từ ngoài thư mục bằng link
    solo = owner.call('/categories', {'name': 'Bộ lẻ'})['id']
    owner.call('/vocabularies/bulk', {'categoryId': solo, 'items': [{'word': 'solo', 'meaning': 'một mình'}]})
    po.goto(f'{BASE}/category-list')
    po.get_by_text('Bộ lẻ').click()
    po.get_by_role('button', name='Chia sẻ').click()
    expect(po.get_by_test_id('share-link')).to_have_value(re.compile(r'/share/'))
    deck_link = po.get_by_test_id('share-link').input_value()
    assert deck_link != folder_link

    # người đọc: tab Cộng đồng
    pr = page_for(reader)
    pr.goto(f'{BASE}/category-list?tab=community')
    expect(pr.get_by_test_id(f'public-folder-{fid}')).to_be_visible()
    expect(pr.get_by_test_id(f'public-folder-{private_f}')).to_have_count(0)
    expect(pr.get_by_test_id('community-pages')).to_have_text('Trang 1/1 (1 thư mục)')
    pr.get_by_test_id(f'vote-{fid}').click()
    expect(pr.get_by_test_id(f'vote-{fid}')).to_have_text('1')
    pr.screenshot(path=str(OUT / '2-library.png'))
    # tìm kiếm không có kết quả
    pr.get_by_placeholder('Tìm kiếm thư mục...').fill('toeic')
    pr.get_by_role('button', name='Tìm kiếm').click()
    expect(pr.get_by_text('Không có thư mục nào khớp "toeic"')).to_be_visible()
    pr.get_by_placeholder('Tìm kiếm thư mục...').fill('pte')
    pr.get_by_role('button', name='Tìm kiếm').click()
    pr.get_by_test_id(f'public-folder-{fid}').click()
    expect(pr.get_by_text('Lâm Thịnh')).to_be_visible()
    # xem bộ từ
    pr.get_by_test_id(f'public-deck-{c1}').get_by_role('button', name='Xem').click()
    expect(pr.get_by_text('evidence')).to_be_visible()
    pr.screenshot(path=str(OUT / '3-deck.png'))
    pr.get_by_test_id('deck-copy').click()
    expect(pr.get_by_text('Đã sao chép "PTE Reading" (2 từ) vào Bộ từ của tôi')).to_be_visible()
    pr.keyboard.press('Escape')
    # sao chép cả thư mục
    pr.get_by_test_id('copy-folder').click()
    expect(pr.get_by_text(re.compile('Đã sao chép thư mục "PTE Core" \\(2 bộ từ, 3 từ\\)'))).to_be_visible()
    expect(pr).to_have_url(re.compile(r'/category-list\?folder=\d+'))
    expect(pr.get_by_text('PTE Listening')).to_be_visible()

    # link bộ từ lẻ (không công khai) vẫn mở & sao chép được bằng token
    pr.goto(deck_link.replace('http://localhost:5173', BASE))
    expect(pr.get_by_text('Lâm Thịnh đã chia sẻ bộ từ')).to_be_visible()
    pr.get_by_test_id('share-copy-deck').click()
    expect(pr.get_by_text(re.compile('Đã sao chép "Bộ lẻ"'))).to_be_visible()
    pr.goto(f'{BASE}/share/khongtontai')
    expect(pr.get_by_text('Không mở được link chia sẻ')).to_be_visible()

    mine = reader.call('/categories?all=1')
    names = sorted(c['name'] for c in mine)
    assert names == ['Bộ lẻ', 'PTE Listening', 'PTE Reading', 'PTE Reading'], names
    words = reader.call('/vocabularies?pageSize=50')['items']
    assert len(words) == 6 and all(w.get('srsLevel', 0) == 0 for w in words), words

    # chủ tắt công khai → biến mất khỏi thư viện
    owner.call(f'/folders/{fid}/share', {'isPublic': False})
    assert reader.call('/community/folders')['total'] == 0

    # mobile
    pm = page_for(reader, 390, 844)
    owner.call(f'/folders/{fid}/share', {'isPublic': True})
    pm.goto(f'{BASE}/category-list?tab=community')
    expect(pm.get_by_test_id(f'public-folder-{fid}')).to_be_visible()
    pm.screenshot(path=str(OUT / '4-mobile.png'), full_page=True)
    assert pm.evaluate('document.documentElement.scrollWidth') <= 392
    br.close()

print('errors:', errors)
assert not errors
print('COMMUNITY E2E OK')
