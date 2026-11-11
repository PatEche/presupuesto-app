
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

      // Tasas
      const rateSellos = (parseFloat(document.getElementById('rateSellos').value) || 0) / 100;
      const rateAporteCompra = (parseFloat(document.getElementById('rateAporteCompra').value) || 0) / 100;
      const rateAporteHip = (parseFloat(document.getElementById('rateAporteHip').value) || 0) / 100;
      const rateTasaCompra = (parseFloat(document.getElementById('rateTasaCompra').value) || 0) / 100;
      const rateTasaHip = (parseFloat(document.getElementById('rateTasaHip').value) || 0) / 100;

      // Montos No Gravados
      const sellos = compraArs * rateSellos;
      const aporteCompra = compraArs * rateAporteCompra;
      const aporteHip = hipotecaArs * rateAporteHip;
      const tasaCompra = compraArs * rateTasaCompra;
      const tasaHip = hipotecaArs * rateTasaHip;
      const sellosMatriz = parseFloat(document.getElementById('valSellosMatriz').value) || 0;

      const subtotalNoGravado = sellos + aporteCompra + aporteHip + tasaCompra + tasaHip + sellosMatriz;

      // Actualizar DOM No Gravados
      document.getElementById('outSellos').innerText = formatPesos(sellos);
      document.getElementById('outAporteCompra').innerText = formatPesos(aporteCompra);
      document.getElementById('outAporteHip').innerText = formatPesos(aporteHip);
      document.getElementById('outTasaCompra').innerText = formatPesos(tasaCompra);
      document.getElementById('outTasaHip').innerText = formatPesos(tasaHip);
      document.getElementById('outSellosMatriz').innerText = formatPesos(sellosMatriz);
      document.getElementById('subtotalNoGravado').innerText = formatPesos(subtotalNoGravado);

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

    // Escuchadores de eventos para recálculo automático
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', calcular);
    });

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
  