const $ = (s) => document.querySelector(s);
const soles = (n) => "S/ " + n.toFixed(2);

// La foto de cada producto se busca como img/productos/<id>.jpg (o .png, .webp, .jpeg); si no existe, se muestra el emoji.
const EXT = ["jpg", "png", "webp", "jpeg"];
function fotoSiguiente(img) {
  const i = +img.dataset.i + 1;
  if (i < EXT.length) { img.dataset.i = i; img.src = `img/productos/${img.dataset.id}.${EXT[i]}`; }
  else img.replaceWith(img.dataset.emoji);
}

let seccion = "Todos", marcaTexto = "", texto = "", tipo = "";
let carrito = JSON.parse(localStorage.getItem("carrito") || "[]"); // [{id, cant}]
carrito = carrito.filter((c) => PRODUCTOS.some((p) => p.id === c.id)); // descarta productos que ya no existen

/* ---------- Filtros por sección y marca ---------- */
function crearChips(contenedor, valores, actual, alElegir) {
  contenedor.innerHTML = "";
  valores.forEach((v) => {
    const b = document.createElement("button");
    b.textContent = v;
    if (v === actual) b.classList.add("activo");
    b.onclick = () => alElegir(v);
    contenedor.appendChild(b);
  });
}

function limpiarMarca() { marcaTexto = ""; $("#marcaBuscar").value = ""; $("#quitarMarca").hidden = true; }

function pintarFiltros() {
  const secciones = ["Todos", ...new Set(PRODUCTOS.map((p) => p.seccion))];
  crearChips($("#secciones"), secciones, seccion, (v) => { seccion = v; limpiarMarca(); pintar(); });
  // Lista del buscador de marcas (según la sección y el tipo elegidos)
  const enSeccion = PRODUCTOS.filter((p) => (seccion === "Todos" || p.seccion === seccion) && (!tipo || p.tipo === tipo));
  const marcas = [...new Set(enSeccion.map((p) => p.marca))].sort((x, y) => x.localeCompare(y, "es"));
  $("#marcasLista").innerHTML = marcas.map((m) => `<option value="${m}"></option>`).join("");
}

/* ---------- Catálogo ---------- */
// Los productos con el mismo "grupo" (solo cambian por cantidad) salen en una tarjeta con selector.
const claveGrupo = (p) => p.grupo || "p" + p.id;

const bloquePrecio = (p) => `${p.detalle ? `<small class="precio-kilo">${p.detalle}</small>` : ""}
  ${p.precio
    ? `<span class="precio">${soles(p.precio)}</span>
  <button class="btn" onclick="agregar(${p.id})">Agregar al carrito</button>`
    : `<span class="precio consulta">Precio por confirmar</span>
  <button class="btn" disabled>No disponible aún</button>`}`;

function tarjeta(variantes) {
  const orden = variantes.slice().sort((x, y) => (x.precio ?? 1e9) - (y.precio ?? 1e9) || x.id - y.id);
  const p = orden.find((v) => v.precio) || orden[0];            // presentación que se muestra al inicio
  const fotoId = Math.min(...variantes.map((v) => v.id));       // la foto es la del primer producto del grupo
  const varias = variantes.length > 1;
  const nombre = varias ? p.base : p.nombre;
  const selector = varias
    ? `<select class="opcion" aria-label="Elegir presentación" onchange="elegirOpcion(this)">${orden.map((v) =>
        `<option value="${v.id}"${v.id === p.id ? " selected" : ""}>${v.etiqueta}${v.precio ? " · " + soles(v.precio) : " · por confirmar"}</option>`).join("")}</select>`
    : "";
  return `<article class="card" data-g="${claveGrupo(p)}">
      <div class="foto"><img src="${p.imagen || `img/productos/${fotoId}.jpg`}" data-i="${p.imagen ? EXT.length : 0}" data-id="${fotoId}" data-emoji="${p.emoji}" alt="${nombre}" loading="lazy" onerror="fotoSiguiente(this)"></div>
      <div class="info">
        <span class="marca">${p.marca}${p.categoria ? " · " + p.categoria : ""}</span>
        <h3>${nombre}</h3>${selector}
        <div class="compra">${bloquePrecio(p)}</div>
      </div>
    </article>`;
}

function elegirOpcion(sel) {
  const p = PRODUCTOS.find((x) => x.id === +sel.value);
  sel.closest(".card").querySelector(".compra").innerHTML = bloquePrecio(p);
}

