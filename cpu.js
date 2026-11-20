function hex32(value) {
  return "0x" + (value >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function signExtend(value, bits) {
  return (value << (32 - bits)) >> (32 - bits);
}

function decodeInstruction(word, pc) {
  const opcode = word & 0x7f;
  const rd = (word >>> 7) & 31;
  const funct3 = (word >>> 12) & 7;
  const rs1 = (word >>> 15) & 31;
  const rs2 = (word >>> 20) & 31;
  const funct7 = (word >>> 25) & 127;
  const immediateI = signExtend(word >>> 20, 12);
  const immediateS = signExtend(((word >>> 25) << 5) | ((word >>> 7) & 31), 12);
  const immediateB = signExtend(((word >>> 31) << 12) | (((word >>> 7) & 1) << 11) | (((word >>> 25) & 63) << 5) | (((word >>> 8) & 15) << 1), 13);
  const immediateJ = signExtend(((word >>> 31) << 20) | (((word >>> 12) & 255) << 12) | (((word >>> 20) & 1) << 11) | (((word >>> 21) & 1023) << 1), 21);
  const immediateU = (word & 0xfffff000) >>> 0;
  const result = { op: "invalid", rd, rs1, rs2, imm: 0, text: "instrucción desconocida", word: word >>> 0, pc: pc >>> 0 };

  if (opcode === 0x03) {
    result.op = ({0:"lb",1:"lh",2:"lw",4:"lbu",5:"lhu"})[funct3] || "invalid";
    result.imm = immediateI;
    result.text = `${result.op} x${rd}, ${immediateI}(x${rs1})`;
  } else if (opcode === 0x13) {
    result.op = ({0:"addi",2:"slti",3:"sltiu",4:"xori",6:"ori",7:"andi"})[funct3] || "invalid";
    result.imm = immediateI;
    if (funct3 === 1 && funct7 === 0) result.op = "slli";
    if (funct3 === 5 && funct7 === 0) result.op = "srli";
    if (funct3 === 5 && funct7 === 32) result.op = "srai";
    if (funct3 === 1 || funct3 === 5) result.imm = rs2;
    result.text = `${result.op} x${rd}, x${rs1}, ${result.imm}`;
  } else if (opcode === 0x23) {
    result.op = ({0:"sb",1:"sh",2:"sw"})[funct3] || "invalid";
    result.imm = immediateS;
    result.text = `${result.op} x${rs2}, ${immediateS}(x${rs1})`;
  } else if (opcode === 0x33) {
    const plain = {0:"add",1:"sll",2:"slt",3:"sltu",4:"xor",5:"srl",6:"or",7:"and"};
    if (funct7 === 0) result.op = plain[funct3] || "invalid";
    if (funct7 === 32 && funct3 === 0) result.op = "sub";
    if (funct7 === 32 && funct3 === 5) result.op = "sra";
    result.text = `${result.op} x${rd}, x${rs1}, x${rs2}`;
  } else if (opcode === 0x37 || opcode === 0x17) {
    result.op = opcode === 0x37 ? "lui" : "auipc";
    result.imm = immediateU;
    result.text = `${result.op} x${rd}, ${hex32(immediateU)}`;
  } else if (opcode === 0x63) {
    result.op = ({0:"beq",1:"bne",4:"blt",5:"bge",6:"bltu",7:"bgeu"})[funct3] || "invalid";
    result.imm = immediateB;
    result.text = `${result.op} x${rs1}, x${rs2}, ${hex32(pc + immediateB)}`;
  } else if (opcode === 0x6f) {
    result.op = "jal";
    result.imm = immediateJ;
    result.text = `jal x${rd}, ${hex32(pc + immediateJ)}`;
  } else if (opcode === 0x67 && funct3 === 0) {
    result.op = "jalr";
    result.imm = immediateI;
    result.text = `jalr x${rd}, ${immediateI}(x${rs1})`;
  } else if (word === 0x00100073) {
    result.op = "ebreak";
    result.text = "ebreak";
  } else if (word === 0x00000073) {
    result.op = "ecall";
    result.text = "ecall";
  }

  if (result.op === "invalid") result.text = "instrucción desconocida";
  return result;
}

class RiscV {
  constructor() {
    this.reset();
  }

  reset() {
    this.registers = new Uint32Array(32);
    this.registers[2] = 0x00010000;
    this.memory = new Map();
    this.pc = 0;
    this.steps = 0;
    this.programSize = 0;
    this.programName = "";
    this.original = null;
    this.status = "empty";
    this.error = "";
    this.last = null;
    this.changedRegisters = [];
    this.changedMemory = [];
  }

  loadProgram(bytes, name = "programa.bin") {
    if (!bytes || bytes.length === 0) throw new Error("El archivo está vacío.");
    if (bytes.length > 2 * 1024 * 1024) throw new Error("El límite de tamaño es 2 MiB.");
    const data = Uint8Array.from(bytes);
    this.reset();
    this.original = data;
    this.programSize = data.length;
    this.programName = name;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) this.memory.set(i, data[i]);
    }
    this.status = "ready";
  }

  restart() {
    if (this.original) this.loadProgram(this.original, this.programName);
  }

  read8(address) {
    return this.memory.get(address >>> 0) || 0;
  }

  read16(address) {
    const a = address >>> 0;
    return this.read8(a) | (this.read8(a + 1) << 8);
  }

  read32(address) {
    const a = address >>> 0;
    return (this.read8(a) | (this.read8(a + 1) << 8) | (this.read8(a + 2) << 16) | (this.read8(a + 3) << 24)) >>> 0;
  }

  write8(address, value) {
    const a = address >>> 0;
    const b = value & 255;
    if (b === 0) this.memory.delete(a);
    else this.memory.set(a, b);
    this.changedMemory.push(a);
  }

  write16(address, value) {
    for (let i = 0; i < 2; i++) this.write8((address + i) >>> 0, value >>> (i * 8));
  }

  write32(address, value) {
    for (let i = 0; i < 4; i++) this.write8((address + i) >>> 0, value >>> (i * 8));
  }

  writeRegister(index, value) {
    if (index !== 0) {
      const result = value >>> 0;
      if (this.registers[index] !== result) this.changedRegisters.push(index);
      this.registers[index] = result;
    }
  }

  step() {
    if (this.status === "empty" || this.status === "halted" || this.status === "error") return false;
    this.changedRegisters = [];
    this.changedMemory = [];
    const pc = this.pc;
    try {
      if (pc % 4 !== 0) throw new Error(`PC no alineado: ${hex32(pc)}`);
      const instruction = decodeInstruction(this.read32(pc), pc);
      this.last = instruction;
      if (instruction.op === "invalid") throw new Error(`Instrucción inválida ${hex32(instruction.word)} en ${hex32(pc)}`);
      const { rd, rs1, rs2, imm, op } = instruction;
      const a = this.registers[rs1];
      const b = this.registers[rs2];
      const signedA = a | 0;
      const signedB = b | 0;
      const address = (a + imm) >>> 0;
      let nextPc = (pc + 4) >>> 0;
      let value;

      switch (op) {
        case "lb": this.writeRegister(rd, signExtend(this.read8(address), 8)); break;
        case "lh": this.writeRegister(rd, signExtend(this.read16(address), 16)); break;
        case "lw": this.writeRegister(rd, this.read32(address)); break;
        case "lbu": this.writeRegister(rd, this.read8(address)); break;
        case "lhu": this.writeRegister(rd, this.read16(address)); break;
        case "sb": this.write8(address, b); break;
        case "sh": this.write16(address, b); break;
        case "sw": this.write32(address, b); break;
        case "addi": this.writeRegister(rd, a + imm); break;
        case "slti": this.writeRegister(rd, signedA < imm ? 1 : 0); break;
        case "sltiu": this.writeRegister(rd, a < (imm >>> 0) ? 1 : 0); break;
        case "xori": this.writeRegister(rd, a ^ imm); break;
        case "ori": this.writeRegister(rd, a | imm); break;
        case "andi": this.writeRegister(rd, a & imm); break;
        case "slli": this.writeRegister(rd, a << imm); break;
        case "srli": this.writeRegister(rd, a >>> imm); break;
        case "srai": this.writeRegister(rd, signedA >> imm); break;
        case "add": this.writeRegister(rd, a + b); break;
        case "sub": this.writeRegister(rd, a - b); break;
        case "sll": this.writeRegister(rd, a << (b & 31)); break;
        case "slt": this.writeRegister(rd, signedA < signedB ? 1 : 0); break;
        case "sltu": this.writeRegister(rd, a < b ? 1 : 0); break;
        case "xor": this.writeRegister(rd, a ^ b); break;
        case "srl": this.writeRegister(rd, a >>> (b & 31)); break;
        case "sra": this.writeRegister(rd, signedA >> (b & 31)); break;
        case "or": this.writeRegister(rd, a | b); break;
        case "and": this.writeRegister(rd, a & b); break;
        case "lui": this.writeRegister(rd, imm); break;
        case "auipc": this.writeRegister(rd, pc + imm); break;
        case "beq": if (a === b) nextPc = (pc + imm) >>> 0; break;
        case "bne": if (a !== b) nextPc = (pc + imm) >>> 0; break;
        case "blt": if (signedA < signedB) nextPc = (pc + imm) >>> 0; break;
        case "bge": if (signedA >= signedB) nextPc = (pc + imm) >>> 0; break;
        case "bltu": if (a < b) nextPc = (pc + imm) >>> 0; break;
        case "bgeu": if (a >= b) nextPc = (pc + imm) >>> 0; break;
        case "jal": this.writeRegister(rd, nextPc); nextPc = (pc + imm) >>> 0; break;
        case "jalr": this.writeRegister(rd, nextPc); nextPc = address & 0xfffffffe; break;
        case "ebreak": this.status = "halted"; break;
        case "ecall": this.status = "halted"; break;
        default: throw new Error("Instrucción sin implementar: " + op);
      }

      this.pc = nextPc >>> 0;
      this.steps++;
      this.registers[0] = 0;
      return true;
    } catch (error) {
      this.status = "error";
      this.error = error.message;
      return false;
    }
  }

  runSteps(limit = 50000) {
    let executed = 0;
    while (this.status === "ready" && executed < limit) {
      this.step();
      executed++;
    }
    return executed;
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = { RiscV, decodeInstruction, hex32, signExtend };
if (typeof window !== "undefined") window.RiscV = RiscV;
