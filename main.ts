// Tiny stack VM for make.fun's tiny-stack-vm-01 ISA.
// Runs every /input/<id>/program.bin on /input/<id>/input.bin, writes
// /output/<id>/stdout.bin + /output/<id>/exit.txt. Node 22, no dependencies.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Immediate lengths by opcode: PUSH8 1, PUSH32 4, JMP/JZ/JNZ/CALL 2.
const IMM = new Uint8Array(256);
IMM[1] = 1;
IMM[2] = 4;
IMM[48] = 2;
IMM[49] = 2;
IMM[50] = 2;
IMM[51] = 2;

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const n = p.length;
  const D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0;
  let ip = 0;
  let pc = 0;
  let steps = 0;
  const end = (code: number) => ({ out: out.slice(0, ol), code });
  for (;;) {
    // The ISA's step order: step limit, pc, opcode, immediate, then stack needs.
    if (steps === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = p[pc];
    if (!(op <= 7 || (op >= 16 && op <= 30) || (op >= 32 && op <= 34) || (op >= 48 && op <= 52) || (op >= 64 && op <= 65) || (op >= 80 && op <= 83))) return end(5);
    const imm = IMM[op];
    if (pc + imm >= n) return end(9);
    steps++;
    pc += 1 + imm;
    // Binary ops 0x10-0x22 except NEG (23) and NOT (27): pop b then a, push r.
    if (op >= 16 && op <= 34 && op !== 23 && op !== 27) {
      if (sp < 2) return end(2);
      const b = D[sp - 1];
      const a = D[sp - 2];
      let r: number;
      if (op === 16) r = (a + b) | 0;
      else if (op === 17) r = (a - b) | 0;
      else if (op === 18) r = Math.imul(a, b);
      else if (op === 19) {
        if (b === 0) return end(4);
        r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
      } else if (op === 20) {
        if (b === 0) return end(4);
        r = b === -1 ? 0 : (a % b) | 0;
      } else if (op === 21) {
        if (b === 0) return end(4);
        r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
      } else if (op === 22) {
        if (b === 0) return end(4);
        r = ((a >>> 0) % (b >>> 0)) | 0;
      } else if (op === 24) r = a & b;
      else if (op === 25) r = a | b;
      else if (op === 26) r = a ^ b;
      else if (op === 28) r = a << (b & 31);
      else if (op === 29) r = a >> (b & 31);
      else if (op === 30) r = (a >>> (b & 31)) | 0;
      else if (op === 32) r = a === b ? 1 : 0;
      else if (op === 33) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      sp--;
      D[sp - 1] = r;
      continue;
    }
    switch (op) {
      case 0:
        return end(0);
      case 1:
        if (sp === 256) return end(3);
        D[sp++] = (p[pc - 1] << 24) >> 24;
        break;
      case 2:
        if (sp === 256) return end(3);
        D[sp++] = p[pc - 4] | (p[pc - 3] << 8) | (p[pc - 2] << 16) | (p[pc - 1] << 24);
        break;
      case 3:
        if (sp < 1) return end(2);
        sp--;
        break;
      case 4:
        if (sp < 1) return end(2);
        if (sp === 256) return end(3);
        D[sp] = D[sp - 1];
        sp++;
        break;
      case 5: {
        if (sp < 2) return end(2);
        const t = D[sp - 1];
        D[sp - 1] = D[sp - 2];
        D[sp - 2] = t;
        break;
      }
      case 6:
        if (sp < 2) return end(2);
        if (sp === 256) return end(3);
        D[sp] = D[sp - 2];
        sp++;
        break;
      case 7: {
        if (sp < 3) return end(2);
        const t = D[sp - 3];
        D[sp - 3] = D[sp - 2];
        D[sp - 2] = D[sp - 1];
        D[sp - 1] = t;
        break;
      }
      case 23:
        if (sp < 1) return end(2);
        D[sp - 1] = (-D[sp - 1]) | 0;
        break;
      case 27:
        if (sp < 1) return end(2);
        D[sp - 1] = ~D[sp - 1];
        break;
      case 48: {
        const rel = ((p[pc - 2] | (p[pc - 1] << 8)) << 16) >> 16;
        pc += rel;
        break;
      }
      case 49:
      case 50: {
        if (sp < 1) return end(2);
        const rel = ((p[pc - 2] | (p[pc - 1] << 8)) << 16) >> 16;
        const v = D[--sp];
        if ((op === 49) === (v === 0)) pc += rel;
        break;
      }
      case 51:
        if (cp === 64) return end(7);
        C[cp++] = pc;
        pc = p[pc - 2] | (p[pc - 1] << 8);
        break;
      case 52:
        if (cp === 0) return end(8);
        pc = C[--cp];
        break;
      case 64: {
        if (sp < 1) return end(2);
        const addr = D[sp - 1];
        if (addr < 0 || addr > 255) return end(6);
        D[sp - 1] = M[addr];
        break;
      }
      case 65: {
        if (sp < 2) return end(2);
        const addr = D[sp - 1];
        if (addr < 0 || addr > 255) return end(6);
        const v = D[sp - 2];
        sp -= 2;
        M[addr] = v;
        break;
      }
      case 80: {
        if (sp < 1) return end(2);
        const s = String(D[sp - 1]);
        if (ol + s.length > 65536) return end(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 81:
        if (sp < 1) return end(2);
        if (ol + 1 > 65536) return end(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 82:
        if (sp === 256) return end(3);
        D[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 83:
        if (sp < 1) return end(2);
        return end(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), r.code + '\n');
}
