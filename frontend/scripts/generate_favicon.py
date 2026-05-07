import math
import zlib
import struct

w, h = 32, 32
ball_radius = 10
ball_center = (w // 2, h // 2)
img = bytearray()

background_colors = [
    (16, 24, 38, 255),
    (28, 36, 68, 255),
    (68, 22, 26, 255),
]
ball_colors = [
    (52, 118, 255, 255),
    (220, 64, 64, 255),
    (245, 245, 245, 255),
]

for y in range(h):
    for x in range(w):
        dx = x - ball_center[0]
        dy = y - ball_center[1]
        angle = (math.atan2(dy, dx) + 2 * math.pi) % (2 * math.pi)
        dist = math.hypot(dx, dy)

        # Background with 3 slices
        slice_index = int(angle / (2 * math.pi / 3))
        pixel = background_colors[slice_index]

        # Draw ball in the center
        if dist <= ball_radius:
            if angle < 2 * math.pi / 3:
                pixel = ball_colors[0]
            elif angle < 4 * math.pi / 3:
                pixel = ball_colors[1]
            else:
                pixel = ball_colors[2]

            # Add border on ball edge
            if ball_radius - 1 < dist <= ball_radius:
                pixel = (20, 20, 20, 255)

        img.extend(pixel)

rows = bytearray()
for y in range(h):
    rows.append(0)
    rows.extend(img[y * w * 4 : (y + 1) * w * 4])


def chunk(name, data):
    return struct.pack(
        ">I", len(data)
    ) + name + data + struct.pack(
        ">I", zlib.crc32(name + data) & 0xFFFFFFFF
    )

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(rows, 9))
png += chunk(b"IEND", b"")

ico = bytearray()
ico += struct.pack("<HHH", 0, 1, 1)
ico += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(png), 22)
ico.extend(png)

with open("public/favicon.ico", "wb") as f:
    f.write(ico)
print(f"Generated public/favicon.ico ({len(ico)} bytes)")
