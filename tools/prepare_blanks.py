"""
ПОДГОТОВКА ФОТО ИЗДЕЛИЙ ДЛЯ КОНСТРУКТОРА
---------------------------------------
Берёт фото изделия на белом фоне и делает два файла в img/products/:
  <id>.png       — «карта теней»: серая картинка без фона. Сайт окрашивает её
                   в выбранный цвет, сохраняя складки, швы и карманы.
  <id>-thumb.jpg — маленькое фото для карточки на первом шаге.
И пересобирает js/blanks.js — те же «карты теней» внутри JS-файла.
Так перекраска работает, даже если открыть index.html без сервера.

Запуск:  python3 tools/prepare_blanks.py <фото.png> <id>
Пример:  python3 tools/prepare_blanks.py "Худи Free Fit.png" hoodie
Нужны пакеты: pip install pillow numpy scipy
"""
import base64
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'products'
W, H = 800, 920      # размер холста = 2 × viewBox 400×460 на сайте
MARGIN = 40          # поля вокруг изделия, в пикселях холста
TARGET_CONTRAST = 0.08  # насколько заметны складки (разброс яркости ткани)


def prepare(src, pid):
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

    # 1. Фон — белые пиксели, связанные с краем картинки
    white = rgb.min(axis=2) >= 250
    labels, _ = ndimage.label(white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    mask = ndimage.binary_fill_holes(~bg)
    mask = ndimage.binary_opening(mask, iterations=2)
    # срезаем 3 px по краю: там смешаны ткань и белый фон, на тёмных цветах это светлая кайма
    mask = ndimage.binary_erosion(mask, iterations=3)

    # 2. Яркость ткани относительно «среднего» цвета изделия
    inner = ndimage.binary_erosion(mask, iterations=12)
    base = float(np.median(lum[inner]))
    if base < 80:
        # на тёмных фото сглаживаем шум, иначе он вылезет на светлых цветах
        lum = ndimage.gaussian_filter(lum, 2.0)
    ratio = lum / base
    # выравниваем контраст складок: у белого фото он слабый, у чёрного — шумный
    k = np.clip(TARGET_CONTRAST / ratio[inner].std(), 0.75, 3.0)
    ratio = 1 + (ratio - 1) * k
    shade = np.clip(ratio * 128, 0, 255).astype(np.uint8)
    print(f'{pid}: средняя яркость {base:.0f}, усиление контраста ×{k:.2f}')

    # 3. Обрезаем по изделию и кладём по центру холста W×H
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    alpha = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    gray = Image.fromarray(shade)
    rgba = Image.merge('RGBA', (gray, gray, gray, alpha)).crop((x0, y0, x1, y1))
    photo = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))

    k = min((W - 2 * MARGIN) / rgba.width, (H - 2 * MARGIN) / rgba.height)
    size = (round(rgba.width * k), round(rgba.height * k))
    pos = ((W - size[0]) // 2, (H - size[1]) // 2)

    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(rgba.resize(size, Image.LANCZOS), pos)
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.convert('LA').save(OUT / f'{pid}.png', optimize=True)

    thumb = Image.new('RGB', (W, H), (255, 255, 255))
    thumb.paste(photo.resize(size, Image.LANCZOS), pos)
    thumb.resize((W // 2, H // 2), Image.LANCZOS).save(OUT / f'{pid}-thumb.jpg', quality=85)
    print(f'{pid}: изделие в холсте x={pos[0] // 2}..{(pos[0] + size[0]) // 2}, '
          f'y={pos[1] // 2}..{(pos[1] + size[1]) // 2} (координаты viewBox 400×460)')


def build_js():
    lines = ['// Файл создан tools/prepare_blanks.py — не редактируйте вручную.',
             '// Серые «карты теней» изделий, упакованные в JS.',
             'const BLANK_IMAGES = {']
    for png in sorted(OUT.glob('*.png')):
        data = base64.b64encode(png.read_bytes()).decode()
        lines.append(f"  '{png.stem}': 'data:image/png;base64,{data}',")
    lines.append('};')
    (ROOT / 'js' / 'blanks.js').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    prepare(sys.argv[1], sys.argv[2])
    build_js()
