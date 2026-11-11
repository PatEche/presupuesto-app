# Generador de presupuestos para escribanía

Aplicación web de una sola página para armar presupuestos de operaciones
inmobiliarias (compraventa e hipoteca) y exportarlos a PDF en una hoja A4.

Sin build, sin dependencias instaladas y sin servidor: se abre `index.html` en el
navegador y se trabaja.

![Interfaz con un presupuesto cargado](assets/readme.png)

## Qué calcula

Cargás los valores de la operación y el tipo de cambio, y la planilla resuelve
sola los importes en pesos, los impuestos y tasas, el IVA y el total.

**Conceptos no gravados por IVA** (la tabla arranca **vacía**: cada concepto se
agrega a mano y después se puede renombrar, cambiar de base o eliminar)

Los seis conceptos que usa la escribanía, como referencia:

- Impuesto de sellos sobre la compraventa
- Aporte notarial de compraventa
- Aporte notarial de hipoteca
- Tasa de inscripción de compraventa
- Tasa de inscripción de hipoteca
- Sellos de matriz y testimonio (importe fijo)

Cada fila no gravada elige su base: porcentaje sobre la compraventa, porcentaje
sobre la hipoteca o un importe fijo en pesos. El subtotal se recalcula solo al
agregar, editar o borrar filas. Sin filas cargadas la sección no se imprime. En el
PDF cada fila imprime únicamente concepto e importe.

**Conceptos gravados por IVA**

- Elaboración de minutas / gastos de gestión

El IVA es del 21% y se aplica únicamente sobre los conceptos gravados. Las tasas
se cargan como porcentaje y los importes fijos a mano; al imprimir, los importes
salen formateados en lugar del número crudo.

## Salida

- Locale `es-AR`, moneda ARS, siempre dos decimales.
- Monto en letras automático, con formato notarial:
  `SON PESOS ... CON 00/100`.
- Detalle libre de lo presupuestado, sin recorte de texto al exportar.
- Exportación a **una sola página A4** en blanco y negro: sin fondos, colores,
  sombras ni cajas de formulario.
- Los campos vacíos no imprimen su texto de ayuda. Si no hay conceptos no
  gravados cargados, esa sección no se imprime; si no hay detalle, tampoco.

## Cómo se usa

1. Abrí `index.html` con doble clic.
2. Completá el número de presupuesto, la fecha, los datos del cliente
   (concepto, domicilio, condición frente al IVA) y la operación.
3. Cargá los valores de la operación y el tipo de cambio. Los valores pueden ser
   en dólares o en pesos: si la operación ya está en pesos, poné tipo de cambio
   `1` y los importes se toman tal cual.
4. Agregá los conceptos no gravados con el botón de la tabla: se renombran,
   cambian de base y se borran ahí mismo.
5. Presioná **Imprimir / Guardar en PDF**.
6. En el diálogo de impresión abrí *Más configuraciones* y desmarcá
   *Encabezados y pies de página*. La fecha, la hora y la ruta del archivo las
   agrega el navegador, no la página: solo se sacan desde ahí.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `index.html` | Todo el marcado y las clases de Tailwind. |
| `css/style.css` | Estilos de pantalla y el bloque `@media print` completo. |
| `js/script.js` | Cálculos, formato de moneda y monto en letras. |
| `assets/` | Ícono del sitio. |
| `AGENTS.md` | Convenciones del proyecto y contrato de impresión. |

Tailwind se carga por CDN, así que no hay `node_modules` ni paso de compilación.

## Ramas

`main` es la versión publicable, `staging` el candidato congelado para revisar y
`develop` la rama de trabajo. La promoción es manual y siempre por merge:
`develop` → `staging` → `main`. No se commitea directo en `staging` ni en `main`.

El repositorio trae un hook que hace cumplir esa regla. Git no versiona su propia
configuración, así que después de clonar hay que activarlo:

```bash
git config core.hooksPath .githooks
```

## Limitaciones conocidas

- El campo de honorarios está en pantalla pero **no** entra en el cálculo ni en
  el total.
- No hay tests automatizados: la verificación es manual, abriendo la página y
  revisando la vista previa de impresión.
- El documento se exporta en blanco y negro por diseño; el color de la interfaz
  no se traslada al papel.
- Los datos no se guardan en ningún lado: al cerrar la página se pierden.
