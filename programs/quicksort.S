.section .text
.globl _start
_start:
  lui sp, 0x10
  lui a0, 0x1
  addi a1, zero, 0
  addi a2, zero, 6
  jal ra, quicksort
  ebreak

quicksort:
  addi sp, sp, -32
  sw ra, 28(sp)
  sw s0, 24(sp)
  sw s1, 20(sp)
  sw s2, 16(sp)
  sw s3, 12(sp)
  add s0, a0, zero
  add s1, a1, zero
  add s2, a2, zero
  bge s1, s2, terminar
  slli t0, s2, 2
  add t0, s0, t0
  lw s3, 0(t0)
  add t1, s1, zero
  add t2, s1, zero

recorrer:
  bge t2, s2, particion
  slli t3, t2, 2
  add t3, s0, t3
  lw t4, 0(t3)
  blt s3, t4, continuar
  slli t5, t1, 2
  add t5, s0, t5
  lw t6, 0(t5)
  sw t4, 0(t5)
  sw t6, 0(t3)
  addi t1, t1, 1

continuar:
  addi t2, t2, 1
  jal zero, recorrer

particion:
  slli t5, t1, 2
  add t5, s0, t5
  lw t6, 0(t5)
  slli t0, s2, 2
  add t0, s0, t0
  sw s3, 0(t5)
  sw t6, 0(t0)
  add s3, t1, zero
  add a0, s0, zero
  add a1, s1, zero
  addi a2, s3, -1
  jal ra, quicksort
  add a0, s0, zero
  addi a1, s3, 1
  add a2, s2, zero
  jal ra, quicksort

terminar:
  lw ra, 28(sp)
  lw s0, 24(sp)
  lw s1, 20(sp)
  lw s2, 16(sp)
  lw s3, 12(sp)
  addi sp, sp, 32
  jalr zero, 0(ra)

.section .data
.balign 4
array:
  .word 6, 4, 3, 2, 1, 8, 9
