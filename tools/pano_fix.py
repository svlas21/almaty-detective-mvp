"""Довести картинку из Nano Banana до панорамы 360°: бесшовный стык краёв и ровно 2:1.
python3 pano_fix.py in.jpg out.jpg [ширина=4096] [перекрытие_в_%=6]"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 4096
pct = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
w = a.shape[1]
n = max(8, int(w * pct / 100))
# Классический приём для бесшовных текстур: правый хвост шириной n накладываем
# на левый край с плавным переходом и отрезаем. Новый левый край продолжает
# то, что было справа, поэтому стык исчезает.
ramp = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n)))[None, :, None]
out = a[:, : w - n].copy()
out[:, :n] = a[:, w - n:] * (1 - ramp) + a[:, :n] * ramp
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((W, W // 2), Image.LANCZOS)
img.save(dst, quality=88, optimize=True, progressive=True)
b = np.asarray(img).astype(int)
print("ok", img.size, "разница краёв до/после:",
      round(float(np.abs(a[:, 0] - a[:, -1]).mean()), 1), round(float(np.abs(b[:, 0] - b[:, -1]).mean()), 1))
