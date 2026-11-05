"""Sinh ảnh SVG cho cửa hàng Mật Ong (ảnh đại diện dạng tranh phong cảnh + sticker meme). Chạy lại khi muốn đổi ảnh."""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'client' / 'public' / 'shop'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 640, 360


def svg(body, w=W, h=H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'


def grad(id_, c1, c2, vertical=True):
    x2, y2 = ('0', '1') if vertical else ('1', '0')
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'


def hexagon(cx, cy, r, fill, stroke='#B45309'):
    import math
    pts = ' '.join(f'{cx + r * math.cos(math.radians(60 * i + 30)):.1f},{cy + r * math.sin(math.radians(60 * i + 30)):.1f}' for i in range(6))
    return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="3"/>'


SCENES = {
    'to-ong': svg(f'<defs>{grad("g", "#FFF7E0", "#FCD34D")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                  + ''.join(hexagon(120 + (i % 6) * 84 + (42 if (i // 6) % 2 else 0), 70 + (i // 6) * 74, 44,
                                    ['#F59E0B', '#FBBF24', '#FDE68A'][i % 3]) for i in range(24))
                  + '<text x="560" y="320" font-size="70">🐝</text>'),
    'hoa-huong-duong': svg(f'<defs>{grad("g", "#7DD3FC", "#E0F2FE")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                           '<rect y="250" width="640" height="110" fill="#4ADE80"/>'
                           + ''.join(f'<line x1="{x}" y1="{y}" x2="{x}" y2="360" stroke="#15803D" stroke-width="6"/>'
                                     f'<circle cx="{x}" cy="{y}" r="34" fill="#FACC15"/><circle cx="{x}" cy="{y}" r="16" fill="#78350F"/>'
                                     for x, y in [(90, 190), (220, 160), (360, 200), (500, 150), (590, 210)])
                           + '<circle cx="80" cy="60" r="36" fill="#FDE047"/>'),
    'bien-dem': svg(f'<defs>{grad("g", "#0F172A", "#1E3A8A")}{grad("s", "#1D4ED8", "#0EA5E9")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                    '<circle cx="500" cy="90" r="46" fill="#FEF3C7"/><circle cx="520" cy="80" r="46" fill="#1E293B"/>'
                    + ''.join(f'<circle cx="{(i * 97) % 640}" cy="{(i * 53) % 200}" r="{1 + i % 3}" fill="white" opacity=".8"/>' for i in range(40))
                    + '<path d="M0 250 Q80 230 160 250 T320 250 T480 250 T640 250 V360 H0Z" fill="url(#s)"/>'
                    '<path d="M0 290 Q80 270 160 290 T320 290 T480 290 T640 290 V360 H0Z" fill="#1E40AF" opacity=".8"/>'),
    'rung-thong': svg(f'<defs>{grad("g", "#BBF7D0", "#F0FDF4")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                      + ''.join(f'<polygon points="{x},{y} {x - 50},{y + 140} {x + 50},{y + 140}" fill="{c}"/><rect x="{x - 8}" y="{y + 140}" width="16" height="40" fill="#78350F"/>'
                                for x, y, c in [(70, 120, '#166534'), (170, 80, '#15803D'), (280, 130, '#14532D'), (390, 90, '#166534'), (500, 120, '#15803D'), (600, 100, '#14532D')])
                      + '<rect y="300" width="640" height="60" fill="#65A30D"/>'),
    'meo-ngu': svg(f'<defs>{grad("g", "#FCE7F3", "#FBCFE8")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                   '<ellipse cx="320" cy="250" rx="170" ry="70" fill="#F9A8D4"/>'
                   '<text x="320" y="270" font-size="150" text-anchor="middle">😺</text><text x="470" y="120" font-size="48">💤</text>'),
    'nui-tuyet': svg(f'<defs>{grad("g", "#E0E7FF", "#F8FAFC")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                     '<polygon points="0,360 180,110 360,360" fill="#64748B"/><polygon points="180,110 225,170 135,170" fill="white"/>'
                     '<polygon points="220,360 430,70 640,360" fill="#475569"/><polygon points="430,70 485,145 375,145" fill="white"/>'
                     '<circle cx="90" cy="70" r="30" fill="#FDE68A"/>'),
    'thanh-pho': svg(f'<defs>{grad("g", "#FB923C", "#7C3AED")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                     '<circle cx="320" cy="230" r="80" fill="#FDE047" opacity=".9"/>'
                     + ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{360 - y}" fill="#1E1B4B"/>' for x, y, w in
                               [(0, 200, 70), (75, 150, 60), (140, 230, 50), (195, 120, 70), (270, 210, 60), (335, 170, 55), (395, 100, 75), (475, 190, 60), (540, 140, 100)])
                     + ''.join(f'<rect x="{x}" y="{y}" width="8" height="10" fill="#FDE68A"/>' for x, y in
                               [(90, 170), (110, 190), (215, 140), (235, 170), (415, 120), (440, 150), (560, 160), (590, 190)])),
    'vu-tru': svg(f'<defs>{grad("g", "#020617", "#312E81")}</defs><rect width="640" height="360" fill="url(#g)"/>'
                  + ''.join(f'<circle cx="{(i * 131) % 640}" cy="{(i * 71) % 360}" r="{1 + i % 2}" fill="white"/>' for i in range(70))
                  + '<circle cx="470" cy="150" r="70" fill="#F97316"/><ellipse cx="470" cy="150" rx="120" ry="22" fill="none" stroke="#FDBA74" stroke-width="8"/>'
                  '<text x="120" y="250" font-size="80">🚀</text>'),
}

STICKERS = {  # meme đúng / sai (sticker tự vẽ)
    'ong-like': ('#FEF3C7', '🐝', '👍', 'Đúng rồi!'),
    'meo-vui': ('#DCFCE7', '😸', '🎉', 'Giỏi quá!'),
    'cho-vui': ('#E0F2FE', '🐶', '✨', 'Xuất sắc!'),
    'meo-hoi': ('#FEE2E2', '🙀', '❓', 'Hả??'),
    'cho-nghi': ('#FFEDD5', '🐶', '🤔', 'Sai rồi kìa'),
    'ong-buon': ('#F3E8FF', '🐝', '💧', 'Thử lại nha'),
}

for name, body in SCENES.items():
    (OUT / f'{name}.svg').write_text(body, encoding='utf-8')
for name, (bg, a, b, text) in STICKERS.items():
    (OUT / f'meme-{name}.svg').write_text(svg(
        f'<rect width="320" height="320" rx="40" fill="{bg}"/>'
        f'<text x="160" y="185" font-size="150" text-anchor="middle">{a}</text>'
        f'<text x="250" y="110" font-size="70" text-anchor="middle">{b}</text>'
        f'<text x="160" y="285" font-size="34" font-weight="800" text-anchor="middle" fill="#1A202C" font-family="sans-serif">{text}</text>', 320, 320), encoding='utf-8')
print('generated', len(SCENES), 'scenes,', len(STICKERS), 'stickers ->', OUT)
