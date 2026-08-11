"""Generate logo Aplikasi Sarpras raster assets (PNG/ICO) from the same design as logo-sarpras.svg.
Uses PIL only (no numpy/cairosvg). Run from frontend/ dir."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
S = 256  # master size (viewBox 64 -> scale 4x)


def gradient_image(size):
    """Diagonal blue gradient #2563EB -> #1E3A8A, no numpy."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    top = (0x25, 0x63, 0xEB)
    bot = (0x1E, 0x3A, 0x8A)
    denom = size * 2
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(top, bot))
    return img


def draw_logo(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    k = size / S  # scale factor

    # Badge (rounded rect) with gradient
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((6*k, 6*k, 250*k, 250*k), radius=60*k, fill=255)
    img.paste(gradient_image(size), (0, 0), mask)
    d = ImageDraw.Draw(img)

    # Roof (yellow triangle with amber outline)
    roof = [(34*k, 120*k), (128*k, 54*k), (222*k, 120*k)]
    d.polygon(roof, fill='#FACC15', outline='#F59E0B', width=max(1, int(1*k)))
    # Building body (white rounded rect)
    d.rounded_rectangle((52*k, 118*k, 204*k, 210*k), radius=10*k, fill='#FFFFFF', outline='#E2E8F0', width=max(1, int(1*k)))
    # Windows
    d.rounded_rectangle((70*k, 136*k, 98*k, 158*k), radius=4*k, fill='#BFDBFE', outline='#93C5FD', width=max(1, int(1*k)))
    d.rounded_rectangle((158*k, 136*k, 186*k, 158*k), radius=4*k, fill='#BFDBFE', outline='#93C5FD', width=max(1, int(1*k)))
    # Door (arch)
    x0, x1 = 110*k, 146*k
    top, bot = 174*k, 210*k
    d.rectangle((x0, (top + bot) / 2, x1, bot), fill='#1E40AF')
    d.ellipse((x0, top, x1, top + (x1 - x0)), fill='#1E40AF')
    return img


def main():
    img256 = draw_logo(256)
    img256.save(os.path.join(OUT, 'images', 'logo-sarpras-256.png'))
    img256.save(os.path.join(OUT, 'images', 'logo-sarpras.png'))
    # favicon.ico with multiple sizes
    img48 = draw_logo(48)
    img32 = draw_logo(32)
    img16 = draw_logo(16)
    img256.save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)], append_images=[img16, img32, img48])
    # apple-touch-icon (180x180)
    draw_logo(180).save(os.path.join(OUT, 'apple-touch-icon.png'))
    print('OK: logo-sarpras.png, logo-sarpras-256.png, favicon.ico, apple-touch-icon.png')


if __name__ == '__main__':
    main()
