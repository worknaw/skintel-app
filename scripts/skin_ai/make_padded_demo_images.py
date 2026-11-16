from pathlib import Path
from PIL import Image

src = Path('skin-ai-data/demo-images')
out = Path('skin-ai-data/demo-ready')
out.mkdir(parents=True, exist_ok=True)
items = [
    ('01-mild-1-reference.jpg', '01-low-acne-padded.jpg', 'low visible acne'),
    ('02-mild-5-reference.jpg', '02-medium-acne-padded.jpg', 'medium visible acne'),
    ('03-moderate-20-reference.jpg', '03-redness-padded.jpg', 'visible redness'),
]
for source, name, _ in items:
    image = Image.open(src / source).convert('RGB')
    width, height = image.size
    pad = max(width, height) // 2
    canvas = Image.new('RGB', (width + pad * 2, height + pad * 2), (205, 190, 175))
    canvas.paste(image, (pad, pad))
    canvas.save(out / name, format='JPEG', quality=92)
(out / 'expected-results.json').write_text(
    '{"purpose":"demo only","images":' + str([
        {'file': name, 'reference': reference} for _, name, reference in items
    ]).replace("'", '"') + '}', encoding='utf-8'
)
