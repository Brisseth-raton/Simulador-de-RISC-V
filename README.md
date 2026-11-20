# Simulador RISC-V RV32I

**CS3051 - Arquitectura de Computadores, HW#5**

Simulador educativo de instrucciones RISC-V de 32 bits que funciona en el navegador. Carga programas ya compilados en binario crudo y permite ejecutarlos paso por paso mientras se observa el contador de programa, los registros y la memoria.

La interfaz final utiliza fondo claro, azul y verde pastel, botones de esquinas casi cuadradas y paneles con bordes discretos.

## 1. Cómo abrirlo

1. Extrae la carpeta completa del ZIP.
2. Abre `index.html` con Chrome, Edge o Firefox.
3. Selecciona uno de los cuatro ejemplos y pulsa **Cargar ejemplo**.
4. Usa **Paso a paso** para ejecutar una instrucción o **Ejecutar** para avanzar automáticamente.
5. Revisa los paneles **Instrucciones**, **Registros**, **Explorador de memoria** y **Actividad**.
6. Para usar otro binario, pulsa **Abrir archivo .bin**.

No hace falta instalar Node.js, Python ni un servidor para usar el simulador. Todos los scripts necesarios están incluidos en la carpeta. La ejecución se realiza localmente y el archivo seleccionado no se envía a un servidor.

## 2. Funcionalidades implementadas

- Las 37 instrucciones indicadas en el anexo A de la tarea: loads, stores, inmediatas, aritméticas, lógicas, saltos y operaciones con inmediatos superiores.
- PC de 32 bits, 32 registros de propósito general y `x0` fijo en cero.
- Memoria plana, direccionable por bytes, con direcciones de 32 bits y orden little-endian.
- Carga de archivos binarios crudos desde la dirección `0x00000000`.
- Ejecución paso por paso, ejecución automática, pausa y reinicio.
- Vista hexadecimal de registros y memoria con indicación de cambios recientes.
- Vista de las instrucciones con su código máquina y desensamblado sencillo.
- Detección de instrucciones inválidas y PC no alineado.
- Reconocimiento de `ebreak` y `ecall` para detener las demostraciones.

## 3. Estructura del proyecto

```text
simulador-riscv-web/
├── index.html
├── styles.css
├── cpu.js
├── app.js
├── samples.js
├── programs/
│   ├── riscvtest.S
│   ├── riscvtest.bin
│   ├── quicksort.S
│   ├── quicksort.bin
│   ├── arbol_simetrico.S
│   ├── arbol_simetrico.bin
│   ├── factorial.S
│   └── factorial.bin
├── tests/
│   ├── run_tests.js
│   └── guia_demostracion.md
└── scripts/
    ├── linker.ld
    ├── build_programs.sh
    └── embed_examples.py
```

`cpu.js` contiene la decodificación y la ejecución de instrucciones, junto con el estado arquitectural. `app.js` conecta el simulador con los controles y paneles del navegador. `samples.js` contiene copias de los cuatro binarios para permitir su carga inmediata desde `index.html`.

## 4. Programas de ejemplo

| Programa | Qué hace | Resultado esperado |
|---|---|---|
| RISC-V Test | Prueba aritmética, lógica, saltos, carga y almacenamiento | Dirección `0x00000064`: entero `25` (`0x00000019`) |
| Quicksort | Ordenación recursiva con intercambio de posiciones | Dirección `0x00001000`: `{1, 2, 3, 4, 6, 8, 9}` |
| Árbol simétrico | Verificación recursiva de un árbol binario completo | Registro `a0`/`x10`: `1` |
| Factorial | Calcula `6!` con sumas repetidas y ciclos | Registro `a0`: `720`; dirección `0x00001040`: `720` |

Son implementaciones propias que reproducen las operaciones y resultados propuestos para las pruebas de la tarea. No se descargaron ni copiaron los archivos de Pastebin mencionados en el enunciado.

En el panel de memoria, el dato entero se muestra en bytes little-endian. Por ejemplo, el número 25 aparece como `19 00 00 00`, mientras que el número 720 (`0x000002D0`) aparece como `D0 02 00 00`.

## 5. Pruebas automáticas

Se incluye un archivo `tests/run_tests.js` con 56 pruebas verificadas. Para repetirlas, desde la raíz del proyecto ejecuta:

```bash
node tests/run_tests.js
```

El resultado esperado es `56 pruebas aprobadas.`. Este paso utiliza Node.js solo para las pruebas; no es necesario para abrir la interfaz web.

Las pruebas comprueban las 37 instrucciones, comparaciones con y sin signo, saltos tomados y no tomados, formato little-endian, `x0`, reinicio, instrucciones inválidas, direcciones del PC no alineadas y los cuatro programas completos.

## 6. Notas de implementación

- La memoria se guarda en un `Map` de bytes, sin reservar físicamente 4 GiB. Las direcciones se tratan como enteros de 32 bits.
- Los 32 registros empiezan en cero, excepto `sp` (`x2`), inicializado en `0x00010000` como referencia para programas que usan pila. Los programas de demostración que utilizan pila también la inicializan explícitamente.
- Se permite acceder a datos en direcciones no alineadas; esto simplifica el simulador y mantiene la lectura/escritura byte a byte. El PC sí debe estar alineado a cuatro bytes.
- El tamaño máximo de un archivo cargado es 2 MiB para mantener una interfaz fluida.
- `ebreak` y `ecall` detienen el programa. No se incluyen las llamadas de entrada/salida SPIM, ELF, soporte GDB ni instrucciones de extensiones como M o C, que no son requisitos obligatorios.
- No se incluye un ensamblador RISC-V: el simulador recibe código máquina ya compilado.

## 7. Cómo recompilar los cuatro ejemplos (opcional)

Los `.bin` ya están incluidos. Para reconstruirlos desde los `.S` en un entorno con Clang, lld y llvm-objcopy preparados para RISC-V:

```bash
bash scripts/build_programs.sh
```

El script compila los ejemplos para `riscv32-unknown-elf`, los enlaza con código en dirección cero y datos en `0x1000`, convierte a formato Raw y actualiza `samples.js`.

También es posible cargar un binario obtenido de CPUlator siguiendo el anexo B: **Compile and Load** -> **Memory** -> **Format: Raw** -> **Start address: 0000** -> **Save to file**. Es importante exportar el rango completo del programa.

## 8. Entrega del trabajo

La entrega en Canvas consiste en un PDF con el enlace al repositorio de GitHub, el enlace a la carpeta de Drive que contiene el código fuente y un video con al menos cuatro ejecuciones, además de una descripción del simulador.

Repositorio de destino: https://github.com/Brisseth-raton/Simulador-de-RISC-V

Carpeta de destino: https://drive.google.com/drive/folders/1-PEblacaSSTfixe_KT0PfXCfc5sQL6rD?usp=sharing

Antes de enviar, sube realmente los archivos a los enlaces compartidos y comprueba que otras personas puedan leerlos. El video debe mostrar las cuatro demostraciones.

La guía de cuatro demostraciones está en `tests/guia_demostracion.md`.
