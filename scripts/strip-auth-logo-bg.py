"""Remove checker backdrop from pulseverse-premium-logo.png (edge band + blue/white rules)."""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    from PIL import Image

    root = Path(__file__).resolve().parents[1]
    path = root / "assets" / "images" / "pulseverse-premium-logo.png"
    if not path.exists():
        print("missing", path, file=sys.stderr)
        return 1

    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    border = max(12, int(min(w, h) * 0.04))

    def stats(p: tuple[int, int, int]):
        r, g, b = int(p[0]), int(p[1]), int(p[2])
        mx = max(r, g, b)
        mn = min(r, g, b)
        return mx, mn, mx - mn, (r + g + b) / 3.0

    def is_blue_family(p: tuple[int, int, int]) -> bool:
        r, g, b = int(p[0]), int(p[1]), int(p[2])
        mx, _mn, sat, _lum = stats(p)
        if mx < 32:
            return False
        if b >= r + 4 or (g >= r + 3 and b > r + 1):
            return True
        return sat > 18 and mx > 45 and b >= r - 4

    def in_band(x: int, y: int) -> bool:
        return x < border or x >= w - border or y < border or y >= h - border

    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            p = (r, g, b)
            mx, _mn, sat, lum = stats(p)
            blue = is_blue_family(p)

            if in_band(x, y) and not blue and sat < 45 and lum > 100:
                px[x, y] = (0, 0, 0, 0)
                continue

            if not blue and sat < 26 and 170 < lum < 238:
                px[x, y] = (0, 0, 0, 0)
                continue

            if not blue and sat < 16 and 70 < lum < 230:
                px[x, y] = (0, 0, 0, 0)
                continue

            # Dark letter interior (blue-cast shadows)
            if blue or (mx > 38 and sat > 14) or lum > 175 or (lum > 140 and mx > 65):
                px[x, y] = (r, g, b, 255)
            else:
                px[x, y] = (0, 0, 0, 0)

    img.save(path, optimize=True)
    print("wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
