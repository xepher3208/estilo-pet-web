/* Página del carrito: lista de productos, adicionales, datos del cliente y pago con Izipay.
   Lee el mismo carrito que guarda la tienda (localStorage "carrito" = [{id, cant}]). */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const soles = (n) => "S/ " + n.toFixed(2);
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const CONF = { whatsapp: "51937678433", tienda: "Estilo Pet" };

  /* ---------- Fotos (misma lógica de la tienda) ---------- */
  const EXT = ["jpg", "png", "webp", "jpeg"];
  const basesFoto = (p) => (p.foto ? p.foto.split("|") : [`productos/${p.id}`]);
  function candidatosFoto(img) {
    const l = img.dataset.im ? [img.dataset.im] : [];
    for (const grupo of [img.dataset.b, img.dataset.fb]) for (const b of (grupo || "").split("|").filter(Boolean)) EXT.forEach((e) => l.push(`img/${b}.${e}`));
    return [...new Set(l)];
  }
  window.fotoSiguiente = function (img) {
    const c = candidatosFoto(img), i = +img.dataset.i + 1;
    if (i < c.length) { img.dataset.i = i; img.src = c[i]; return; }
    img.hidden = true;
    const e = img.parentElement.querySelector(".emo"); if (e) e.hidden = false;
  };
  const claveGrupo = (p) => p.grupo || "p" + p.id;
  const baseGrupo = (p) => basesFoto(PRODUCTOS.filter((x) => claveGrupo(x) === claveGrupo(p)).sort((x, y) => x.id - y.id)[0]).join("|");
  const fotoHTML = (p, fb, alt) =>
    `<span class="emo" hidden>${p.emoji || "🐾"}</span><img src="${p.imagen || `img/${basesFoto(p)[0]}.${EXT[0]}`}" data-i="0" data-b="${basesFoto(p).join("|")}" data-fb="${fb}" data-im="${p.imagen || ""}" alt="${esc(alt)}" loading="lazy" onerror="fotoSiguiente(this)">`;

  /* ---------- Carrito ---------- */
  const leer = () => { try { return JSON.parse(localStorage.getItem("carrito") || "[]"); } catch (e) { return []; } };
  let carrito = leer().filter((c) => PRODUCTOS.some((p) => p.id === c.id));
  const prod = (id) => PRODUCTOS.find((p) => p.id === id);
  const nombreDe = (p) => (p.grupo ? p.base : p.nombre);
  const total = () => carrito.reduce((s, c) => s + (prod(c.id).precio || 0) * c.cant, 0);
  const cuantos = () => carrito.reduce((s, c) => s + c.cant, 0);
  function guardar() { localStorage.setItem("carrito", JSON.stringify(carrito)); pintar(); }
  function agregar(id) { const it = carrito.find((c) => c.id === id); it ? it.cant++ : carrito.push({ id, cant: 1 }); guardar(); }
  function cambiar(id, d) { const it = carrito.find((c) => c.id === id); if (!it) return; it.cant += d; carrito = carrito.filter((c) => c.cant > 0); guardar(); }
  function quitar(id) { carrito = carrito.filter((c) => c.id !== id); guardar(); }

  /* ---------- Pasos ---------- */
  let paso = 1, hecho = false;
  function irAPaso(n) {
    paso = n;
    [1, 2, 3].forEach((i) => { $("#paso" + i).hidden = i !== n; });
    document.querySelectorAll("#cpPasos li").forEach((li) => {
      const i = +li.dataset.p;
      li.classList.toggle("on", i === n); li.classList.toggle("hecho", i < n);
    });
    $("#cpIr").hidden = n !== 1;
    $("#cpMini").hidden = n === 1;
    window.scrollTo({ top: 0, behavior: "smooth" });
    pintar();
  }

  /* ---------- Pintar ---------- */
  const ICONO_QUITAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function pintar() {
    if (hecho) return;
    const hay = carrito.length > 0;
    $("#cpVacio").hidden = hay; $("#cpGrid").hidden = !hay; $("#cpPasos").hidden = !hay;
    $("#cpCuenta").textContent = hay ? `(${cuantos()} ${cuantos() === 1 ? "artículo" : "artículos"})` : "";
    if (!hay) return;

    $("#cpItems").innerHTML = carrito.map((c) => {
      const p = prod(c.id), n = nombreDe(p), sub = (p.precio || 0) * c.cant;
      const marca = [p.marca, p.categoria].filter(Boolean).join(" · ");
      return `<li class="cp-item">
        <div class="cart-foto lt-foto">${fotoHTML(p, baseGrupo(p), n)}</div>
        <div class="cp-info">
          ${marca ? `<span class="cp-marca">${esc(marca)}</span>` : ""}
          <span class="cp-nombre">${esc(n)}</span>
          ${p.grupo && p.etiqueta ? `<span class="cp-pres">${esc(p.etiqueta)}</span>` : ""}
          <span class="cp-unit">${soles(p.precio || 0)} c/u</span>
          <span class="cp-cant"><button data-a="-1" data-id="${p.id}" aria-label="Quitar uno">−</button><b>${c.cant}</b><button data-a="1" data-id="${p.id}" aria-label="Agregar uno">+</button></span>
        </div>
        <div class="cp-der">
          <strong class="cp-sub-item">${soles(sub)}</strong>
          <button class="cp-quitar" data-q="${p.id}" aria-label="Quitar ${esc(n)} del carrito">${ICONO_QUITAR} Quitar</button>
        </div>
      </li>`;
    }).join("");

    $("#cpLineaTxt").textContent = `Productos (${cuantos()})`;
    $("#cpSub").textContent = soles(total()); $("#cpTotal").textContent = soles(total());
    $("#cpMini").innerHTML = carrito.map((c) => { const p = prod(c.id); return `<li><span>${c.cant} × ${esc(nombreDe(p))}${p.grupo && p.etiqueta ? " · " + esc(p.etiqueta) : ""}</span><span>${soles((p.precio || 0) * c.cant)}</span></li>`; }).join("");
    pintarExtras();
  }

  $("#cpItems").addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]"), q = e.target.closest("[data-q]");
    if (b) cambiar(+b.dataset.id, +b.dataset.a); else if (q) quitar(+q.dataset.q);
  });

  /* ---------- Artículos adicionales (mismas reglas que antes) ---------- */
  const COMPLEMENTA = {
    "Comida seca": ["Premios", "Comida húmeda", "Juguetes", "Arenas"],
    "Comida húmeda": ["Comida seca", "Premios", "Juguetes", "Arenas"],
    "Premios": ["Comida seca", "Comida húmeda", "Juguetes"],
    "Arenas": ["Comida seca", "Comida húmeda", "Premios", "Juguetes"],
    "Juguetes": ["Premios", "Comida seca", "Comida húmeda"],
    "Aves": ["Aves"], "Conejos": ["Conejos"], "Farmacia": ["Farmacia", "Premios"],
  };
  const DIETA = /veterinary|prescription|renal|urinary|hepatic|gastro|sensitiv|metabolic|diabet/i;
  function sugerencias(max = 6) {
    const enCarrito = carrito.map((c) => prod(c.id)).filter(Boolean);
    const enGrupos = new Set(enCarrito.map(claveGrupo));
    const mascotas = new Set(enCarrito.map((p) => p.mascota).filter(Boolean));
    const secciones = new Set(enCarrito.map((p) => p.seccion));
    const marcas = new Set(enCarrito.map((p) => p.marca).filter((m) => m && m !== "Farmacia"));
    const grupos = new Map();
    PRODUCTOS.forEach((p) => { const k = claveGrupo(p); (grupos.get(k) || grupos.set(k, []).get(k)).push(p); });
    const cand = [];
    grupos.forEach((vs, k) => {
      if (enGrupos.has(k)) return;
      const p = vs.filter((v) => v.precio).sort((x, y) => x.precio - y.precio)[0];
      if (!p) return;
      let s = 0;
      if (p.mascota) s += mascotas.has(p.mascota) ? 4 : mascotas.size ? -6 : 0;
      if (enCarrito.some((c) => (COMPLEMENTA[c.seccion] || []).includes(p.seccion))) s += 3;
      else if (secciones.has(p.seccion)) s += 1;
      if (p.marca && marcas.has(p.marca)) s += 1.5;
      if (p.seccion === "Farmacia" && !secciones.has("Farmacia")) s -= 6;
      if (p.precio <= 35) s += 0.5; else if (p.precio > 60) s -= 3;
      if (DIETA.test(p.nombre) && !enCarrito.some((c) => DIETA.test(c.nombre))) s -= 8;
      if (s > 0) cand.push({ p, s });
    });
    cand.sort((x, y) => y.s - x.s || x.p.precio - y.p.precio || x.p.id - y.p.id);
    const elegidos = [], porSeccion = {};
    for (const c of cand) { if ((porSeccion[c.p.seccion] || 0) < 2 && elegidos.length < max) { elegidos.push(c.p); porSeccion[c.p.seccion] = (porSeccion[c.p.seccion] || 0) + 1; } }
    for (const c of cand) { if (elegidos.length < max && !elegidos.includes(c.p)) elegidos.push(c.p); }
    return elegidos;
  }
  let extras = null;   // se calculan una vez, para que la lista no cambie mientras el cliente agrega
  function pintarExtras() {
    if (extras === null) extras = sugerencias();
    $("#cpExtrasBox").hidden = paso !== 1 || !extras.length;
    $("#cpExtras").innerHTML = extras.map((p) => {
      const n = nombreDe(p), on = carrito.some((c) => c.id === p.id);
      const meta = [p.marca && p.marca !== "Farmacia" ? p.marca : "", p.grupo ? p.etiqueta : ""].filter(Boolean).join(" · ");
      return `<article class="ext-item">
        <div class="ext-foto">${fotoHTML(p, baseGrupo(p), n)}</div>
        <div class="ext-info"><span class="ext-nombre">${esc(n)}</span>${meta ? `<small class="ext-meta">${esc(meta)}</small>` : ""}<strong class="ext-precio">${soles(p.precio)}</strong></div>
        <button class="ext-btn${on ? " on" : ""}" type="button" data-id="${p.id}" aria-pressed="${on}">${on ? "✓ Agregado" : "Agregar"}</button>
      </article>`;
    }).join("");
  }
  $("#cpExtras").addEventListener("click", (e) => {
    const b = e.target.closest(".ext-btn"); if (!b) return;
    const id = +b.dataset.id;
    carrito.some((c) => c.id === id) ? quitar(id) : agregar(id);
  });

  /* ---------- Navegación entre pasos ---------- */
  $("#cpIr").addEventListener("click", () => { if (carrito.length) { irAPaso(2); $("#pgNombre").focus({ preventScroll: true }); } });
  $("#volver1").addEventListener("click", () => irAPaso(1));
  $("#volver2").addEventListener("click", () => irAPaso(2));

  /* ---------- Pago con Izipay ---------- */
  const KR_URL = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js";
  let krPromesa = null, pedido = null;
  const aviso = (sel, msg) => { const e = $(sel); e.textContent = msg || ""; e.hidden = !msg; };

  const alPagar = (data) => {
    (async () => {
      aviso("#pgError2", "");
      const ca = data.clientAnswer || {}, tx = (ca.transactions && ca.transactions[0]) || {};
      console.log("Izipay respondió:", ca.orderStatus, tx.detailedStatus || "", tx.errorMessage || "");
      try {
        const r = await fetch("/api/validar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: data.rawClientAnswer, hash: data.hash, hashKey: data.hashKey }) });
        const v = await r.json().catch(() => ({}));
        if (v.ok && v.estado === "PAID") return exito();
        if (!v.ok) {
          console.error("No se pudo verificar la firma del pago. Revisa IZIPAY_HMAC_KEY en Vercel.");
          return aviso("#pgError2", "No pudimos verificar tu pago (código F). Si te cobraron, escríbenos por WhatsApp.");
        }
        aviso("#pgError2", `El pago no se completó (estado: ${v.estado || "desconocido"}). Revisa los datos de tu tarjeta o prueba con otra.`);
      } catch (e) {
        aviso("#pgError2", "No pudimos confirmar tu pago (código R). Si te cobraron, escríbenos por WhatsApp.");
      }
    })();
    return false; // evita que la librería recargue la página
  };

  function exito() {
    const p = pedido;
    const msg = `Hola, acabo de pagar mi pedido ${p.orderId} en ${CONF.tienda}.\n\n${p.lineas.join("\n")}\n\nTotal: ${soles(p.total)}\nNombre: ${p.cliente.nombre}\nCelular: ${p.cliente.tel}\nEntrega: ${p.cliente.direccion}`;
    $("#pgPedido").textContent = p.orderId;
    $("#pgWa").href = `https://wa.me/${CONF.whatsapp}?text=${encodeURIComponent(msg)}`;
    hecho = true;
    carrito = []; localStorage.setItem("carrito", "[]");
    $("#cpGrid").hidden = true; $("#cpPasos").hidden = true; $("#cpVacio").hidden = true; $("#cpCuenta").textContent = "";
    $("#cpOk").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cargarKR = (clave) => krPromesa || (krPromesa = new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = KR_URL;
    s.setAttribute("kr-public-key", clave);
    s.setAttribute("kr-language", "es-ES");
    s.setAttribute("kr-post-url-success", location.origin + "/");
    s.onload = () => { if (!window.KR) { krPromesa = null; return no(new Error("KR")); } window.KR.onSubmit(alPagar); ok(window.KR); };
    s.onerror = () => { krPromesa = null; no(new Error("carga")); };
    document.head.appendChild(s);
  }));

  $("#pagoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!carrito.length) return;
    aviso("#pgError", "");
    const btn = $("#pagoForm button[type=submit]"), txt = btn.textContent;
    btn.disabled = true; btn.textContent = "Preparando el pago…";
    try {
      const d = Object.fromEntries(new FormData(e.target));
      const r = await fetch("/api/formtoken", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: carrito.map((c) => ({ id: c.id, cant: c.cant })), cliente: d }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo iniciar el pago. Inténtalo de nuevo.");
      const KR = await cargarKR(j.publicKey);
      pedido = { orderId: j.orderId, total: j.total, cliente: d, lineas: carrito.map((c) => `${c.cant} x ${prod(c.id).nombre}`) };
      irAPaso(3);
      // Orden importante: el contenedor debe estar vacío al configurar, y el formulario se dibuja UNA sola vez.
      const cont = $("#kr-contenedor");
      try { await KR.removeForms(); } catch (x) { /* aún no había formulario */ }
      cont.innerHTML = "";
      await KR.setFormConfig({ formToken: j.formToken, "kr-language": "es-ES" });
      cont.innerHTML = '<div class="kr-smart-form" kr-card-form-expanded></div>';
      await KR.renderElements("#kr-contenedor");
    } catch (err) {
      irAPaso(2);
      aviso("#pgError", err.message === "carga" || err.message === "KR" ? "No se pudo cargar el formulario de pago. Revisa tu conexión e inténtalo de nuevo." : err.message);
    } finally { btn.disabled = false; btn.textContent = txt; }
  });

  /* ---------- Inicio ---------- */
  irAPaso(1);
  window.scrollTo(0, 0);
})();
