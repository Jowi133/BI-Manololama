
*/

document.addEventListener('DOMContentLoaded', () => {
  cargarCSV();
});

let rawData = [];
let cleanData = [];

function cargarCSV() {
  fetch('./ventas_raw.csv')
    .then(response => {
      if (!response.ok) {
        throw new Error('No se pudo cargar ventas_raw.csv');
      }
      return response.text();
    })
    .then(text => {
      rawData = parseCSV(text);
      cleanData = cleanDataFunction(rawData);

      mostrarContador();
      mostrarTablas();
      calcularKPIs();
      crearGraficos();
    })
    .catch(error => {
      alert('ERROR: El archivo ventas_raw.csv no se encuentra en la carpeta raíz');
      console.error(error);
    });
}

/* =========================
   PARSE CSV
========================= */
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

/* =========================
   LIMPIEZA
========================= */
function cleanDataFunction(data) {
  let result = [];

  data.forEach(row => {
    const fecha = new Date(row.fecha);
    if (isNaN(fecha)) return;

    if (!row.producto) return;
    const producto = row.producto.trim().toLowerCase();

    let franja = row.franja.toLowerCase();
    if (franja.includes('des')) franja = 'Desayuno';
    else if (franja.includes('com')) franja = 'Comida';
    else return;

    let familia = row.familia.toLowerCase();
    if (familia.startsWith('beb')) familia = 'Bebida';
    else if (familia.startsWith('ent')) familia = 'Entrante';
    else if (familia.startsWith('pri')) familia = 'Principal';
    else if (familia.startsWith('pos')) familia = 'Postre';
    else return;

    const unidades = Number(row.unidades);
    const precio = Number(row.precio_unitario);
    if (unidades <= 0 || precio <= 0) return;

    result.push({
      fecha: fecha.toISOString().split('T')[0],
      franja,
      producto,
      familia,
      unidades,
      precio_unitario: precio,
      importe: unidades * precio
    });
  });

  // eliminar duplicados exactos
  const seen = new Set();
  return result.filter(r => {
    const key = JSON.stringify(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* =========================
   CONTADOR
========================= */
function mostrarContador() {
  document.getElementById('contadorFilas').innerText =
    `Filas RAW: ${rawData.length} | Filas limpias: ${cleanData.length}`;
}

/* =========================
   TABLAS
========================= */
function crearTabla(data) {
  if (data.length === 0) return '<p>No hay datos</p>';

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

/* =========================
   KPIs
========================= */
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

  document.getElementById('kpis').innerHTML = `
    <div class="kpi">Ventas (€): ${totalVentas.toFixed(2)}</div>
    <div class="kpi">Unidades: ${totalUnidades}</div>
  `;

  window.kpiData = { porProducto, porFranja, porFamilia };
}

/* =========================
   GRÁFICOS
========================= */
function crearGraficos() {
  if (!window.kpiData) return;

  const topProductos = Object.entries(kpiData.porProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(document.getElementById('chartProductos'), {
    type: 'bar',
    data: {
      labels: topProductos.map(p => p[0]),
      datasets: [{
        label: 'Importe (€)',
        data: topProductos.map(p => p[1])
      }]
    }
  });

  new Chart(document.getElementById('chartFranja'), {
    type: 'pie',
    data: {
      labels: Object.keys(kpiData.porFranja),
      datasets: [{ data: Object.values(kpiData.porFranja) }]
    }
  });

  new Chart(document.getElementById('chartFamilia'), {
    type: 'pie',
    data: {
      labels: Object.keys(kpiData.porFamilia),
      datasets: [{ data: Object.values(kpiData.porFamilia) }]
    }
  });
}
