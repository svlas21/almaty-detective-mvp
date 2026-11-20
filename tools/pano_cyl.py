#!/usr/bin/env python3
"""Лента Nano Banana — это цилиндрическая панорама (вертикаль как у обычного фото),
а не сфера. pano_fix.py растягивает её линейно, и всё, что внизу кадра, уезжает к надиру
(«воронка», улики на −60…−80°). Этот скрипт переводит результат pano_fix в настоящую
equirectangular: широта = atan(смещение / f), f = ширина / 2π. Низ ниже конца картинки
заливается тоном земли. Нижний край вида в игре ставим по выводу скрипта (locations.pano_min_pitch).

python3 tools/pano_cyl.py после_pano_fix.jpg выход.jpg
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
H, W = src.shape[:2]
c, f = H // 2, W / (2 * np.pi)
lat = (c - np.arange(H)) * (180 / H)
with np.errstate(invalid="ignore"):
    raw = c - f * np.tan(np.radians(np.clip(lat, -89.9, 89.9)))
row = np.clip(raw, 0, H - 1)
r0 = np.floor(row).astype(int); r1 = np.clip(r0 + 1, 0, H - 1); t = (row - r0)[:, None, None]
out = src[r0] * (1 - t) + src[r1] * t
last = int(np.where(raw <= H - 1)[0].max())
tone = src[-30:].reshape(-1, 3).mean(0)
floor = np.asarray(Image.fromarray(src[-30:].mean(0)[None].repeat(8, 0).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(40)))[0].astype(np.float32)
for r in range(last + 1, H):
    a = min(1, (r - last) / (H - last) * 1.5)
    out[r] = floor * (1 - a) + tone * a
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(sys.argv[2], quality=88)
print(f"ok: картинка кончается на широте {lat[last]:.1f}° → pano_min_pitch = {int(lat[last]) + 1}")
