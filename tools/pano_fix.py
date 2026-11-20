"""Картинку-ленту (например, 21:9 из Nano Banana) превращает в панораму 360° (2:1).
- склеивает левый и правый края (бесшовный стык);
- НЕ растягивает по высоте: горизонт ставится на середину, масштаб по вертикали = по горизонтали;
  то, что не поместилось сверху, достраивается небом, снизу обрезается у надира.
python3 pano_fix.py in.jpg out.jpg --horizon 460 [--width 4096] [--overlap 5]
--horizon — строка горизонта в исходной картинке (пиксели сверху)."""
import argparse
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--horizon", type=float, default=None)
ap.add_argument("--width", type=int, default=4096)
ap.add_argument("--overlap", type=float, default=5.0)
o = ap.parse_args()

a = np.asarray(Image.open(o.src).convert("RGB")).astype(np.float32)
h, w = a.shape[:2]
n = max(8, int(w * o.overlap / 100))
ramp = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n)))[None, :, None]
strip = a[:, : w - n].copy()
strip[:, :n] = a[:, w - n:] * (1 - ramp) + a[:, :n] * ramp

W, H = o.width, o.width // 2
k = W / strip.shape[1]                       # одинаковый масштаб по обеим осям
sw, sh = W, int(round(h * k))
s_img = Image.fromarray(np.clip(strip, 0, 255).astype(np.uint8)).resize((sw, sh), Image.LANCZOS)
hz = (o.horizon if o.horizon is not None else h / 2) * k
top = int(round(H / 2 - hz))                 # где в панораме окажется верх картинки

canvas = Image.new("RGB", (W, H))
canvas.paste(s_img, (0, top))
c = np.asarray(canvas).astype(np.float32)
if top > 0:                                  # достраиваем небо: цвет верхней кромки, размытый
    edge = np.asarray(s_img)[:12].astype(np.float32).mean(axis=0)
    edge = np.asarray(Image.fromarray(edge[None].astype(np.uint8)).resize((W, 1)).filter(ImageFilter.GaussianBlur(40))).astype(np.float32)[0]
    zen = edge.mean(axis=0)
    t = np.linspace(0, 1, top)[:, None, None]
    c[:top] = zen * (1 - t) + edge[None] * t
if top + sh < H:                             # снизу не хватило — тянем нижнюю кромку
    c[top + sh:] = c[top + sh - 1][None]
out = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8))
out.save(o.dst, quality=88, optimize=True, progressive=True)
b = np.asarray(out).astype(int)
print("ok", out.size, "верх картинки на строке", top, "из", H,
      "| стык краёв:", round(float(np.abs(b[:, 0] - b[:, -1]).mean()), 1))