function pintarProductos() {
  const coincide = (p) =>
    (seccion === "Todos" || p.seccion === seccion) && (!tipo || p.tipo === tipo) &&
    p.marca.toLowerCase().includes(marcaTexto) &&
    (p.nombre + " " + p.marca).toLowerCase().includes(texto);
  const claves = new Set(PRODUCTOS.filter(coincide).map(claveGrupo));
  const grupos = new Map();
  PRODUCTOS.forEach((p) => {
    const k = claveGrupo(p);
    if (claves.has(k)) (grupos.get(k) || grupos.set(k, []).get(k)).push(p);
  });
  $("#vacio").hidden = grupos.size > 0;
  $("#grilla").innerHTML = [...grupos.values()].map(tarjeta).join("");
}

function pintar() {
  pintarFiltros(); pintarProductos();
  $("#filtroTipo").hidden = !tipo; $("#tipoNombre").textContent = tipo;
}

/* ---------- Carrito ---------- */
function guardar() { localStorage.setItem("carrito", JSON.stringify(carrito)); pintarCarrito(); }

function agregar(id, cant = 1) {
  const it = carrito.find((c) => c.id === id);
  it ? (it.cant += cant) : carrito.push({ id, cant });
  guardar();
  $("#panel").hidden = false;
}

function cambiar(id, delta) {
  const it = carrito.find((c) => c.id === id);
  it.cant += delta;
  carrito = carrito.filter((c) => c.cant > 0);
  guardar();
}

function pintarCarrito() {
  let total = 0, cantidad = 0;
  $("#items").innerHTML = carrito.map((c) => {
    const p = PRODUCTOS.find((x) => x.id === c.id);
    total += p.precio * c.cant; cantidad += c.cant;
    return `<li>
      <span>${p.nombre}<br><small>${p.marca} · ${soles(p.precio)}</small></span>
      <span class="cant"><button onclick="cambiar(${p.id},-1)" aria-label="Quitar uno">−</button>
        ${c.cant}
        <button onclick="cambiar(${p.id},1)" aria-label="Agregar uno">+</button></span>
    </li>`;
  }).join("") || "<li>Tu carrito está vacío. Agrega algo rico para tu mascota.</li>";
  $("#total").textContent = soles(total);
  $("#contador").textContent = cantidad;
}

/* ---------- Pago ----------
   "Pagar ahora" abre la ventana de pago (js/extras.js) que usa Izipay. Los montos y las claves se manejan en el servidor (carpeta api/). */
function pagar() {
  if (!carrito.length) return alert("Agrega productos antes de pagar.");
  if (window.abrirPago) window.abrirPago();
  else alert("El pago no está disponible en este momento. Escríbenos por WhatsApp.");
}
function vaciarCarrito() { carrito = []; guardar(); }

/* ---------- Eventos ---------- */
$("#buscar").addEventListener("input", (e) => { texto = e.target.value.toLowerCase(); pintarProductos(); });
$("#abrirCarrito").onclick = () => ($("#panel").hidden = false);
$("#cerrarCarrito").onclick = () => ($("#panel").hidden = true);
$("#pagar").onclick = pagar;
document.querySelectorAll(".tile").forEach((t) => t.onclick = () => {
  tipo = t.dataset.tipo; seccion = "Todos"; limpiarMarca(); pintar();
  $("#catalogo").scrollIntoView({ behavior: "smooth" });
});
$("#quitarTipo").onclick = () => { tipo = ""; limpiarMarca(); pintar(); };
$("#marcaBuscar").addEventListener("input", (e) => {
  marcaTexto = e.target.value.toLowerCase().trim();
  $("#quitarMarca").hidden = !marcaTexto;
  pintarProductos();
});
$("#quitarMarca").onclick = () => { limpiarMarca(); pintarProductos(); };

pintar();
pintarCarrito();

/* ---------- Zoom de fotos ---------- */
const visor = $("#visor"), visorImg = $("#visorImg"), marco = $(".visor-marco");
function cerrarVisor() { visor.hidden = true; visorImg.classList.remove("zoom"); }
function abrirVisor(img) {
  visorImg.src = img.src; visorImg.alt = img.alt;
  $("#visorTxt").textContent = img.alt;
  visorImg.style.transformOrigin = "50% 50%";
  visor.hidden = false;
}
visorImg.addEventListener("click", () => visorImg.classList.toggle("zoom"));
visorImg.addEventListener("pointermove", (e) => {
  if (!visorImg.classList.contains("zoom")) return;
  const r = marco.getBoundingClientRect();
  visorImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
});
visor.addEventListener("click", (e) => { if (e.target === visor) cerrarVisor(); });
$("#cerrarVisor").onclick = cerrarVisor;
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!visor.hidden) cerrarVisor(); else cerrarDetalle();
});

