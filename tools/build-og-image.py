"""index.html の mb-n と色トークンを手本に共有画像を描く。Pillow のみ。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
S = 2
im = Image.new('RGB', (1200*S, 630*S), '#e9f4e4')
d = ImageDraw.Draw(im)
def box(xy, fill, outline=None, width=1, radius=0):
    xy = tuple(int(v*S) for v in xy)
    d.rounded_rectangle(xy, radius=radius*S, fill=fill, outline=outline, width=width*S)
def line(points, fill, width=1, joint='curve'):
    d.line([(int(x*S),int(y*S)) for x,y in points], fill=fill, width=width*S, joint=joint)
def ellipse(xy, fill, outline=None, width=1):
    d.ellipse(tuple(int(v*S) for v in xy), fill=fill, outline=outline, width=width*S)
def txt(xy, value, size, color, bold=False):
    font = ImageFont.truetype('C:/Windows/Fonts/BIZ-UDGothicB.ttc' if bold else 'C:/Windows/Fonts/BIZ-UDGothicR.ttc', size*S)
    d.text((xy[0]*S,xy[1]*S), value, font=font, fill=color)

# 黒板（index.html の --board / --wood / --chalk）
box((66,65,1134,565), '#1f4d3a', '#c9a066', 18, 18)
box((82,81,1118,549), None, '#16372a', 2, 7)
txt((129,114), 'まなびひろば', 104, '#ffffff', True)
line([(130,271),(805,271)], '#d6ebdd', 3)
txt((132,308), '小学生の 学習ゲーム', 50, '#ffffff', True)
txt((132,392), '無料・登録不要', 48, '#d6ebdd', True)

# index.html の mb-b / mb-n と同じ輪郭・色の「めばえ」を拡大して描く。
# 双葉、丸い顔、ほお、体、足、手、目、口。
edge='#16372a'; green='#7ccf6b'; cream='#fff3d6'; pink='#f6a9b4'; go='#1b7a4b'
line([(910,463),(910,513)], edge, 9); line([(972,463),(972,513)], edge, 9)
ellipse((863,329,1019,492), go, edge, 7)
ellipse((851,215,1031,395), cream, edge, 8)
d.polygon([(941*S,232*S),(918*S,171*S),(856*S,151*S),(870*S,198*S)], fill=green)
line([(941,232),(918,171),(856,151),(870,198),(941,232)], edge, 6)
d.polygon([(941*S,232*S),(964*S,171*S),(1026*S,151*S),(1012*S,198*S)], fill=green)
line([(941,232),(964,171),(1026,151),(1012,198),(941,232)], edge, 6)
line([(941,231),(941,165)], edge, 7)
line([(869,426),(823,468)], edge, 8); line([(1013,426),(1059,468)], edge, 8)
ellipse((874,310,894,330), pink); ellipse((988,310,1008,330), pink)
ellipse((906,290,925,309), edge); ellipse((957,290,976,309), edge)
line([(926,339),(941,349),(956,339)], edge, 6)

im.resize((1200,630), Image.Resampling.LANCZOS).save(ROOT/'vendor/img/og-home.png', optimize=True)
