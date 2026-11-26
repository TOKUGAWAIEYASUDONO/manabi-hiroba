#!/usr/bin/env python3
"""先生向けの紹介ページ（sensei.html）の見出し用フォントを、使う文字だけにして作る。
  使い方：python3 tools/build-lp-fonts.py ZenMaruGothic-Black.ttf YuseiMagic-Regular.ttf
  ・元のフォント（どちらも OFL-1.1）は google/fonts の ofl/zenmarugothic・ofl/yuseimagic から取る。リポジトリには入れない。
  ・必要：pip install fonttools brotli
  ・sensei.html の本文（タグ・style・script をのぞく）に出てくる文字＋数字・漢数字・曜日だけを入れる。
  ・書き出し：vendor/fonts/files/lp-zen-maru-gothic-900.woff2・lp-yusei-magic-400.woff2・vendor/fonts/lp-chars.txt（入れた文字の一覧）。
  ・文を変えたら：node tools/build-guide.js → このスクリプト → node tools/check-vendor-hashes.js --write。"""
import re, sys, os, html
from fontTools import subset
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = open(os.path.join(root, "sensei.html"), encoding="utf8").read()
body = src[src.index("<body>"):]
body = re.sub(r"<(script|style)\b.*?</\1>", "", body, flags=re.S)
text = html.unescape(re.sub(r"<[^>]+>", "", body))
# 日直の日付（スクリプトが入れる）と、場面ごとの「◯分」に使う文字
extra = "0123456789〇一二三四五六七八九十月日（）日月火水木金土分"
chars = "".join(sorted(set(c for c in text + extra if not c.isspace())))
out = os.path.join(root, "vendor", "fonts")
for ttf, name in ((sys.argv[1], "lp-zen-maru-gothic-900.woff2"), (sys.argv[2], "lp-yusei-magic-400.woff2")):
    opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = ["*"]; opt.notdef_outline = True
    font = subset.load_font(ttf, opt)
    sub = subset.Subsetter(opt); sub.populate(text=chars + " "); sub.subset(font)
    subset.save_font(font, os.path.join(out, "files", name), opt)
    print(name, os.path.getsize(os.path.join(out, "files", name)), "bytes")
open(os.path.join(out, "lp-chars.txt"), "w", encoding="utf8").write(chars + "\n")
print(len(chars), "文字")