/* ---------- Detalle del producto (al hacer clic en una tarjeta) ---------- */
const porPrecio = (x, y) => (x.precio ?? 1e9) - (y.precio ?? 1e9) || x.id - y.id;
let det = { variantes: [], id: 0, cant: 1 };

$("#grilla").addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card || e.target.closest("button, select")) return;
  abrirDetalle(card.dataset.g, +(card.querySelector(".opcion")?.value || 0));
});

function abrirDetalle(clave, idInicial) {
  const variantes = PRODUCTOS.filter((p) => claveGrupo(p) === clave).sort(porPrecio);
  const inicial = variantes.find((v) => v.id === idInicial) || variantes.find((v) => v.precio) || variantes[0];
  det = { variantes, id: inicial.id, cant: 1 };
  const fotoId = Math.min(...variantes.map((v) => v.id));
  const p = inicial;
  $("#detalleCuerpo").innerHTML = `<div class="det-grid">
    <div>
      <div class="det-foto"><img src="${p.imagen || `img/productos/${fotoId}.jpg`}" data-i="${p.imagen ? EXT.length : 0}" data-id="${fotoId}" data-emoji="${p.emoji}" alt="${variantes.length > 1 ? p.base : p.nombre}" onerror="fotoSiguiente(this)"></div>
      <p class="det-ayuda">Haz clic en la foto para ampliarla</p>
    </div>
    <div id="detInfo"></div>
  </div>`;
  pintarInfo();
  $("#detalle").hidden = false;
  $("#detalle").scrollTop = 0;
  document.body.style.overflow = "hidden";
}

function cerrarDetalle() { $("#detalle").hidden = true; document.body.style.overflow = ""; }

function pintarInfo() {
  const vs = det.variantes, p = vs.find((v) => v.id === det.id), varias = vs.length > 1;
  const porKg = (v) => {
    if (v.detalle) return `(${v.detalle.replace("por kilo", "x kg")})`;
    const m = /^([\d.]+)\s*kg$/i.exec(v.etiqueta || "");
    return m && v.precio ? `(${soles(v.precio / +m[1])} x kg)` : "";
  };
  const opciones = varias ? `<div class="det-opciones"><h3>Seleccionar presentación</h3>${vs.map((v) => `
      <label class="det-op${v.precio ? "" : " off"}">
        <input type="radio" name="presentacion" value="${v.id}"${v.id === det.id ? " checked" : ""}${v.precio ? "" : " disabled"}>
        <span>${v.etiqueta}</span><span class="xkg">${porKg(v)}</span>
        <span class="pr">${v.precio ? soles(v.precio) : "Por confirmar"}</span>
      </label>`).join("")}</div>` : "";
  const compra = p.precio
    ? `<div class="det-compra">
        <div><span class="det-precio">${soles(p.precio * det.cant)}</span>${det.cant > 1 ? `<small class="det-unit">${det.cant} × ${soles(p.precio)}</small>` : ""}</div>
        <div class="det-cant"><span>Cantidad</span><button data-q="-1" aria-label="Quitar uno">−</button><b>${det.cant}</b><button data-q="1" aria-label="Agregar uno">+</button></div>
        <button class="btn" id="detAgregar">Agregar al carrito</button>
      </div>`
    : `<div class="det-compra"><span class="det-precio consulta">Precio por confirmar</span><button class="btn" disabled>No disponible aún</button></div>`;
  $("#detInfo").innerHTML = `
    <p class="det-ruta">${[p.seccion, p.tipo, p.categoria].filter(Boolean).join(" / ")}</p>
    <p class="det-marca">${p.marca}</p>
    <h2 class="det-titulo" id="detTitulo">${varias ? p.base : p.nombre}</h2>
    <p class="det-sku">Código: ${p.id}</p>
    ${p.descripcion ? `<p class="det-desc">${p.descripcion}</p>` : ""}
    ${!varias && p.detalle ? `<p class="det-sku">${p.detalle}</p>` : ""}
    ${opciones}${compra}`;
}

$("#detalleCuerpo").addEventListener("change", (e) => {
  if (e.target.name === "presentacion") { det.id = +e.target.value; pintarInfo(); }
});
$("#detalleCuerpo").addEventListener("click", (e) => {
  const q = e.target.closest("[data-q]");
  if (q) { det.cant = Math.max(1, det.cant + +q.dataset.q); pintarInfo(); return; }
  if (e.target.closest("#detAgregar")) { agregar(det.id, det.cant); cerrarDetalle(); return; }
  const img = e.target.closest(".det-foto img");
  if (img) abrirVisor(img);
});
$("#cerrarDetalle").onclick = cerrarDetalle;
$("#detalle").addEventListener("click", (e) => { if (e.target === $("#detalle")) cerrarDetalle(); });

