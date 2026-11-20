.section .text
.globl _start
_start:
  addi t0, zero, 12
  addi t1, zero, 13
  add t2, t0, t1
  sub t3, t2, t0
  and t4, t3, t1
  or t5, t4, t0
  slt t6, t0, t1
  bne t6, zero, guardar
  addi t2, zero, 0
guardar:
  sw t2, 100(zero)
  lw a0, 100(zero)
  beq a0, t2, terminar
  addi a0, zero, 0
terminar:
  ebreak
