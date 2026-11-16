const $ = (s) => document.querySelector(s);
const soles = (n) => "S/ " + n.toFixed(2);
const textoPrecio = (v, corto) => (v.precio ? soles(v.precio) : v.agotado ? "Agotado" : corto ? "Por confirmar" : "Precio por confirmar");

// Dónde está la foto de cada producto:
//  - por defecto img/productos/<id>.jpg (o .png, .webp, .jpeg)
//  - si el producto tiene "foto" (por ejemplo "juguetes/001_nombre|juguetes/001"), se prueba cada nombre en img/ con esas extensiones
// Cada opción de una tarjeta (sabor, kilo...) usa su propia foto; si no existe, se usa la del primer producto del grupo; y si tampoco, el emoji.
const EXT = ["jpg", "png", "webp", "jpeg"];
const basesFoto = (p) => (p.foto ? p.foto.split("|") : [`productos/${p.id}`]);
function candidatosFoto(img) {
  const l = img.dataset.im ? [img.dataset.im] : [];
  for (const grupo of [img.dataset.b, img.dataset.fb]) for (const b of (grupo || "").split("|").filter(Boolean)) EXT.forEach((e) => l.push(`img/${b}.${e}`));
  return [...new Set(l)];
}
function fotoSiguiente(img) {
  const c = candidatosFoto(img), i = +img.dataset.i + 1;
  if (i < c.length) { img.dataset.i = i; img.src = c[i]; return; }
  img.hidden = true;
  const e = img.parentElement.querySelector(".emo"); if (e) e.hidden = false;
}
function ponerFoto(img, v, fb) {
  img.removeAttribute("style"); delete img.dataset.bb;      // se vuelve a medir cuando carga la foto de la nueva opción
  const e = img.parentElement.querySelector(".emo"); if (e) e.hidden = true;
  img.hidden = false; img.dataset.b = basesFoto(v).join("|"); img.dataset.fb = fb; img.dataset.im = v.imagen || ""; img.dataset.i = 0;
  img.src = candidatosFoto(img)[0];
}
const fotoHTML = (p, fb, alt, extra = "") =>
  `<span class="emo" hidden>${p.emoji}</span><img src="${p.imagen || `img/${basesFoto(p)[0]}.${EXT[0]}`}" data-i="0" data-b="${basesFoto(p).join("|")}" data-fb="${fb}" data-im="${p.imagen || ""}" alt="${alt}" ${extra} onerror="fotoSiguiente(this)">`;
// fotos de respaldo de una tarjeta: las del primer producto del grupo
const baseGrupo = (p) => basesFoto(PRODUCTOS.filter((x) => claveGrupo(x) === claveGrupo(p)).sort((x, y) => x.id - y.id)[0]).join("|");

let seccion = "Todos", mascota = "", categoria = "", marcaTexto = "", texto = "", tipo = "";
let carrito = (() => { try { return JSON.parse(localStorage.getItem("carrito") || "[]"); } catch (e) { return []; } })()   // [{id, cant}]
  .filter((c) => PRODUCTOS.some((p) => p.id === c.id));
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

let marcasDisp = [];
function limpiarMarca() { marcaTexto = ""; $("#marcaBuscar").value = ""; $("#quitarMarca").hidden = true; }

