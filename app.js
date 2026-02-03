/*
  app.js
  ----------
  Aplicación BI educativa en JavaScript puro.
  Lee ventas_raw.csv, limpia los datos, calcula KPIs y muestra gráficos.
*/

// Arrays principales
let rawData = [];
let cleanData = [];

// Cargar el CSV al abrir la página
fetch('ventas_raw.csv')
  .then(response => response.text())
  .then(text => {
    rawData = parseCSV(text);
    cleanData = cleanDataFunction(rawData);

    mostrarContador();
    mostrarTablas();
    calcularKPIs();
    crearGraficos();
  });

/*
  =========================
  PARSEO CSV
  =========================
*/
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines.shift().split(',');

  return lines.map(line => {
    const values = line.split(',');
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

/*
  =========================
  LIMPIEZA DE DATOS
  =========================
*/
function cleanDataFunction(data) {
  let cleaned = [];

  data.forEach(row => {
    // Fecha válida
    const fecha = new Date(row.fecha);
    if (isNaN(fecha)) return;

    // Producto
    if (!row.producto) return;
    const producto = row.producto.trim().toLowerCase();

    // Franja
    let franja = row.franja.toLowerCase();
    if (franja.includes('des')) franja = 'Desayuno';
    else if (franja.includes('com')) franja = 'Comida';
    else return;

    // Familia
    let familia = row.familia.toLowerCase();
    if (familia.startsWith('beb')) familia = 'Bebida';
    else if (familia.startsWith('ent')) familia = 'Entrante';
    else if (familia.startsWith('pri')) familia = 'Principal';
    else if (familia.startsWith('pos')) familia = 'Postre';
    else return;

    // Unidades y precio
    const unidades = Number(row.unidades);
    const precio = Number(row.precio_unitario);
    if (unidades <= 0 || precio <= 0) return;

    // Recalcular importe
    const importe = unidades * precio;

    cleaned.push({
      fecha: fecha.toISOString().split('T')[0],
      franja,
      producto,
      familia,
      unidades,
      precio_unitario: precio,
      importe
    });
  });

  // Eliminar duplicados exactos
  const unique = [];
  const seen = new Set();

  cleaned.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  });

  return unique;
}

/*
  =========================
  MOSTRAR CONTADORES
  =========================
*/
function mostrarContador() {
  document.getElementById('contadorFilas').innerText =
    `Filas RAW: ${rawData.length} | Filas limpias: ${cleanData.length}`;
}

/*
  =========================
  TABLAS
  =========================
*/
function crearTabla(data) {
  let html = '<table><tr>';
  Object.keys(data[0]).forEach(h => html += `<th>${h}</th>`);
  html += '</tr>';

  data.slice(0, 10).forEach(row => {
    html += '<tr>';
    Object.values(row).forEach(v => html += `<td>${v}</td>`);
    html += '</tr>';
  });

  html += '</table>';
  return html;
}

function mostrarTablas() {
  document.getElementById('tablaRaw').innerHTML = crearTabla(rawData);
  document.getElementById('tablaClean').innerHTML = crearTabla(cleanData);
}

/*
  =========================
  KPIs
  =========================
*/
function calcularKPIs() {
  let totalVentas = 0;
  let totalUnidades = 0;
  let porProducto = {};
  let porFranja = {};
  let porFamilia = {};

  cleanData.forEach(r => {
    totalVentas += r.importe;
    totalUnidades += r.unidades;

    porProducto[r.producto] = (porProducto[r.producto] || 0) + r.importe;
    porFranja[r.franja] = (porFranja[r.franja] || 0) + r.importe;
    porFamilia[r.familia] = (porFamilia[r.familia] || 0) + r.importe;
  });

  const kpisDiv = document.getElementById('kpis');
  kpisDiv.innerHTML = `
    <div class="kpi">Ventas (€): ${totalVentas.toFixed(2)}</div>
    <div class="kpi">Unidades: ${totalUnidades}</div>
  `;

  window.kpiData = { porProducto, porFranja, porFamilia };
}

/*
  =========================
  GRÁFICOS
  =========================
*/
function crearGraficos() {
  // Top 5 productos
  const productosOrdenados = Object.entries(kpiData.porProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(document.getElementById('chartProductos'), {
    type: 'bar',
    data: {
      labels: productosOrdenados.map(p => p[0]),
      datasets: [{
        label: 'Importe (€)',
        data: productosOrdenados.map(p => p[1])
      }]
    }
  });

  // Ventas por franja
  new Chart(document.getElementById('chartFranja'), {
    type: 'pie',
    data: {
      labels: Object.keys(kpiData.porFranja),
      datasets: [{
        data: Object.values(kpiData.porFranja)
      }]
    }
  });

  // Ventas por familia
  new Chart(document.getElementById('chartFamilia'), {
    type: 'pie',
    data: {
      labels: Object.keys(kpiData.porFamilia),
      datasets: [{
        data: Object.values(kpiData.porFamilia)
      }]
    }
  });
}

/*
  =========================
  DESCARGA CSV LIMPIO
  =========================
*/
document.getElementById('downloadBtn').addEventListener('click', () => {
  let csv = 'fecha,franja,producto,familia,unidades,precio_unitario,importe\n';

  cleanData.forEach(r => {
    csv += `${r.fecha},${r.franja},${r.producto},${r.familia},${r.unidades},${r.precio_unitario},${r.importe}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ventas_clean.csv';
  a.click();

  URL.revokeObjectURL(url);
});
