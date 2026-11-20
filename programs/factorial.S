.section .text
.globl _start
_start:
  addi t0, zero, 1
  addi t1, zero, 6

bucle:
  beq t1, zero, fin
  add t2, t0, zero
  addi t0, zero, 0
  add t3, t1, zero

multiplicar:
  beq t3, zero, siguiente
  add t0, t0, t2
  addi t3, t3, -1
  jal zero, multiplicar

siguiente:
  addi t1, t1, -1
  jal zero, bucle

fin:
  add a0, t0, zero
  lui t4, 0x1
  sw a0, 64(t4)
  ebreak