function pintarFiltros() {
  const secciones = ["Todos", ...new Set(PRODUCTOS.map((p) => p.seccion))];
  crearChips($("#secciones"), secciones, seccion, (v) => { seccion = v; tipo = ""; categoria = ""; limpiarMarca(); pintar(); });
  // Tipos dentro de la sección (por ejemplo, en Juguetes: Peluches, Con sonido, Con luces...)
  const cats = new Map();
  PRODUCTOS.filter((p) => (seccion === "Todos" || p.seccion === seccion) && (!tipo || p.tipo === tipo) && (!mascota || p.mascota === mascota))
    .forEach((p) => { if (p.categoria) (cats.get(p.categoria) || cats.set(p.categoria, new Set()).get(p.categoria)).add(claveGrupo(p)); });
  const hayTipos = (seccion !== "Todos" || tipo) && cats.size >= 2;
  if (!hayTipos || !cats.has(categoria)) categoria = "";
  $("#filaCategorias").hidden = !hayTipos;
  const contCat = $("#categorias"); contCat.innerHTML = "";
  if (hayTipos) [["", "Todos"], ...[...cats].sort((x, y) => y[1].size - x[1].size).map(([c, s]) => [c, `${c} (${s.size})`])].forEach(([valor, texto]) => {
    const b = document.createElement("button"); b.textContent = texto;
    if (valor === categoria) b.classList.add("activo");
    b.onclick = () => { categoria = valor; limpiarMarca(); pintar(); };
    contCat.appendChild(b);
  });
  const mascotas = ["Todas", ...new Set(PRODUCTOS.map((p) => p.mascota).filter(Boolean))];
  crearChips($("#mascotas"), mascotas, mascota || "Todas", (v) => { mascota = v === "Todas" ? "" : v; limpiarMarca(); pintar(); });
  // Lista del buscador de marcas (según la sección, la mascota y el tipo elegidos)
  const enSeccion = PRODUCTOS.filter((p) => (seccion === "Todos" || p.seccion === seccion) && (!mascota || p.mascota === mascota) && (!tipo || p.tipo === tipo));
  const porMarca = new Map();
  enSeccion.forEach((p) => { if (p.marca && p.marca !== "Farmacia") (porMarca.get(p.marca) || porMarca.set(p.marca, new Set()).get(p.marca)).add(claveGrupo(p)); });
  marcasDisp = [...porMarca].map(([n, s]) => ({ n, c: s.size })).sort((x, y) => x.n.localeCompare(y.n, "es"));
  if (!$("#marcaLista").hidden) pintarListaMarcas();
}

/* ---------- Catálogo ---------- */
// Los productos con el mismo "grupo" (solo cambian por cantidad) salen en una tarjeta con selector.
const claveGrupo = (p) => p.grupo || "p" + p.id;

const bloquePrecio = (p) => `${p.detalle ? `<small class="precio-kilo">${p.detalle}</small>` : ""}
  ${p.precio
    ? `<span class="precio">${soles(p.precio)}</span>
  <button class="btn" onclick="agregar(${p.id})">Agregar al carrito</button>`
    : `<span class="precio consulta">${textoPrecio(p)}</span>
  <button class="btn" disabled>${p.agotado ? "Agotado" : "No disponible aún"}</button>`}`;

const ddBoton = (v) => `<span class="dd-txt">${v.etiqueta}</span><span class="dd-precio">${textoPrecio(v, true)}</span><i class="dd-flecha" aria-hidden="true"></i>`;

function tarjeta(variantes) {
  const orden = variantes.slice().sort((x, y) => (x.precio ?? 1e9) - (y.precio ?? 1e9) || x.id - y.id);
  const p = orden.find((v) => v.precio) || orden[0];            // presentación que se muestra al inicio
  const fotoId = baseGrupo(p);                                  // foto de respaldo: la del primer producto del grupo
  const varias = variantes.length > 1;
  const nombre = varias ? p.base : p.nombre;
  const selector = varias
    ? `<div class="dd"><select class="opcion" hidden tabindex="-1" aria-hidden="true" onchange="elegirOpcion(this)">${orden.map((v) =>
        `<option value="${v.id}"${v.id === p.id ? " selected" : ""}>${v.etiqueta}${" · " + textoPrecio(v, true)}</option>`).join("")}</select>
        <button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Elegir presentación">${ddBoton(p)}</button></div>`
    : "";
  return `<article class="card" data-g="${claveGrupo(p)}">
      <div class="foto">${fotoHTML(p, fotoId, nombre, 'loading="lazy"')}</div>
      <div class="info">
        <span class="marca">${[p.marca, p.categoria].filter(Boolean).join(" · ")}</span>
        <h3>${nombre}</h3>${selector}
        <div class="compra">${bloquePrecio(p)}</div>
      </div>
    </article>`;
}

function elegirOpcion(sel) {
  const p = PRODUCTOS.find((x) => x.id === +sel.value);
  const b = sel.parentElement.querySelector(".dd-btn"); if (b) b.innerHTML = ddBoton(p);
  const card = sel.closest(".card"), img = card.querySelector(".foto img");
  card.querySelector(".compra").innerHTML = bloquePrecio(p);
  ponerFoto(img, p, img.dataset.fb);
}

