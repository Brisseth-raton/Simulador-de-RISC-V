const cpu = new RiscV();
const $ = id => document.getElementById(id);
const registerNames = ["zero","ra","sp","gp","tp","t0","t1","t2","s0","s1","a0","a1","a2","a3","a4","a5","a6","a7","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","t3","t4","t5","t6"];
let running = false;
let timer = null;
let memoryStart = 0x1000;
let history = [];
let previousPc = -1;

function formatHex(value, size = 8) {
  return "0x" + (value >>> 0).toString(16).padStart(size, "0").toUpperCase();
}

function log(message, kind = "") {
  history.push({ message, kind });
  if (history.length > 70) history.shift();
  const area = $("log");
  area.replaceChildren();
  history.forEach((entry, index) => {
    const line = document.createElement("div");
    line.className = "log-entry " + entry.kind;
    const num = document.createElement("span");
    num.className = "log-index";
    num.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.textContent = entry.message;
    line.append(num, text);
    area.append(line);
  });
  area.scrollTop = area.scrollHeight;
}

function updateStatus() {
  let label = "Sin programa";
  let state = cpu.status;
  if (cpu.status === "ready") label = running ? "En ejecución" : "Listo para ejecutar";
  if (cpu.status === "ready" && running) state = "running";
  if (cpu.status === "halted") label = "Ejecución finalizada";
  if (cpu.status === "error") label = "Error de ejecución";
  $("status").dataset.state = state;
  $("statusText").textContent = label;
  $("step").disabled = running || cpu.status !== "ready";
  $("run").disabled = running || cpu.status !== "ready";
  $("pause").disabled = !running;
  $("restart").disabled = !cpu.original;
}

function renderRegisters() {
  const target = $("registers");
  target.replaceChildren();
  for (let i = 0; i < 32; i++) {
    const entry = document.createElement("div");
    entry.className = "reg" + (cpu.changedRegisters.includes(i) ? " changed" : "");
    const title = document.createElement("div");
    title.className = "reg-title";
    const name = document.createElement("span");
    name.className = "reg-name";
    name.textContent = "x" + i;
    const alias = document.createElement("span");
    alias.className = "reg-alias";
    alias.textContent = registerNames[i];
    const value = document.createElement("div");
    value.className = "reg-value";
    value.textContent = formatHex(cpu.registers[i]);
    title.append(name, alias);
    entry.append(title, value);
    target.append(entry);
  }
}

function renderInstructions() {
  const target = $("instructions");
  target.replaceChildren();
  if (!cpu.programSize) {
    target.innerHTML = '<div class="code-empty">Carga un archivo .bin o selecciona un ejemplo.</div>';
    $("instructionRange").textContent = "—";
    return;
  }
  const maxLines = Math.ceil(cpu.programSize / 4);
  let currentLine = Math.floor(cpu.pc / 4);
  if (cpu.pc >= cpu.programSize) currentLine = maxLines - 1;
  const firstLine = Math.max(0, Math.min(currentLine - 8, maxLines - 21));
  const lastLine = Math.min(maxLines, firstLine + 21);
  for (let i = firstLine; i < lastLine; i++) {
    const addr = i * 4;
    const word = cpu.read32(addr);
    const decoded = decodeInstruction(word, addr);
    const line = document.createElement("div");
    line.className = "code-line" + (cpu.pc === addr ? " current" : "") + (decoded.op === "invalid" ? " invalid" : "");
    const address = document.createElement("span");
    address.className = "address";
    address.textContent = formatHex(addr);
    const machine = document.createElement("span");
    machine.className = "machine";
    machine.textContent = word.toString(16).padStart(8, "0").toUpperCase();
    const instr = document.createElement("span");
    instr.className = "instruction";
    instr.textContent = decoded.text;
    line.append(address, machine, instr);
    target.append(line);
  }
  $("instructionRange").textContent = formatHex(firstLine * 4) + " – " + formatHex((lastLine - 1) * 4);
}

function renderMemory() {
  const headers = $("memoryHeaders");
  headers.replaceChildren();
  const first = document.createElement("span");
  first.textContent = "DIR";
  headers.append(first);
  for (let i = 0; i < 16; i++) {
    const item = document.createElement("span");
    item.textContent = i.toString(16).padStart(2, "0").toUpperCase();
    item.style.textAlign = "center";
    headers.append(item);
  }
  const gap = document.createElement("span");
  gap.textContent = "";
  headers.append(gap);
  const asciiHead = document.createElement("span");
  asciiHead.textContent = "ASCII";
  headers.append(asciiHead);
  const area = $("memory");
  area.replaceChildren();
  for (let r = 0; r < 8; r++) {
    const address = (memoryStart + r * 16) >>> 0;
    const row = document.createElement("div");
    row.className = "memory-row";
    const base = document.createElement("span");
    base.className = "addr";
    base.textContent = formatHex(address);
    row.append(base);
    let ascii = "";
    for (let i = 0; i < 16; i++) {
      const byteAddress = (address + i) >>> 0;
      const byte = cpu.read8(byteAddress);
      const item = document.createElement("span");
      item.className = "memory-byte" + (cpu.changedMemory.includes(byteAddress) ? " changed" : "");
      item.textContent = byte.toString(16).padStart(2, "0").toUpperCase();
      item.title = formatHex(byteAddress);
      row.append(item);
      ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
    }
    const spacer = document.createElement("span");
    spacer.className = "memory-gap";
    spacer.textContent = "|";
    const text = document.createElement("span");
    text.className = "memory-ascii";
    text.textContent = ascii;
    row.append(spacer, text);
    area.append(row);
  }
  $("memoryAddress").value = formatHex(memoryStart);
}