/* ---------- Carrusel de marcas ---------- */
// Si guardas el logo de una marca en img/marcas/<nombre-de-la-marca>.png (mira lista-marcas.csv), se muestra en lugar del texto.
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const EXT_LOGO = ["png", "jpg", "webp", "svg"];
// Orden de búsqueda del logo: primero el nombre en minúsculas con guiones (ej. bio-clin.png) y luego el nombre tal cual (ej. Bio Clin.png).
const logoRutas = (nombre) => {
  const s = slug(nombre), r = [];
  EXT_LOGO.forEach((e) => r.push(`img/marcas/${s}.${e}`));
  EXT_LOGO.forEach((e) => r.push(`img/marcas/${encodeURIComponent(nombre)}.${e}`));
  return r;
};
function logoSiguiente(img) {
  const rutas = logoRutas(img.alt), i = +img.dataset.i + 1;
  if (i < rutas.length) { img.dataset.i = i; img.src = rutas[i]; }
  else img.remove();
}

function pintarMarcas() {
  const cuenta = {};
  PRODUCTOS.forEach((p) => (cuenta[p.marca] = (cuenta[p.marca] || 0) + 1));
  const marcas = Object.keys(cuenta).filter((m) => m !== "Farmacia").sort((x, y) => cuenta[y] - cuenta[x]);  // "Farmacia" no es una marca
  $("#marcasCuenta").textContent = `(${marcas.length} marcas)`;
  const html = marcas.map((m) => `<li><button class="marca-chapa" data-marca="${m}" title="Ver productos de ${m}"><span>${m}</span><img src="${logoRutas(m)[0]}" data-i="0" alt="${m}" loading="lazy" onerror="logoSiguiente(this)"></button></li>`).join("");
  $("#marcasCarrusel").innerHTML = html + html;          // la lista se repite para que el giro no tenga corte
}

function filtrarMarca(nombre) {
  seccion = "Todos"; tipo = ""; pintar();
  marcaTexto = nombre.toLowerCase(); $("#marcaBuscar").value = nombre; $("#quitarMarca").hidden = false;
  pintarProductos();
  $("#catalogo").scrollIntoView({ behavior: "smooth" });
}
$("#marcasCarrusel").addEventListener("click", (e) => {
  const b = e.target.closest("[data-marca]");
  if (b && !huboArrastre) filtrarMarca(b.dataset.marca);
});

// Movimiento automático con transform (sin vibración): se detiene al pasar el mouse,
// se puede arrastrar con el dedo o el mouse, y las flechas lo mueven a mano.
const pista = $("#marcasPista"), carril = $("#marcasCarrusel");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let offset = 0, empuje = 0, pausa = false, arrastre = null, huboArrastre = false, ultimo = 0;
function girar(t) {
  const dt = Math.min(50, t - ultimo || 16) / 16.67; ultimo = t;
  const mitad = carril.scrollWidth / 2;
  if (empuje) { const paso = empuje * 0.15; offset += paso; empuje -= paso; if (Math.abs(empuje) < 0.5) empuje = 0; }
  else if (!pausa && !arrastre) offset += (reducido ? 0.25 : 0.6) * dt;   // con "reducir animaciones" activado va más lento
  if (mitad > 0) offset = ((offset % mitad) + mitad) % mitad;
  carril.style.transform = `translate3d(${-offset}px,0,0)`;
  requestAnimationFrame(girar);
}
pista.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") pausa = true; });
pista.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") pausa = false; });
pista.addEventListener("pointerdown", (e) => { arrastre = { x: e.clientX, off: offset, id: e.pointerId, mov: false }; empuje = 0; });
pista.addEventListener("pointermove", (e) => {
  if (!arrastre) return;
  const dx = e.clientX - arrastre.x;
  if (!arrastre.mov && Math.abs(dx) > 6) { arrastre.mov = true; pista.setPointerCapture(arrastre.id); pista.classList.add("arrastrando"); }
  if (arrastre.mov) offset = arrastre.off - dx;
});
const soltar = () => {
  if (arrastre && arrastre.mov) { huboArrastre = true; setTimeout(() => (huboArrastre = false), 50); }
  arrastre = null; pista.classList.remove("arrastrando");
};
pista.addEventListener("pointerup", soltar);
pista.addEventListener("pointercancel", soltar);
pista.addEventListener("lostpointercapture", soltar);
document.addEventListener("pointerup", soltar);
window.addEventListener("blur", () => { pausa = false; arrastre = null; });
$("#marcaPrev").onclick = () => (empuje -= 320);
$("#marcaNext").onclick = () => (empuje += 320);
pintarMarcas();
requestAnimationFrame(girar);