function pintarProductos() {
  const coincide = (p) =>
    (seccion === "Todos" || p.seccion === seccion) && (!mascota || p.mascota === mascota) && (!tipo || p.tipo === tipo) && (!categoria || p.categoria === categoria) &&
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

function agregar(id, cant = 1, abrirPanel = true) {
  const it = carrito.find((c) => c.id === id);
  it ? (it.cant += cant) : carrito.push({ id, cant });
  guardar();
  if (abrirPanel) avisoAgregado();
}

function cambiar(id, delta) {
  const it = carrito.find((c) => c.id === id);
  it.cant += delta;
  carrito = carrito.filter((c) => c.cant > 0);
  guardar();
}

function quitar(id) { carrito = carrito.filter((c) => c.id !== id); guardar(); }
let cantidadAnterior = 0;
// El carrito ahora vive en carrito.html; aquí solo se actualiza el contador del encabezado.
function pintarCarrito() {
  const cantidad = carrito.reduce((s, c) => s + c.cant, 0);
  $("#contador").textContent = cantidad;
  if (cantidad > cantidadAnterior) { const c = $("#contador"); c.classList.remove("pulso"); void c.offsetWidth; c.classList.add("pulso"); }
  cantidadAnterior = cantidad;
}
function avisoAgregado() {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.innerHTML = '✓ Agregado al carrito <a href="carrito.html">Ver carrito</a>';
  t.classList.add("ver"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("ver"), 3500);
}
// Al volver con el botón "atrás" desde carrito.html, se relee el carrito guardado
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  try { carrito = JSON.parse(localStorage.getItem("carrito") || "[]").filter((c) => PRODUCTOS.some((p) => p.id === c.id)); } catch (x) { carrito = []; }
  cantidadAnterior = carrito.reduce((s, c) => s + c.cant, 0); pintarCarrito();
});

/* ---------- Eventos ---------- */
$("#buscar").addEventListener("input", (e) => { texto = e.target.value.toLowerCase(); pintarProductos(); });
document.querySelectorAll(".tile").forEach((t) => t.onclick = () => {
  tipo = t.dataset.tipo; seccion = "Todos"; categoria = ""; limpiarMarca(); pintar();
  $("#catalogo").scrollIntoView({ behavior: "smooth" });
});
$("#quitarTipo").onclick = () => { tipo = ""; categoria = ""; limpiarMarca(); pintar(); };
$("#marcaBuscar").addEventListener("input", (e) => {
  marcaTexto = e.target.value.toLowerCase().trim();
  $("#quitarMarca").hidden = !marcaTexto;
  pintarProductos();
});
$("#quitarMarca").onclick = () => { limpiarMarca(); cerrarListaMarcas(); pintarProductos(); };


/* ---------- Listas desplegables ---------- */
// (1) Presentaciones de una tarjeta (sabor, kilo, talla...): lista propia en lugar del menú nativo del navegador.
const ddLista = document.createElement("ul");
ddLista.id = "ddLista"; ddLista.className = "dd-lista"; ddLista.setAttribute("role", "listbox"); ddLista.hidden = true;
document.body.appendChild(ddLista);
let ddAbierto = null;
function cerrarDD(foco) {
  if (!ddAbierto) return;
  ddLista.hidden = true; ddAbierto.btn.setAttribute("aria-expanded", "false");
  if (foco) ddAbierto.btn.focus();
  ddAbierto = null;
}
function abrirDD(btn) {
  const sel = btn.parentElement.querySelector("select"), actual = +sel.value;
  cerrarDD();
  ddLista.innerHTML = [...sel.options].map((o) => PRODUCTOS.find((x) => x.id === +o.value)).map((v) =>
    `<li role="option" tabindex="-1" data-v="${v.id}" aria-selected="${v.id === actual}" class="dd-op${v.id === actual ? " sel" : ""}${v.precio ? "" : " sin"}"><span class="dd-ck" aria-hidden="true"></span><span class="dd-et">${v.etiqueta}</span><span class="dd-pr">${textoPrecio(v, true)}</span></li>`).join("");
  const r = btn.getBoundingClientRect();
  ddLista.style.cssText = `min-width:${r.width}px;max-height:300px;visibility:hidden`;
  ddLista.hidden = false;
  const h = ddLista.offsetHeight, w = ddLista.offsetWidth, abajo = innerHeight - r.bottom - 12, arriba = r.top - 12;
  const debajo = abajo >= Math.min(h, 220) || abajo >= arriba;
  ddLista.style.cssText = `min-width:${r.width}px;max-height:${Math.min(300, Math.max(150, debajo ? abajo : arriba))}px;left:${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px;top:${debajo ? r.bottom + 6 : Math.max(8, r.top - Math.min(h, arriba) - 6)}px`;
  btn.setAttribute("aria-expanded", "true"); ddAbierto = { btn, sel };
  (ddLista.querySelector(".sel") || ddLista.firstElementChild).focus();
}
function elegirDD(li) {
  const { sel } = ddAbierto, id = li.dataset.v;
  cerrarDD(true);
  if (sel.value !== id) { sel.value = id; sel.dispatchEvent(new Event("change", { bubbles: true })); }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".dd-btn"), li = e.target.closest("#ddLista .dd-op");
  if (b) { ddAbierto && ddAbierto.btn === b ? cerrarDD() : abrirDD(b); }
  else if (li) elegirDD(li);
  else cerrarDD();
});
document.addEventListener("keydown", (e) => {
  const b = e.target.closest && e.target.closest(".dd-btn");
  if (b && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); abrirDD(b); return; }
  if (!ddAbierto) return;
  const ops = [...ddLista.children], i = ops.indexOf(document.activeElement);
  if (e.key === "Escape") { e.preventDefault(); cerrarDD(true); }
  else if (e.key === "Tab") cerrarDD();
  else if (e.key === "ArrowDown") { e.preventDefault(); ops[Math.min(ops.length - 1, i + 1)].focus(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); ops[Math.max(0, i - 1)].focus(); }
  else if (e.key === "Home") { e.preventDefault(); ops[0].focus(); }
  else if (e.key === "End") { e.preventDefault(); ops[ops.length - 1].focus(); }
  else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); elegirDD(ops[i]); }
});
window.addEventListener("scroll", (e) => { if (ddAbierto && !ddLista.contains(e.target)) cerrarDD(); }, true);
window.addEventListener("resize", () => cerrarDD());

