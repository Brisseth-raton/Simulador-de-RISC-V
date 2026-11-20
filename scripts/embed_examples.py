import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
samples = [
    ("riscvtest", "RISC-V Test", "Operaciones y salto. Resultado: 25 en 0x64.", "0x00000064"),
    ("quicksort", "Quicksort", "Ordena 7 enteros en memoria desde 0x1000.", "0x00001000"),
    ("arbol_simetrico", "Árbol simétrico", "Comprueba un árbol binario. Resultado: a0 = 1.", "0x00001000"),
    ("factorial", "Factorial", "Calcula 6! = 720 y lo guarda en 0x1040.", "0x00001040"),
]
data = []
for key, title, detail, address in samples:
    encoded = base64.b64encode((root / "programs" / f"{key}.bin").read_bytes()).decode("ascii")
    data.append({"id": key, "name": title, "detail": detail, "address": address, "file": key + ".bin", "bytes": encoded})
(root / "samples.js").write_text("const SAMPLES = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
