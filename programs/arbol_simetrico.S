.section .text
.globl _start
_start:
  lui sp, 0x10
  addi a0, zero, 1
  addi a1, zero, 2
  jal ra, espejo
  ebreak

espejo:
  addi sp, sp, -16
  sw ra, 12(sp)
  sw s0, 8(sp)
  sw s1, 4(sp)
  sw s2, 0(sp)
  add s0, a0, zero
  add s1, a1, zero
  addi t0, zero, 7
  bge s0, t0, sin_izquierdo
  bge s1, t0, falso
  lui t1, 0x1
  slli t2, s0, 2
  add t2, t1, t2
  lw t3, 0(t2)
  slli t2, s1, 2
  add t2, t1, t2
  lw t4, 0(t2)
  bne t3, t4, falso
  slli a0, s0, 1
  addi a0, a0, 1
  slli a1, s1, 1
  addi a1, a1, 2
  jal ra, espejo
  beq a0, zero, falso
  slli a0, s0, 1
  addi a0, a0, 2
  slli a1, s1, 1
  addi a1, a1, 1
  jal ra, espejo
  jal zero, salir

sin_izquierdo:
  bge s1, t0, verdadero
  jal zero, falso

verdadero:
  addi a0, zero, 1
  jal zero, salir

falso:
  addi a0, zero, 0

salir:
  lw ra, 12(sp)
  lw s0, 8(sp)
  lw s1, 4(sp)
  lw s2, 0(sp)
  addi sp, sp, 16
  jalr zero, 0(ra)

.section .data
.balign 4
array:
  .word 6, 4, 4, 1, 2, 2, 1
