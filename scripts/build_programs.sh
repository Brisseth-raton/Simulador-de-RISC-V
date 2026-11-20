#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
for item in riscvtest quicksort arbol_simetrico factorial; do
  clang --target=riscv32-unknown-elf -march=rv32i -mabi=ilp32 -nostdlib -Wl,-T,scripts/linker.ld -Wl,--no-relax -o "programs/$item.elf" "programs/$item.S"
  llvm-objcopy -O binary "programs/$item.elf" "programs/$item.bin"
  rm "programs/$item.elf"
done
python3 scripts/embed_examples.py
