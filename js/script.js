
    // Sin valores precargados: la fecha también arranca vacía para que el
    // presupuesto se cargue desde cero.
    function formatPesos(val) {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(val);
    }

    // --- Monto en letras -----------------------------------------------------
    // Escala larga, uso en Argentina: 1.000.000.000 = MIL MILLONES y
    // 1.000.000.000.000 = UN BILLÓN (no "mil millones de millones").
    const UNIDADES = [
      'CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
      'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
      'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS',
      'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
    ];
    // Índice = decena (3 = TREINTA ... 9 = NOVENTA); 0 a 2 no se usan porque
    // los números menores a 30 se resuelven con UNIDADES.
    const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
      'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    // 1 a 999
    function hasta999(n) {
      if (n === 0) return '';
      if (n === 100) return 'CIEN';
      const partes = [];
      const centena = Math.floor(n / 100);
      const resto = n % 100;
      if (centena > 0) partes.push(CENTENAS[centena]);
      if (resto > 0) {
        if (resto < 30) {
          partes.push(UNIDADES[resto]);
        } else {
          const decena = Math.floor(resto / 10);
          const unidad = resto % 10;
          partes.push(unidad === 0 ? DECENAS[decena] : DECENAS[decena] + ' Y ' + UNIDADES[unidad]);
        }
      }
      return partes.join(' ');
    }

    // Apócope delante de MIL / MILLÓN: UNO -> UN, VEINTIUNO -> VEINTIÚN
    function apocope(texto) {
      if (texto.endsWith('VEINTIUNO')) return texto.slice(0, -9) + 'VEINTIÚN';
      if (texto.endsWith('UNO')) return texto.slice(0, -3) + 'UN';
      return texto;
    }

    function numeroALetras(n) {
      if (n === 0) return 'CERO';
      if (n >= 1000000000000) {
        const billones = Math.floor(n / 1000000000000);
        const resto = n % 1000000000000;
        const partes = [billones === 1 ? 'UN BILLÓN' : apocope(numeroALetras(billones)) + ' BILLONES'];
        if (resto > 0) partes.push(numeroALetras(resto));
        return partes.join(' ');
      }
      const partes = [];
      const millones = Math.floor(n / 1000000);
      const miles = Math.floor((n % 1000000) / 1000);
      const resto = n % 1000;
      if (millones > 0) {
        partes.push(millones === 1 ? 'UN MILLÓN' : apocope(numeroALetras(millones)) + ' MILLONES');
      }
      if (miles > 0) {
        partes.push(miles === 1 ? 'MIL' : apocope(hasta999(miles)) + ' MIL');
      }
      if (resto > 0) partes.push(hasta999(resto));
      return partes.join(' ');
    }

    // Formato notarial: SON PESOS <importe en letras> CON <centavos>/100
    function formatMontoEnLetras(total) {
      if (!isFinite(total) || total < 0) return '-';
      const totalCentavos = Math.round(total * 100);
      const entero = Math.floor(totalCentavos / 100);
      const centavos = String(totalCentavos % 100).padStart(2, '0');
      return 'SON PESOS ' + numeroALetras(entero) + ' CON ' + centavos + '/100';
    }

    function calcular() {
      // Entradas principales
      const compraUsd = parseFloat(document.getElementById('valCompraUsd').value) || 0;
      const hipotecaUsd = parseFloat(document.getElementById('valHipotecaUsd').value) || 0;
      const tc = parseFloat(document.getElementById('tipoCambio').value) || 0;

      const compraArs = compraUsd * tc;
      const hipotecaArs = hipotecaUsd * tc;

      // Conceptos no gravados: cada fila de la tabla define su propia base.
      // - compra:   porcentaje sobre el importe de compraventa (ARS)
      // - hipoteca: porcentaje sobre el importe de hipoteca (ARS)
      // - fijo:     importe en pesos cargado a mano
      const filasNoGravado = document.querySelectorAll('#tablaDesglose .concepto-no-gravado');
      let subtotalNoGravado = 0;
      let hayBasePorcentual = false;

      filasNoGravado.forEach(fila => {
        const base = fila.querySelector('.concepto-base').value;
        const valor = parseFloat(fila.querySelector('.concepto-valor').value) || 0;
        if (base !== 'fijo') hayBasePorcentual = true;

        let importe = 0;
        if (base === 'compra') importe = compraArs * valor / 100;
        else if (base === 'hipoteca') importe = hipotecaArs * valor / 100;
        else importe = valor;

        fila.querySelector('.concepto-importe').innerText = formatPesos(importe);
        // El nombre se imprime desde un span espejo, porque el input es de una
        // sola línea y recorta los nombres largos en el PDF.
        fila.querySelector('.concepto-nombre-impreso').textContent =
          fila.querySelector('.concepto-nombre').value;

        subtotalNoGravado += importe;
      });

      document.getElementById('subtotalNoGravado').innerText = formatPesos(subtotalNoGravado);

      // Sin tipo de cambio no hay forma de convertir la compraventa ni la
      // hipoteca, así que los conceptos porcentuales caen a cero en silencio.
      // El aviso solo tiene sentido si hay importes en juego y alguna fila que
      // dependa de ellos; una fila fija no se ve afectada.
      const faltaTipoCambio = tc === 0 && (compraUsd > 0 || hipotecaUsd > 0) && hayBasePorcentual;
      document.getElementById('avisoTipoCambio').classList.toggle('hidden', !faltaTipoCambio);

      // Montos Gravados
      const valMinutas = parseFloat(document.getElementById('valMinutas').value) || 0;
      const subtotalGravado = valMinutas;
      const iva = subtotalGravado * 0.21;

      document.getElementById('subtotalGravado').innerText = formatPesos(subtotalGravado);
      document.getElementById('outMinutas').innerText = formatPesos(valMinutas);
      // Totales
      const totalGeneral = subtotalNoGravado + subtotalGravado + iva;

      document.getElementById('resSubtotal').innerText = formatPesos(subtotalNoGravado + subtotalGravado);
      document.getElementById('resIva').innerText = formatPesos(iva);
      document.getElementById('resTotal').innerText = formatPesos(totalGeneral);
      // Un presupuesto sin montos no debe imprimir "SON PESOS CERO CON 00/100":
      // con total 0 el renglón queda vacío hasta que se cargue un importe.
      document.getElementById('montoEnLetras').innerText =
        totalGeneral === 0 ? '' : formatMontoEnLetras(totalGeneral);
    }

    // --- Conceptos no gravados editables -------------------------------------
    // La tabla es la fuente de verdad: cada fila guarda su nombre, su base y
    // su valor, y se recalcula todo leyendo el DOM. Estos son los conceptos
    // que trae el presupuesto por defecto; el usuario puede agregar, renombrar
    // o eliminar filas, y el subtotal de no gravados los sigue.
    const CONCEPTOS_NO_GRAVADOS = [
      { nombre: 'Impuesto de Sellos Compraventa', base: 'compra', valor: 1 },
      { nombre: 'Aporte Notarial Compraventa', base: 'compra', valor: 0.4 },
      { nombre: 'Aporte Notarial Hipoteca', base: 'hipoteca', valor: 0.3 },
      { nombre: 'Tasa de Inscripción Compraventa', base: 'compra', valor: 0.2 },
      { nombre: 'Tasa de Inscripción Hipoteca', base: 'hipoteca', valor: 0.2 },
      { nombre: 'Sellos Matriz y Testimonio', base: 'fijo', valor: '' }
    ];

    const tablaDesglose = document.getElementById('tablaDesglose');
    const filaAgregarNoGravado = document.getElementById('filaAgregarNoGravado');

    function crearFilaNoGravado(concepto) {
      const fila = document.createElement('tr');
      fila.className = 'concepto-no-gravado';
      fila.innerHTML = `
        <td class="p-3">
          <input type="text" class="concepto-nombre w-full bg-transparent border-0 border-b border-transparent p-0 text-sm text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-[#0d6efd] focus:outline-none" placeholder="Concepto">
          <span class="concepto-nombre-impreso"></span>
        </td>
        <td class="p-3 text-center no-print whitespace-nowrap">
          <select class="concepto-base text-xs border rounded p-1 bg-white" title="Base del cálculo">
            <option value="compra">% Compraventa</option>
            <option value="hipoteca">% Hipoteca</option>
            <option value="fijo">$ Fijo</option>
          </select>
          <input type="number" step="0.01" class="concepto-valor w-20 border rounded text-center text-xs p-1 ml-1" title="Porcentaje o importe">
          <button type="button" class="concepto-borrar ml-1 align-middle text-slate-400 hover:text-red-600 text-sm font-bold" title="Eliminar concepto" aria-label="Eliminar concepto">&times;</button>
        </td>
        <td class="p-3 text-right font-mono concepto-importe">$0,00</td>
      `;
      fila.querySelector('.concepto-nombre').value = concepto.nombre;
      fila.querySelector('.concepto-base').value = concepto.base;
      fila.querySelector('.concepto-valor').value = concepto.valor === '' ? '' : String(concepto.valor);
      return fila;
    }

    // Las filas nuevas se insertan arriba del botón "Agregar", así el botón
    // queda siempre como último renglón del grupo.
    function agregarFilaNoGravado(concepto) {
      const fila = crearFilaNoGravado(concepto);
      filaAgregarNoGravado.before(fila);
      return fila;
    }

    CONCEPTOS_NO_GRAVADOS.forEach(agregarFilaNoGravado);

    document.getElementById('agregarNoGravado').addEventListener('click', () => {
      const fila = agregarFilaNoGravado({ nombre: '', base: 'compra', valor: '' });
      fila.querySelector('.concepto-nombre').focus();
      calcular();
      marcarCamposVacios();
    });

    tablaDesglose.addEventListener('click', (evento) => {
      const boton = evento.target.closest('.concepto-borrar');
      if (!boton) return;
      boton.closest('.concepto-no-gravado').remove();
      calcular();
    });

    // Escuchadores de eventos para recálculo automático. Se delegan en el
    // documento porque las filas de conceptos no gravados se crean y se
    // eliminan en tiempo de ejecución: un listener por input dejaría afuera a
    // las filas nuevas. `change` cubre el select de base, que no emite `input`.
    document.addEventListener('input', calcular);
    document.addEventListener('change', calcular);

    // --- C.U.I.T. del cliente -------------------------------------------------
    // Se formatea a 11 dígitos con guiones (20-12345678-9). Se recalcula desde
    // los dígitos en cada input para que se pueda borrar y corregir sin pelear
    // con los guiones; el cursor se reubica después de la misma cantidad de
    // dígitos, no al final, así editar en el medio no lo tira a la cola.
    const cuitInput = document.getElementById('clienteCuit');

    function formatearCuit(valor) {
      const digitos = valor.replace(/\D/g, '').slice(0, 11);
      if (digitos.length <= 2) return digitos;
      if (digitos.length <= 10) return digitos.slice(0, 2) + '-' + digitos.slice(2);
      return digitos.slice(0, 2) + '-' + digitos.slice(2, 10) + '-' + digitos.slice(10);
    }

    cuitInput.addEventListener('input', () => {
      const valorPrevio = cuitInput.value;
      const cursor = cuitInput.selectionStart === null ? valorPrevio.length : cuitInput.selectionStart;
      const digitosAntesDelCursor = valorPrevio.slice(0, cursor).replace(/\D/g, '').length;

      const formateado = formatearCuit(valorPrevio);
      cuitInput.value = formateado;

      let posicion = 0;
      let vistos = 0;
      while (posicion < formateado.length && vistos < digitosAntesDelCursor) {
        if (/\d/.test(formateado[posicion])) vistos += 1;
        posicion += 1;
      }
      cuitInput.setSelectionRange(posicion, posicion);
    });

    // --- Campos sin valor -----------------------------------------------------
    // En pantalla el placeholder ayuda a saber qué va en cada campo; en papel es
    // ruido: un presupuesto en blanco no debe imprimir "dd/mm/aaaa" ni el texto
    // de ayuda. Se marca cada control vacío y la hoja de impresión lo oculta,
    // conservando el espacio para no alterar el layout de la página.
    function marcarCamposVacios() {
      document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type)) return;
        el.classList.toggle('campo-vacio', el.value.trim() === '');
      });
    }

    document.addEventListener('input', marcarCamposVacios);
    document.addEventListener('change', marcarCamposVacios);

    // --- Detalle de lo presupuestado -----------------------------------------
    // Se edita en un textarea que crece con el contenido y se imprime desde un
    // div espejo, porque un textarea con altura fija recorta el texto largo al
    // exportar a PDF.
    const detallePresupuesto = document.getElementById('detallePresupuesto');
    const detalleImpreso = document.getElementById('detalleTextoImpreso');
    const detalleSeccion = document.getElementById('detalleSection');

    function actualizarDetalle() {
      const texto = detallePresupuesto.value;
      detalleImpreso.textContent = texto;
      detalleSeccion.classList.toggle('is-empty', texto.trim() === '');
      detallePresupuesto.style.height = 'auto';
      if (texto.trim() !== '') {
        detallePresupuesto.style.height = detallePresupuesto.scrollHeight + 'px';
      }
    }

    detallePresupuesto.addEventListener('input', actualizarDetalle);
    actualizarDetalle();

    // Cálculo inicial
    calcular();
    marcarCamposVacios();
  