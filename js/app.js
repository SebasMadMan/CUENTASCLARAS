// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let categorias = [];
let gastos = JSON.parse(localStorage.getItem("cuentasclaras_gastos")) || [];
let presupuesto = Number(localStorage.getItem("cuentasclaras_presupuesto")) || 0;

// Referencias del DOM
const formPresupuesto = document.getElementById("form-presupuesto");
const inputPresupuesto = document.getElementById("input-presupuesto");
const displayPresupuesto = document.getElementById("display-presupuesto");
const totalGastadoEl = document.getElementById("total-gastado");
const saldoRestanteEl = document.getElementById("saldo-restante");

const formGasto = document.getElementById("form-gasto");
const inputDescripcion = document.getElementById("input-descripcion");
const inputMonto = document.getElementById("input-monto");
const selectCategoria = document.getElementById("select-categoria");

const selectFiltro = document.getElementById("select-filtro");
const listaGastos = document.getElementById("lista-gastos");

// ==========================================
// 1. ASINCRONISMO Y FETCH
// ==========================================
async function cargarCategorias() {
  try {
    const respuesta = await fetch('./json/categorias.json');
    if (!respuesta.ok) throw new Error("No se pudo cargar el archivo JSON");
    
    categorias = await respuesta.json();
    poblarDesplegablesCategorias(categorias);
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error de carga',
      text: 'No se pudieron obtener las categorías de gastos.',
      confirmButtonColor: '#0d6efd'
    });
  }
}

function poblarDesplegablesCategorias(lista) {
  // Resetear el select del formulario de gastos
  selectCategoria.innerHTML = `<option value="" disabled selected>Selecciona una categoría</option>`;
  
  // Resetear el select de filtro
  selectFiltro.innerHTML = `<option value="todas">Todas las categorías</option>`;

  lista.forEach(cat => {
    // Opción para el formulario de alta
    const optForm = document.createElement("option");
    optForm.value = cat.nombre;
    optForm.textContent = cat.nombre;
    selectCategoria.appendChild(optForm);

    // Opción para el filtro
    const optFiltro = document.createElement("option");
    optFiltro.value = cat.nombre;
    optFiltro.textContent = cat.nombre;
    selectFiltro.appendChild(optFiltro);
  });
}

// ==========================================
// 2. GESTIÓN DEL PRESUPUESTO
// ==========================================
formPresupuesto.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const montoIngresado = Number(inputPresupuesto.value);

  if (montoIngresado <= 0 || isNaN(montoIngresado)) return;

  presupuesto = montoIngresado;
  localStorage.setItem("cuentasclaras_presupuesto", presupuesto);
  
  actualizarResumenYBilletera();

  Toastify({
    text: "Presupuesto actualizado correctamente",
    duration: 2500,
    gravity: "bottom",
    position: "right",
    style: { background: "#198754" }
  }).showToast();

  formPresupuesto.reset();
});

// ==========================================
// 3. REGISTRO Y GESTIÓN DE GASTOS
// ==========================================
formGasto.addEventListener("submit", (e) => {
  e.preventDefault();

  const descripcion = inputDescripcion.value.trim();
  const monto = Number(inputMonto.value);
  const categoria = selectCategoria.value;

  if (!descripcion || monto <= 0 || !categoria) return;

  const nuevoGasto = {
    id: Date.now(),
    descripcion,
    monto,
    categoria,
    fecha: new Date().toLocaleDateString('es-AR')
  };

  gastos.push(nuevoGasto);
  guardarYActualizar();

  Toastify({
    text: `Gasto "${descripcion}" registrado`,
    duration: 2500,
    gravity: "bottom",
    position: "right",
    style: { background: "#0d6efd" }
  }).showToast();

  formGasto.reset();
});

// Eliminar un gasto específico usando 'filter' y confirmación con SweetAlert2
function eliminarGasto(id) {
  const gastoEncontrado = gastos.find(g => g.id === id);
  if (!gastoEncontrado) return;

  Swal.fire({
    title: '¿Confirmas la eliminación?',
    text: `Se borrará el gasto "${gastoEncontrado.descripcion}" de $${gastoEncontrado.monto}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      gastos = gastos.filter(g => g.id !== id);
      guardarYActualizar();

      Toastify({
        text: "Gasto eliminado correctamente",
        duration: 2000,
        gravity: "bottom",
        position: "right",
        style: { background: "#dc3545" }
      }).showToast();
    }
  });
}

// ==========================================
// 4. MÉTODOS DE ARRAYS Y RENDERIZADO DEL DOM
// ==========================================
function actualizarResumenYBilletera() {
  // Cálculo con 'reduce'
  const totalGastado = gastos.reduce((acumulado, gasto) => acumulado + gasto.monto, 0);
  const saldoRestante = presupuesto - totalGastado;

  // Actualización de los indicadores en el DOM
  displayPresupuesto.textContent = presupuesto.toLocaleString();
  totalGastadoEl.textContent = totalGastado.toLocaleString();
  saldoRestanteEl.textContent = saldoRestante.toLocaleString();

  // Alerta si se supera el presupuesto
  if (presupuesto > 0 && totalGastado > presupuesto) {
    Swal.fire({
      icon: 'warning',
      title: '¡Presupuesto Superado!',
      text: `Has excedido el límite registrado por $${(totalGastado - presupuesto).toLocaleString()}`,
      confirmButtonColor: '#dc3545'
    });
  }

  renderizarGastos();
}

function renderizarGastos() {
  listaGastos.innerHTML = "";

  const categoriaFiltro = selectFiltro.value;

  // Filtrado de array usando 'filter'
  const gastosVisibles = categoriaFiltro === "todas" 
    ? gastos 
    : gastos.filter(g => g.categoria === categoriaFiltro);

  if (gastosVisibles.length === 0) {
    listaGastos.innerHTML = `<li class="empty-msg">No hay gastos registrados en esta categoría.</li>`;
    return;
  }

  // Renderizado dinámico con 'forEach'
  gastosVisibles.forEach(gasto => {
    const li = document.createElement("li");
    li.classList.add("item-gasto");
    li.innerHTML = `
      <div class="info-gasto">
        <strong>${gasto.descripcion}</strong>
        <span class="badge-cat">${gasto.categoria}</span>
        <small>${gasto.fecha}</small>
      </div>
      <div class="monto-accion">
        <span class="monto-text">$${gasto.monto.toLocaleString()}</span>
        <button class="btn-delete" onclick="eliminarGasto(${gasto.id})">Eliminar</button>
      </div>
    `;
    listaGastos.appendChild(li);
  });
}

// Evento para el filtro de categorías
selectFiltro.addEventListener("change", renderizarGastos);

function guardarYActualizar() {
  localStorage.setItem("cuentasclaras_gastos", JSON.stringify(gastos));
  actualizarResumenYBilletera();
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  cargarCategorias();
  actualizarResumenYBilletera();
});