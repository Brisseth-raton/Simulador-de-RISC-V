ENTRY(_start)
SECTIONS
{
  . = 0;
  .text : { *(.text*) }
  . = 0x1000;
  .data : { *(.data*) *(.rodata*) }
  .bss : { *(.bss*) }
}
