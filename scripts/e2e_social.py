"""E2E: Xếp hạng – BXH lượt chơi/streak, heatmap, chuỗi chung giữa 2 người, chat cộng đồng."""
import json
import re
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE, API = 'http://localhost:5173', 'http://localhost:4000/api'
OUT = Path('/home/claude/shots/social')
OUT.mkdir(parents=True, exist_ok=True)


class User:
    def __init__(self, email):
        self.email = email
        self.jar = CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        code = self.call('/auth/email/request-code', {'email': email})['devCode']
        self.call('/auth/email/verify-code', {'email': email, 'code': code})

    def call(self, path, body=None, method=None):
        req = urllib.request.Request(f'{API}{path}', data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
        return json.loads(self.op.open(req).read())

    def play(self, n=1):
        cat = self.call('/categories', {'name': 'x'})
        self.call('/vocabularies/bulk', {'categoryId': cat['id'], 'items': [{'word': 'hello', 'meaning': 'xin chào'}]})
        vid = self.call('/vocabularies?pageSize=1')['items'][0]['id']
        for _ in range(n):
            self.call('/practice/sessions', {'mode': 'quiz', 'results': [{'id': vid, 'correct': True}]})


a, bob = User('an@matong.dev'), User('binh@matong.dev')
a.call('/auth/profile', {'name': 'An Nguyễn'}, method='PATCH')
bob.call('/auth/profile', {'name': 'Bình Trần'}, method='PATCH')
a.play(3)
bob.play(5)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

    def page_for(u):
        ctx = br.new_context(viewport={'width': 1504, 'height': 900})
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': 'localhost', 'path': '/'} for c in u.jar])
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        return pg

    errors = []
    pa = page_for(a)
    pa.goto(f'{BASE}/leaderboard')
    expect(pa.get_by_text('Bình Trần')).to_be_visible()
    expect(pa.get_by_test_id('heatmap')).to_be_visible()
    # mời chuỗi chung
    pa.get_by_role('button', name='Đã gửi').click()
    pa.get_by_placeholder('Email bạn bè').fill('binh@matong.dev')
    pa.get_by_text('Gửi', exact=True).click()
    expect(pa.get_by_text('Đã gửi lời mời')).to_be_visible()
    # chat
    pa.get_by_placeholder('Nhập tin nhắn...').fill('Chào cả nhà, mình mới tham gia Mật Ong 🐝')
    pa.get_by_label('Gửi', exact=True).click()
    expect(pa.get_by_test_id('chat').get_by_text('Chào cả nhà')).to_be_visible()

    pb = page_for(bob)
    pb.goto(f'{BASE}/leaderboard')
    pb.get_by_role('button', name=re.compile('Lời mời')).click()
    expect(pb.get_by_text('mời bạn giữ chuỗi chung')).to_be_visible()
    pb.get_by_role('button', name='Đồng ý').click()
    expect(pb.get_by_text('Đã bắt đầu chuỗi chung')).to_be_visible()
    pb.get_by_label('Trả lời').first.click()
    pb.get_by_placeholder('Nhập tin nhắn...').fill('Chào An, cùng giữ chuỗi nhé!')
    pb.get_by_label('Gửi', exact=True).click()
    expect(pb.get_by_test_id('chat').get_by_text('Chào An, cùng giữ chuỗi nhé!')).to_be_visible()

    pa.reload()
    pa.get_by_role('button', name='Chuỗi chung').click()
    expect(pa.get_by_text('🔥 1').first).to_be_visible()
    pa.wait_for_timeout(5500)  # chờ chat tự cập nhật
    expect(pa.get_by_test_id('chat').get_by_text('Chào An, cùng giữ chuỗi nhé!')).to_be_visible()
    pa.screenshot(path=str(OUT / 'leaderboard.png'))
    pa.get_by_role('button', name=re.compile('Streak')).click()
    pa.wait_for_timeout(600)
    pa.get_by_role('button', name='Xếp hạng').click()
    pa.wait_for_timeout(600)
    pa.screenshot(path=str(OUT / 'streak-tab.png'))
    print('JS errors:', errors or 'none')
    br.close()
