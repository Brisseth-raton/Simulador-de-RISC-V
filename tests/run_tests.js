const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { RiscV, decodeInstruction } = require("../cpu.js");
const root = path.join(__dirname, "..");
let passed = 0;

function test(name, check) {
  try {
    check();
    passed++;
    process.stdout.write("OK  " + name + "\n");
  } catch (error) {
    process.stderr.write("ERROR  " + name + "\n" + error.stack + "\n");
    process.exitCode = 1;
  }
}

function asBytes(words) {
  const bytes = new Uint8Array(words.length * 4);
  words.forEach((value, i) => {
    for (let b = 0; b < 4; b++) bytes[i * 4 + b] = (value >>> (8 * b)) & 255;
  });
  return bytes;
}

function iType(opcode, f3, rd, rs1, imm) {
  return (((imm & 4095) << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | opcode) >>> 0;
}

function rType(f3, f7, rd = 3, rs1 = 1, rs2 = 2) {
  return ((f7 << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | 0x33) >>> 0;
}

function sType(f3, rs2, rs1, imm) {
  return ((((imm >> 5) & 127) << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | ((imm & 31) << 7) | 0x23) >>> 0;
}

function bType(f3, rs1, rs2, imm) {
  return (((((imm >> 12) & 1) << 31) | (((imm >> 5) & 63) << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | (((imm >> 1) & 15) << 8) | (((imm >> 11) & 1) << 7) | 0x63)) >>> 0;
}

function jType(rd, imm) {
  return (((((imm >> 20) & 1) << 31) | (((imm >> 1) & 1023) << 21) | (((imm >> 11) & 1) << 20) | (((imm >> 12) & 255) << 12) | (rd << 7) | 0x6f)) >>> 0;
}

function runOne(word, values = {}, memory = []) {
  const cpu = new RiscV();
  cpu.loadProgram(asBytes([word]));
  for (const [index, value] of Object.entries(values)) cpu.registers[Number(index)] = value >>> 0;
  for (const [address, value] of memory) cpu.write32(address, value);
  const ok = cpu.step();
  assert.equal(ok, true, cpu.error);
  return cpu;
}

const immediateCases = [
  ["addi", 0, -16, 15, 0xffffffff],
  ["slti", 2, -16, -10, 1],
  ["sltiu", 3, -16, -10, 1],
  ["xori", 4, 0x55, 0x0f, 0x5a],
  ["ori", 6, 0x50, 0x0f, 0x5f],
  ["andi", 7, 0x55, 0x0f, 5]
];
for (const [name, f3, input, imm, expected] of immediateCases) {
  test(name, () => {
    const cpu = runOne(iType(0x13, f3, 3, 1, imm), { 1: input });
    assert.equal(cpu.registers[3], expected >>> 0);
    assert.equal(cpu.last.op, name);
  });
}

const shiftImmediateCases = [
  ["slli", 1, 0, 3, 8, 768],
  ["srli", 5, 0, 0x80000000, 2, 0x20000000],
  ["srai", 5, 32, 0x80000000, 2, 0xe0000000]
];
for (const [name, f3, f7, input, shamt, expected] of shiftImmediateCases) {
  test(name, () => {
    const cpu = runOne(iType(0x13, f3, 3, 1, (f7 << 5) | shamt), { 1: input });
    assert.equal(cpu.registers[3], expected >>> 0);
    assert.equal(cpu.last.op, name);
  });
}

const registerCases = [
  ["add", 0, 0, 25, 17, 42],
  ["sub", 0, 32, 25, 17, 8],
  ["sll", 1, 0, 5, 3, 40],
  ["slt", 2, 0, -3, 2, 1],
  ["sltu", 3, 0, -3, 2, 0],
  ["xor", 4, 0, 0xf0, 0x33, 0xc3],
  ["srl", 5, 0, 0x80000000, 2, 0x20000000],
  ["sra", 5, 32, 0x80000000, 2, 0xe0000000],
  ["or", 6, 0, 0x30, 0x05, 0x35],
  ["and", 7, 0, 0x35, 0x0f, 5]
];
for (const [name, f3, f7, a, b, expected] of registerCases) {
  test(name, () => {
    const cpu = runOne(rType(f3, f7), { 1: a, 2: b });
    assert.equal(cpu.registers[3], expected >>> 0);
    assert.equal(cpu.last.op, name);
  });
}

const loadCases = [
  ["lb", 0, 0xffffff80],
  ["lh", 1, 0xfffffe80],
  ["lw", 2, 0x8123fe80],
  ["lbu", 4, 0x80],
  ["lhu", 5, 0xfe80]
];
for (const [name, f3, expected] of loadCases) {
  test(name, () => {
    const cpu = runOne(iType(0x03, f3, 3, 1, 4), { 1: 0x200 }, [[0x204, 0x8123fe80]]);
    assert.equal(cpu.registers[3], expected >>> 0);
    assert.equal(cpu.last.op, name);
  });
}

const storeCases = [
  ["sb", 0, [0x80,0,0,0]],
  ["sh", 1, [0x80,0xfe,0,0]],
  ["sw", 2, [0x80,0xfe,0x23,0x81]]
];
for (const [name, f3, expected] of storeCases) {
  test(name, () => {
    const cpu = runOne(sType(f3, 2, 1, 4), { 1: 0x200, 2: 0x8123fe80 });
    assert.deepEqual([0,1,2,3].map(i => cpu.read8(0x204 + i)), expected);
    assert.equal(cpu.last.op, name);
  });
}

const branchCases = [
  ["beq", 0, 7, 7, 8],
  ["bne", 1, 7, 8, 8],
  ["blt", 4, -1, 1, 8],
  ["bge", 5, 1, -1, 8],
  ["bltu", 6, 1, -1, 8],
  ["bgeu", 7, -1, 1, 8]
];
for (const [name, f3, a, b, expectedPc] of branchCases) {
  test(name, () => {
    const cpu = runOne(bType(f3, 1, 2, 8), { 1: a, 2: b });
    assert.equal(cpu.pc, expectedPc);
    assert.equal(cpu.last.op, name);
  });
  test(name + " no tomado", () => {
    const inverse = name === "beq" ? [7, 8] : name === "bne" ? [7, 7] : [b, a];
    const cpu = runOne(bType(f3, 1, 2, 8), { 1: inverse[0], 2: inverse[1] });
    assert.equal(cpu.pc, 4);
  });
}

test("lui", () => {
  const cpu = runOne((0x12345 << 12) | (3 << 7) | 0x37);
  assert.equal(cpu.registers[3], 0x12345000);
});
test("auipc", () => {
  const cpu = runOne((0x12345 << 12) | (3 << 7) | 0x17);
  assert.equal(cpu.registers[3], 0x12345000);
});
test("jal", () => {
  const cpu = runOne(jType(3, 8));
  assert.equal(cpu.registers[3], 4);
  assert.equal(cpu.pc, 8);
});
test("jalr", () => {
  const cpu = runOne(iType(0x67, 0, 3, 1, 9), { 1: 0x100 });
  assert.equal(cpu.registers[3], 4);
  assert.equal(cpu.pc, 0x108);
});
test("registro x0 constante", () => {
  const cpu = runOne(iType(0x13, 0, 0, 0, 123));
  assert.equal(cpu.registers[0], 0);
});
test("little-endian", () => {
  const cpu = new RiscV();
  cpu.write32(0x1000, 0x78563412);
  assert.deepEqual([0,1,2,3].map(i => cpu.read8(0x1000+i)), [0x12,0x34,0x56,0x78]);
});
test("memoria dispersa de 32 bits", () => {
  const cpu = new RiscV();
  cpu.write32(0xfffffff0, 0x12345678);
  assert.equal(cpu.read32(0xfffffff0), 0x12345678);
});
test("salida ebreak", () => {
  const cpu = runOne(0x00100073);
  assert.equal(cpu.status, "halted");
});
test("salida ecall", () => {
  const cpu = runOne(0x00000073);
  assert.equal(cpu.status, "halted");
});
test("instrucción inválida", () => {
  const cpu = new RiscV();
  cpu.loadProgram(asBytes([0xffffffff]));
  assert.equal(cpu.step(), false);
  assert.equal(cpu.status, "error");
});
test("PC no alineado", () => {
  const cpu = new RiscV();
  cpu.loadProgram(asBytes([0x00100073]));
  cpu.pc = 2;
  assert.equal(cpu.step(), false);
  assert.equal(cpu.status, "error");
});
test("reinicio", () => {
  const cpu = new RiscV();
  cpu.loadProgram(asBytes([iType(0x13,0,1,0,8),0x00100073]));
  cpu.runSteps();
  cpu.restart();
  assert.equal(cpu.pc, 0);
  assert.equal(cpu.registers[1], 0);
  assert.equal(cpu.status, "ready");
});
test("saltos negativos", () => {
  const pc = 0x100;
  const word = bType(0, 1, 2, -8);
  assert.equal(decodeInstruction(word, pc).imm, -8);
  const wordJ = jType(1, -16);
  assert.equal(decodeInstruction(wordJ, pc).imm, -16);
});

const examples = [
  ["riscvtest", cpu => assert.equal(cpu.read32(0x64), 25)],
  ["quicksort", cpu => assert.deepEqual(Array.from({length:7}, (_,i) => cpu.read32(0x1000 + 4*i)), [1,2,3,4,6,8,9])],
  ["arbol_simetrico", cpu => assert.equal(cpu.registers[10], 1)],
  ["factorial", cpu => { assert.equal(cpu.registers[10], 720); assert.equal(cpu.read32(0x1040), 720); }]
];
for (const [name, check] of examples) {
  test("programa completo: " + name, () => {
    const cpu = new RiscV();
    cpu.loadProgram(fs.readFileSync(path.join(root,"programs",name + ".bin")), name);
    cpu.runSteps(200000);
    assert.equal(cpu.status, "halted", cpu.error);
    check(cpu);
  });
}

console.log("\n" + passed + " pruebas aprobadas.");
if (process.exitCode) process.exit(process.exitCode);
