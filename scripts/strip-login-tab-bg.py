"""
Prepare auth-login-tab-active.png: remove solid/near-black matting (clean exports on black).

For older checkerboard exports, re-drop the source PNG and run this script; it keys dark
backdrop pixels while keeping the blue pill, white type, and cyan glow.
"""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    from PIL import Image

    root = Path(__file__).resolve().parents[1]
    path = root / "assets" / "images" / "auth-login-tab-active.png"
    if not path.exists():
        print("missing", path, file=sys.stderr)
        return 1

    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    def key(x: int, y: int) -> None:
        r, g, b, a = px[x, y]
        if a == 0:
            return
        mx, mn = max(r, g, b), min(r, g, b)
        sat = mx - mn
        lum = (r + g + b) / 3.0
        # Matte black / dark gray studio backdrop
        if mx < 38 and sat < 32:
            px[x, y] = (0, 0, 0, 0)
            return
        if lum < 32 and sat < 38:
            px[x, y] = (0, 0, 0, 0)
            return
        if lum < 48 and sat < 14 and mx < 58:
            px[x, y] = (0, 0, 0, 0)
            return
        px[x, y] = (r, g, b, 255)

    for y in range(h):
        for x in range(w):
            key(x, y)

    # Trim obvious stray light pixels on the outer 3% (export fringe)
    xl = int(w * 0.03)
    xr = int(w * 0.97)
    yt = int(h * 0.03)
    yb = int(h * 0.97)
    for y in range(h):
        for x in range(w):
            if xl <= x < xr and yt <= y < yb:
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx = max(r, g, b)
            sat = mx - min(r, g, b)
            lum = (r + g + b) / 3.0
            if lum > 200 and sat < 40 and mx < 252:
                px[x, y] = (0, 0, 0, 0)

    img.save(path, optimize=True)
    print("wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
