"""Máy chủ giả lập API Claude cho kiểm thử (không gọi dịch vụ thật).
Chạy: python3 scripts/mock_claude.py  →  http://localhost:4999/v1/messages
Rồi khởi động API với ANTHROPIC_API_KEY=test ANTHROPIC_API_URL=http://localhost:4999/v1/messages
"""
import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

LOG = []


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        LOG.append(body)
        if self.headers.get('x-api-key') != 'test':
            return self.reply(401, {'type': 'error', 'error': {'type': 'authentication_error', 'message': 'bad key'}})
        system = body.get('system', '')
        content = body['messages'][0]['content']
        text = ' '.join(c.get('text', '') for c in content if c['type'] == 'text')
        has_image = any(c['type'] == 'image' for c in content)
        if 'soạn từ vựng' in system:
            if has_image:
                words = [{'word': 'harbor', 'ipa': '/ˈhɑːrbər/', 'pos': 'noun', 'meaning': 'bến cảng', 'example': 'The ship returned to the harbor.'}]
            elif 'doan_van' in text:
                picked = json.loads(text[text.rindex('['):])
                words = [{'word': w, 'ipa': '', 'pos': 'noun', 'meaning': f'nghĩa của {w}', 'example': f'This is {w}.'} for w in picked]
            else:
                words = [
                    {'word': 'boarding pass', 'ipa': '/ˈbɔːrdɪŋ pæs/', 'pos': 'noun', 'meaning': 'thẻ lên máy bay', 'example': 'Please show your boarding pass.'},
                    {'word': 'luggage', 'ipa': '/ˈlʌɡɪdʒ/', 'pos': 'noun', 'meaning': 'hành lý', 'example': 'My luggage is too heavy.'},
                    {'word': 'delay', 'ipa': '/dɪˈleɪ/', 'pos': 'VERB', 'meaning': 'trì hoãn', 'example': 'The flight was delayed.'},
                    {'word': 'luggage', 'ipa': '', 'pos': 'noun', 'meaning': 'trùng lặp', 'example': ''},
                ]
            out = '```json\n' + json.dumps({'words': words}, ensure_ascii=False) + '\n```'
        elif 'chấm câu' in system:
            word = re.search(r'Từ được giao: "(.+?)"', text).group(1)
            sentence = re.search(r'<cau_cua_hoc_sinh>\n(.*)\n</cau_cua_hoc_sinh>', text, re.S).group(1)
            ok = word.lower() in sentence.lower()
            out = json.dumps({'score': 90 if ok else 10, 'summary': 'Câu tốt, dùng từ đúng.' if ok else 'Câu chưa dùng từ được giao.',
                              'better': f'I really {word} it.', 'corrected': sentence, 'meaning': 'Nghĩa của câu.', 'grammar': 'Ổn.',
                              'vocabulary': 'Dùng từ đúng.' if ok else 'Thiếu từ.'}, ensure_ascii=False)
        elif 'Dịch từng câu' in system:
            items = json.loads(text)
            out = json.dumps({'items': [{'id': i['id'], 'vi': f"[VI] {i['en']}"} for i in items]}, ensure_ascii=False)
        else:
            out = '{}'
        self.reply(200, {'id': 'msg_mock', 'type': 'message', 'role': 'assistant', 'content': [{'type': 'text', 'text': out}],
                         'model': body.get('model'), 'stop_reason': 'end_turn'})

    def reply(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == '__main__':
    HTTPServer(('127.0.0.1', 4999), H).serve_forever()
