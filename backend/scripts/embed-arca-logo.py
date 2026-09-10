from pathlib import Path
import base64
import io
from PIL import Image

src = Path(r"C:\Users\RP.Escritorio\Proyectos\GarciaCoelho\backend\arca-extract-2.png")
im = Image.open(src).convert("RGBA")
im.thumbnail((520, 220))
buf = io.BytesIO()
im.save(buf, format="PNG", optimize=True)
data = buf.getvalue()
b64 = base64.b64encode(data).decode("ascii")

out_js = Path(r"C:\Users\RP.Escritorio\Proyectos\GarciaCoelho\backend\src\templates\arcaLogoDataUrl.js")
out_js.write_text("module.exports = 'data:image/png;base64," + b64 + "';\n", encoding="utf8")
Path(r"C:\Users\RP.Escritorio\Proyectos\GarciaCoelho\backend\src\templates\arca-logo.png").write_bytes(data)
print("ok", len(data))
