from pathlib import Path

from PIL import Image


SOURCE = Path(
    "/var/folders/jj/mlrksnzn3nxcfwkfqgcpg0gh0000gp/T/"
    "codex-clipboard-9d2a66a0-2d6c-40af-85c7-38b70ecda2bf.png"
)
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "brand"


def extract_alpha(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    alpha = Image.new("L", rgb.size)
    alpha_pixels = alpha.load()

    sample_height = 18
    for x in range(width):
        top = tuple(
            sum(pixels[x, y][channel] for y in range(sample_height)) / sample_height
            for channel in range(3)
        )
        bottom = tuple(
            sum(
                pixels[x, height - 1 - y][channel]
                for y in range(sample_height)
            )
            / sample_height
            for channel in range(3)
        )

        for y in range(height):
            ratio = y / max(height - 1, 1)
            background = tuple(
                top[channel] * (1 - ratio) + bottom[channel] * ratio
                for channel in range(3)
            )
            source = pixels[x, y]

            # The red channel has the strongest separation between the blue
            # background and the white wordmark. Reconstruct the foreground
            # alpha from the original white-over-blue composite.
            denominator = max(255 - background[0], 1)
            value = (source[0] - background[0]) / denominator
            value = max(0.0, min(1.0, value))

            # Remove weak compression noise while retaining antialiased edges.
            if value < 0.025:
                value = 0.0
            elif value > 0.975:
                value = 1.0

            alpha_pixels[x, y] = round(value * 255)

    bbox = alpha.point(lambda value: 255 if value > 4 else 0).getbbox()
    if bbox is None:
        raise RuntimeError("No wordmark pixels were detected")

    padding = 8
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(width, bbox[2] + padding)
    bottom = min(height, bbox[3] + padding)
    return alpha.crop((left, top, right, bottom))


def save_variant(alpha: Image.Image, color: tuple[int, int, int], name: str) -> None:
    layer = Image.new("RGBA", alpha.size, (*color, 0))
    layer.putalpha(alpha)
    layer.save(OUTPUT_DIR / name, optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    alpha = extract_alpha(Image.open(SOURCE))
    save_variant(alpha, (255, 255, 255), "lingostory-wordmark-white.png")
    save_variant(alpha, (23, 23, 23), "lingostory-wordmark-ink.png")


if __name__ == "__main__":
    main()
