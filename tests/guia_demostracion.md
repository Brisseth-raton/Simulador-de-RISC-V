# Guía breve para grabar el video de HW#5

Esta guía propone un recorrido de unos minutos. El enunciado no establece duración mínima o máxima, pero sí pide una explicación breve del simulador y **al menos cuatro ejemplos de ejecución**.

## Introducción

Explica que se implementó el ISA base RV32I en el navegador. Muestra que un archivo binario crudo se carga desde `0x00000000`, las instrucciones se decodifican y se ejecutan modificando PC, registros y memoria. Señala `cpu.js` como el motor y `app.js` como la interfaz.

## Prueba 1: RISC-V Test

1. Selecciona **RISC-V Test** y pulsa **Cargar ejemplo**.
2. Ejecuta algunas instrucciones con **Paso a paso**. Muestra cómo cambian el PC y los registros.
3. Pulsa **Ejecutar** hasta que el estado sea **Ejecución finalizada**.
4. En **Memoria**, escribe `0x64` y pulsa **Ir**. La fila empieza en `0x00000060`; la dirección `0x64` corresponde a la quinta columna, con bytes `19 00 00 00`.
5. Explica que `0x19` equivale a 25 decimal.

## Prueba 2: Quicksort

1. Selecciona **Quicksort recursivo** y pulsa **Cargar ejemplo**.
2. En el explorador de memoria observa que, desde `0x1000`, los enteros iniciales son `{6, 4, 3, 2, 1, 8, 9}`.
3. Ejecuta el programa.
4. Comprueba que los primeros siete enteros de 32 bits son `{1, 2, 3, 4, 6, 8, 9}`. En hexadecimal byte a byte corresponden a `01 00 00 00`, `02 00 00 00`, etc.

## Prueba 3: Árbol simétrico

1. Selecciona **Árbol simétrico** y pulsa **Cargar ejemplo**.
2. Ejecuta el programa.
3. Busca el registro `x10` (`a0`) y comprueba que termina con `0x00000001`.
4. Explica que el valor 1 representa verdadero para el arreglo `{6, 4, 4, 1, 2, 2, 1}`.

## Prueba 4: Factorial

1. Selecciona **Factorial** y pulsa **Cargar ejemplo**.
2. Ejecuta unos pasos manuales y luego el resto con **Ejecutar**.
3. Comprueba que `x10` (`a0`) termina con `0x000002D0`, que equivale a 720 decimal.
4. Introduce `0x1040` en el explorador de memoria para ver `D0 02 00 00`.

## Cierre

Muestra el repositorio Git y el proyecto organizado. Explica que las 37 instrucciones obligatorias están implementadas y que `node tests/run_tests.js` permite repetir 56 pruebas automáticas.

Antes de entregar, sube el video y el código a Google Drive, verifica sus permisos de visualización y pega el enlace real en el informe. Haz lo mismo con el repositorio.
