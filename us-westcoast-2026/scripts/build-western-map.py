"""Build the travel atlas backdrop from the US Census 2025 state boundaries."""

from pathlib import Path
import io
import struct
import urllib.request
import zipfile

SOURCE = "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip"
TARGET = Path(__file__).resolve().parents[1] / "assets" / "western-states.svg"
W, H = 1000, 820
WEST, EAST, SOUTH, NORTH = -125.7, -113.5, 32.0, 42.9
STATES = {"California", "Oregon", "Nevada", "Arizona", "Utah"}


def project(lon, lat):
    return (lon - WEST) / (EAST - WEST) * W, (NORTH - lat) / (NORTH - SOUTH) * H


with urllib.request.urlopen(SOURCE) as response:
    archive = zipfile.ZipFile(io.BytesIO(response.read()))
    shp = archive.read("cb_2025_us_state_500k.shp")
    dbf = archive.read("cb_2025_us_state_500k.dbf")

record_count = struct.unpack_from("<I", dbf, 4)[0]
header_length, record_length = struct.unpack_from("<HH", dbf, 8)
fields = []
offset = 1
for pos in range(32, header_length - 1, 32):
    field = dbf[pos:pos + 32]
    if field[0] == 13:
        break
    name = field[:11].split(b"\0")[0].decode("ascii")
    length = field[16]
    fields.append((name, offset, length))
    offset += length
name_field = next((start, length) for name, start, length in fields if name == "NAME")
names = []
for index in range(record_count):
    start = header_length + index * record_length
    column, length = name_field
    names.append(dbf[start + column:start + column + length].decode("latin1").strip())

paths = []
position = 100
index = 0
while position + 8 <= len(shp):
    content_length = struct.unpack_from(">I", shp, position + 4)[0] * 2
    body = position + 8
    if index < len(names) and names[index] in STATES and struct.unpack_from("<I", shp, body)[0] == 5:
        parts_count, points_count = struct.unpack_from("<II", shp, body + 36)
        part_offsets = list(struct.unpack_from(f"<{parts_count}I", shp, body + 44)) + [points_count]
        point_start = body + 44 + 4 * parts_count
        for part in range(parts_count):
            start, end = part_offsets[part:part + 2]
            coords = []
            for p in range(start, end, 3):
                lon, lat = struct.unpack_from("<dd", shp, point_start + p * 16)
                x, y = project(lon, lat)
                coords.append(f"{x:.1f},{y:.1f}")
            if len(coords) >= 3:
                paths.append((names[index], "M" + "L".join(coords) + "Z"))
    position = body + content_length
    index += 1

colors = {"California": "#dfd9c8", "Oregon": "#e9e4d8", "Nevada": "#e8e2d3", "Arizona": "#ebe4d6", "Utah": "#eee9df"}
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">',
       '<rect width="1000" height="820" fill="#b9c9c7"/>',
       '<path d="M0 0H1000V820H0Z" fill="#bdd0d0"/>']
for name, path in paths:
    svg.append(f'<path d="{path}" fill="{colors[name]}" stroke="#f7f4ea" stroke-width="1.5"/>')
svg.append('</svg>')
TARGET.write_text("".join(svg), encoding="utf-8")
print(TARGET)
