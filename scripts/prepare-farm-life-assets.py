"""Package the four approved performances; never generate character animation."""
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / 'spec/008-farm-pet-life/static-life-reference'
OUTPUT = ROOT / 'src/renderer/assets/farm-life'
OUTPUT.mkdir(parents=True, exist_ok=True)

def sheet(name, directory):
    files = sorted(directory.glob('frame-*.png'))
    if not files:
        raise ValueError(f'Missing approved frames: {directory}')
    canvas = Image.new('RGBA', (144 * 8, 216 * ((len(files) + 7) // 8)))
    for index, path in enumerate(files):
        frame = Image.open(path).convert('RGBA')
        if frame.size != (144, 216):
            raise ValueError(f'Unexpected frame size: {path}')
        canvas.paste(frame, ((index % 8) * 144, (index // 8) * 216))
    canvas.save(OUTPUT / f'{name}.png', optimize=True)
    return len(files)

bridge = sheet('bridge', REFERENCES / 'bridge-leg-loop-frames')
sweat = sheet('sweat', REFERENCES / 'sweat-greeting-frames')
metadata = json.loads((REFERENCES / 'sweat-greeting-processing.json').read_text(encoding='utf-8'))
timing = {
    'bridge': {'frames': bridge, 'times': [round(i * 1000 / 12) for i in range(bridge)], 'duration': bridge * 1000 / 12, 'loop': True},
    'sweat': {'frames': sweat, 'times': metadata['frame_times_ms'], 'duration': metadata['source_frames'] * 1000 / metadata['source_fps'], 'loop': False}
}
(OUTPUT / 'timing.json').write_text(json.dumps(timing, indent=2), encoding='utf-8')
shutil.copyfile(REFERENCES / 'door-rest-v2.png', OUTPUT / 'door.png')
# Downsample once with an area-aware filter instead of sampling the full-resolution
# still directly at ~106-133 screen pixels in WebGL. Keep the approved source.
with Image.open(OUTPUT / 'door.png') as source:
    source.convert('RGBA').resize((144, 216), Image.Resampling.LANCZOS).save(
        OUTPUT / 'door-display.png', optimize=True)
shutil.copyfile(ROOT / 'spec/008-farm-pet-life/desktop-workwear-reference.png', OUTPUT / 'desktop-workwear.png')
shutil.copyfile(ROOT / 'spec/008-farm-pet-life/desktop-departure/magenta-v2/departure-magenta-alpha-12fps.webm', OUTPUT / 'departure.webm')
print(f'Packaged bridge {bridge}, sweat {sweat}, doorstep still, approved 79-frame 12 fps departure')