// (2) Buscador de marcas: lista con la cantidad de productos de cada marca y el texto escrito resaltado.
const entradaMarca = $("#marcaBuscar"), listaMarca = $("#marcaLista");
let marcaActiva = -1;
const sinTildes = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function pintarListaMarcas() {
  const q = sinTildes(entradaMarca.value.trim());
  const lis = marcasDisp.filter((m) => sinTildes(m.n).includes(q));
  listaMarca.innerHTML = lis.length
    ? lis.map((m, i) => {
        const k = q ? m.n.toLowerCase().indexOf(q) : -1;
        const txt = k >= 0 ? `${m.n.slice(0, k)}<mark>${m.n.slice(k, k + q.length)}</mark>${m.n.slice(k + q.length)}` : m.n;
        return `<li role="option" id="mo${i}" class="mf-op" data-n="${m.n}"><span>${txt}</span><small>${m.c} ${m.c === 1 ? "producto" : "productos"}</small></li>`;
      }).join("")
    : '<li class="mf-vacio">No hay marcas con ese nombre</li>';
  marcaActiva = -1; listaMarca.hidden = false; entradaMarca.setAttribute("aria-expanded", "true");
}
function cerrarListaMarcas() { listaMarca.hidden = true; entradaMarca.setAttribute("aria-expanded", "false"); entradaMarca.removeAttribute("aria-activedescendant"); marcaActiva = -1; }
function elegirMarca(n) {
  entradaMarca.value = n; marcaTexto = n.toLowerCase(); $("#quitarMarca").hidden = false;
  cerrarListaMarcas(); pintarProductos();
}
function moverMarca(d) {
  const ops = [...listaMarca.querySelectorAll(".mf-op")]; if (!ops.length) return;
  marcaActiva = (marcaActiva + d + ops.length) % ops.length;
  ops.forEach((o, i) => o.classList.toggle("act", i === marcaActiva));
  ops[marcaActiva].scrollIntoView({ block: "nearest" });
  entradaMarca.setAttribute("aria-activedescendant", ops[marcaActiva].id);
}
entradaMarca.addEventListener("focus", pintarListaMarcas);
entradaMarca.addEventListener("click", () => { if (listaMarca.hidden) pintarListaMarcas(); });
entradaMarca.addEventListener("input", pintarListaMarcas);
entradaMarca.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); listaMarca.hidden ? pintarListaMarcas() : moverMarca(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); moverMarca(-1); }
  else if (e.key === "Enter") { const o = listaMarca.querySelector(".mf-op.act") || (listaMarca.querySelectorAll(".mf-op").length === 1 ? listaMarca.querySelector(".mf-op") : null); if (o) { e.preventDefault(); elegirMarca(o.dataset.n); } else cerrarListaMarcas(); }
  else if (e.key === "Escape") cerrarListaMarcas();
  else if (e.key === "Tab") cerrarListaMarcas();
});
listaMarca.addEventListener("mousedown", (e) => e.preventDefault());       // el campo no pierde el foco al hacer clic en la lista
listaMarca.addEventListener("click", (e) => { const o = e.target.closest(".mf-op"); if (o) elegirMarca(o.dataset.n); });
document.addEventListener("click", (e) => { if (!e.target.closest(".mf-caja")) cerrarListaMarcas(); });

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
  const p = inicial, fotoId = baseGrupo(p);
  $("#detalleCuerpo").innerHTML = `<div class="det-grid">
    <div>
      <div class="det-foto">${fotoHTML(p, fotoId, variantes.length > 1 ? p.base : p.nombre)}</div>
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
    const m = /(\d+(?:\.\d+)?)\s*kg\b/i.exec(v.etiqueta || "");
    return m && v.precio ? `(${soles(v.precio / +m[1])} x kg)` : "";
  };
  const opciones = varias ? `<div class="det-opciones"><h3>Seleccionar presentación</h3>${vs.map((v) => `
      <label class="det-op${v.precio ? "" : " off"}">
        <input type="radio" name="presentacion" value="${v.id}"${v.id === det.id ? " checked" : ""}${v.precio ? "" : " disabled"}>
        <span>${v.etiqueta}</span><span class="xkg">${porKg(v)}</span>
        <span class="pr">${textoPrecio(v, true)}</span>
      </label>`).join("")}</div>` : "";
  const compra = p.precio
    ? `<div class="det-compra">
        <div><span class="det-precio">${soles(p.precio * det.cant)}</span>${det.cant > 1 ? `<small class="det-unit">${det.cant} × ${soles(p.precio)}</small>` : ""}</div>
        <div class="det-cant"><span>Cantidad</span><button data-q="-1" aria-label="Quitar uno">−</button><b>${det.cant}</b><button data-q="1" aria-label="Agregar uno">+</button></div>
        <button class="btn" id="detAgregar">Agregar al carrito</button>
      </div>`
    : `<div class="det-compra"><span class="det-precio consulta">${textoPrecio(p)}</span><button class="btn" disabled>${p.agotado ? "Agotado" : "No disponible aún"}</button></div>`;
  $("#detInfo").innerHTML = `
    <p class="det-ruta">${[...new Set([p.seccion, p.tipo, p.categoria].filter(Boolean))].join(" / ")}</p>
    <p class="det-marca">${p.marca || ""}</p>
    <h2 class="det-titulo" id="detTitulo">${varias ? p.base : p.nombre}</h2>
    <p class="det-sku">Código: ${p.id}</p>
    ${p.descripcion ? `<p class="det-desc">${p.descripcion}</p>` : ""}
    ${!varias && p.detalle ? `<p class="det-sku">${p.detalle}</p>` : ""}
    ${opciones}${compra}`;
}

$("#detalleCuerpo").addEventListener("change", (e) => {
  if (e.target.name === "presentacion") {
    det.id = +e.target.value; pintarInfo();
    const img = $(".det-foto img"); if (img) ponerFoto(img, det.variantes.find((v) => v.id === det.id), img.dataset.fb);
  }
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
  // Solo salen las marcas de MARCAS_CARRUSEL (productos.js, tu lista-marcas.csv); "Farmacia" no es una marca
  const permitidas = typeof MARCAS_CARRUSEL !== "undefined" ? new Set(MARCAS_CARRUSEL) : null;
  const marcas = Object.keys(cuenta).filter((m) => m && m !== "Farmacia" && (!permitidas || permitidas.has(m))).sort((x, y) => cuenta[y] - cuenta[x]);
  $("#marcasCuenta").textContent = `(${marcas.length} marcas)`;
  const html = marcas.map((m) => `<li><button class="marca-chapa" data-marca="${m}" title="Ver productos de ${m}"><span>${m}</span><img src="${logoRutas(m)[0]}" data-i="0" alt="${m}" loading="lazy" onerror="logoSiguiente(this)"></button></li>`).join("");
  $("#marcasCarrusel").innerHTML = html + html;          // la lista se repite para que el giro no tenga corte
}

function filtrarMarca(nombre) {
  seccion = "Todos"; mascota = ""; categoria = ""; tipo = ""; pintar();
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