function render() {
  updateStatus();
  $("pcValue").textContent = formatHex(cpu.pc);
  $("stepCount").textContent = cpu.steps.toLocaleString("es-PE");
  $("lastInstruction").textContent = cpu.last ? cpu.last.text : "—";
  $("lastAddress").textContent = cpu.last ? "Ejecutada en " + formatHex(cpu.last.pc) : "Sin actividad";
  renderInstructions();
  renderRegisters();
  renderMemory();
}

function setMemoryAddress(value) {
  const text = value.trim();
  let address;
  if (/^0x[0-9a-f]+$/i.test(text)) address = parseInt(text.slice(2), 16);
  else if (/^[0-9]+$/.test(text)) address = Number(text);
  if (!Number.isInteger(address) || address < 0 || address > 0xffffffff) {
    log("Dirección inválida. Usa un decimal o 0x seguido de hexadecimal.", "bad");
    return;
  }
  memoryStart = (address & 0xfffffff0) >>> 0;
  renderMemory();
}

function pause() {
  running = false;
  if (timer !== null) clearInterval(timer);
  timer = null;
  updateStatus();
}

function loadBytes(data, name) {
  pause();
  try {
    cpu.loadProgram(data, name);
    $("fileName").textContent = name;
    $("fileDetail").textContent = `${data.length.toLocaleString("es-PE")} bytes · desde ${formatHex(0)}`;
    log(`Programa cargado: ${name}.`);
    render();
  } catch (error) {
    log(error.message, "bad");
  }
}

function loadSample() {
  const selected = SAMPLES.find(s => s.id === $("exampleSelect").value);
  if (!selected) return;
  const string = atob(selected.bytes);
  const bytes = Uint8Array.from(string, char => char.charCodeAt(0));
  memoryStart = parseInt(selected.address, 16);
  loadBytes(bytes, selected.file);
  $("exampleNote").textContent = selected.detail;
}

function singleStep() {
  if (cpu.status !== "ready" || running) return;
  cpu.step();
  if (cpu.last) log(`${formatHex(cpu.last.pc)}  ${cpu.last.text}`);
  if (cpu.status === "halted") log(`Programa finalizado después de ${cpu.steps} pasos.`, "warn");
  if (cpu.status === "error") log(cpu.error, "bad");
  render();
}

function startRun() {
  if (running || cpu.status !== "ready") return;
  running = true;
  log("Ejecución iniciada.");
  updateStatus();
  timer = setInterval(() => {
    const count = Number($("speed").value);
    cpu.runSteps(count);
    if (cpu.status !== "ready") {
      pause();
      if (cpu.status === "halted") log(`Programa finalizado después de ${cpu.steps} pasos.`, "warn");
      else log(cpu.error, "bad");
    }
    render();
  }, 35);
}

$("loadExample").addEventListener("click", loadSample);
$("exampleSelect").addEventListener("change", () => {
  const selected = SAMPLES.find(s => s.id === $("exampleSelect").value);
  if (selected) $("exampleNote").textContent = selected.detail;
});
$("upload").addEventListener("click", () => $("binaryFile").click());
$("binaryFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    memoryStart = 0x1000;
    loadBytes(data, file.name);
    $("exampleNote").textContent = "Archivo binario local cargado. No se envía a ningún servidor.";
  } catch (error) {
    log("No se pudo leer el archivo: " + error.message, "bad");
  }
  event.target.value = "";
});
$("step").addEventListener("click", singleStep);
$("run").addEventListener("click", startRun);
$("pause").addEventListener("click", () => { pause(); log("Ejecución pausada."); });
$("restart").addEventListener("click", () => { pause(); cpu.restart(); log("Programa reiniciado."); render(); });
$("goMemory").addEventListener("click", () => setMemoryAddress($("memoryAddress").value));
$("memoryAddress").addEventListener("keydown", event => { if (event.key === "Enter") setMemoryAddress(event.target.value); });
$("previousMemory").addEventListener("click", () => { memoryStart = (memoryStart - 128) >>> 0; renderMemory(); });
$("nextMemory").addEventListener("click", () => { memoryStart = (memoryStart + 128) >>> 0; renderMemory(); });
$("clearLog").addEventListener("click", () => { history = []; log("Historial limpiado."); });

render();
log("Simulador listo. Carga un programa para comenzar.");
