from pathlib import Path
import sys

from PIL import Image


PALETTE = [
    (247, 248, 243),
    (232, 239, 239),
    (190, 219, 151),
    (139, 203, 246),
    (43, 111, 226),
    (21, 79, 190),
    (242, 91, 79),
    (239, 76, 151),
    (58, 147, 84),
    (246, 185, 145),
    (255, 253, 246),
    (29, 35, 39),
    (111, 122, 128),
]


def nearest(color: tuple[int, int, int]) -> tuple[int, int, int]:
    return min(
        PALETTE,
        key=lambda candidate: sum(
            (color[channel] - candidate[channel]) ** 2 for channel in range(3)
        ),
    )


def flatten(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGB")
    small = image.resize((image.width // 2, image.height // 2), Image.Resampling.LANCZOS)
    mapped = Image.new("RGB", small.size)
    mapped.putdata([nearest(pixel) for pixel in small.getdata()])
    mapped = mapped.resize(image.size, Image.Resampling.NEAREST)
    output.parent.mkdir(parents=True, exist_ok=True)
    mapped.save(output, quality=92, subsampling=0, optimize=True)


if __name__ == "__main__":
    flatten(Path(sys.argv[1]), Path(sys.argv[2]))
