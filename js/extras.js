/* Extras: nieve navideña y Libro de Reclamaciones.
   Para quitar la Navidad: en index.html cambia <body class="navidad"> por <body>. */
(function () {
  "use strict";
  // Completa estos datos del proveedor (aparecen en la hoja de reclamación)
  const CONF = { ruc: "", whatsapp: "51937678433", tienda: "Estilo Pet", direccion: "Av. Elmer Faucett 182, Tda. A1, San Miguel" };
  const $ = (s) => document.querySelector(s);

  /* ---- Nieve que flota por toda la página (solo con body.navidad y si no se pidió reducir animaciones) ---- */
  // Si pones true, la nieve se apaga en equipos con "reducir animaciones" activado (más accesible, pero muchos Windows lo tienen activado y no verías nada).
  const NIEVE_RESPETA_MOVIMIENTO_REDUCIDO = false;
  if (document.body.classList.contains("navidad") && !(NIEVE_RESPETA_MOVIMIENTO_REDUCIDO && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    const capa = document.createElement("div");
    capa.className = "nieve"; capa.setAttribute("aria-hidden", "true");
    const cuantos = matchMedia("(max-width: 700px)").matches ? 12 : 24;
    for (let i = 0; i < cuantos; i++) {
      const s = document.createElement("span");
      s.className = "copo"; s.textContent = "❄";
      s.style.cssText = `left:${Math.random() * 100}%;font-size:${10 + Math.random() * 14}px;--dx:${(Math.random() * 60 - 30).toFixed(0)}px;animation-duration:${11 + Math.random() * 10}s;animation-delay:${-Math.random() * 20}s`;
      capa.appendChild(s);
    }
    document.body.appendChild(capa);
  }

  /* ---- Logos de marcas: se centran, se escalan para caber dentro del círculo y el círculo toma el color de fondo del logo ---- */
  const RADIO_LOGO = 57; // px: cuánto del círculo (radio 66) puede ocupar el contenido del logo
  function analizarLogo(img) {
    try {
      const nw = img.naturalWidth, nh = img.naturalHeight;
      if (!nw || !nh) return null;
      const k = 100 / Math.max(nw, nh), W = Math.max(1, Math.round(nw * k)), H = Math.max(1, Math.round(nh * k));
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0, W, H);
      const d = cx.getImageData(0, 0, W, H).data;
      // 1) Fondo = color que más se repite en el borde de la imagen (si el borde es transparente, no hay fondo)
      const cubos = new Map(); let total = 0, opacos = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (x > 1 && y > 1 && x < W - 2 && y < H - 2) continue;
        const i = (y * W + x) * 4; total++;
        if (d[i + 3] < 200) continue;
        opacos++;
        const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
        const o = cubos.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        o.n++; o.r += d[i]; o.g += d[i + 1]; o.b += d[i + 2]; cubos.set(key, o);
      }
      let bg = null;
      if (opacos / total >= 0.6) {
        let m = null; cubos.forEach((o) => { if (!m || o.n > m.n) m = o; });
        bg = [m.r / m.n, m.g / m.n, m.b / m.n];
      }
      // 2) Contenido = píxeles que no son fondo; se mide su centro y su punto más lejano
      let x0 = W, y0 = H, x1 = -1, y1 = -1; const pts = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] < 40) continue;
        if (bg && Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]) < 60) continue;
        pts.push(x, y);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) return null;
      const mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2;
      let md = 0;
      for (let n = 0; n < pts.length; n += 2) md = Math.max(md, Math.hypot(pts[n] + 0.5 - mx, pts[n + 1] + 0.5 - my));
      md += 1;
      const blanco = bg && bg[0] > 238 && bg[1] > 238 && bg[2] > 238;
      return { color: bg && !blanco ? `rgb(${Math.round(bg[0])},${Math.round(bg[1])},${Math.round(bg[2])})` : null, mx: mx / k, my: my / k, md: md / k, nw, nh };
    } catch (e) { return null; } // si el navegador no deja leer la imagen (por ejemplo abierta con doble clic), queda el ajuste básico de CSS
  }
  function pintarChapa(img) {
    const chapa = img.closest(".marca-chapa");
    if (!chapa || !img.naturalWidth) return;
    chapa.classList.add("con-logo");
    const r = analizarLogo(img);
    chapa.style.background = (r && r.color) || "#fff";
    chapa.style.borderColor = (r && r.color) || "#e3e3e3";
    if (!r) return;
    const s = RADIO_LOGO / r.md;
    img.style.cssText = `inset:auto;left:50%;top:50%;max-width:none;object-fit:fill;width:${r.nw * s}px;height:${r.nh * s}px;margin-left:${-r.mx * s}px;margin-top:${-r.my * s}px`;
  }
  document.addEventListener("load", (e) => { if (e.target.tagName === "IMG") pintarChapa(e.target); }, true);
  document.querySelectorAll(".marca-chapa img").forEach((im) => { if (im.complete) pintarChapa(im); });

  /* ---- Pago con Izipay (formulario incrustado) ----
     1) /api/formtoken crea el pago en el servidor y devuelve un formToken  2) se muestra el formulario de tarjeta
     3) al pagar, /api/validar comprueba la firma de la respuesta antes de dar el pago por bueno. */
  const pago = $("#pago");
  if (pago) {
    const KR_URL = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js";
    let krPromesa = null, pedido = null;
    const mostrar = (paso) => { $("#pagoForm").hidden = paso !== "datos"; $("#pagoTarjeta").hidden = paso !== "tarjeta"; $("#pagoOk").hidden = paso !== "ok"; pago.scrollTop = 0; };
    const aviso = (sel, msg) => { const e = $(sel); e.textContent = msg || ""; e.hidden = !msg; };
    const cerrarPago = () => { pago.hidden = true; document.body.style.overflow = ""; };

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

    const exito = () => {
      const p = pedido;
      const msg = `Hola, acabo de pagar mi pedido ${p.orderId} en ${CONF.tienda}.\n\n${p.lineas.join("\n")}\n\nTotal: ${soles(p.total)}\nNombre: ${p.cliente.nombre}\nCelular: ${p.cliente.tel}\nEntrega: ${p.cliente.direccion}`;
      $("#pgPedido").textContent = p.orderId;
      $("#pgWa").href = `https://wa.me/${CONF.whatsapp}?text=${encodeURIComponent(msg)}`;
      vaciarCarrito();
      mostrar("ok");
    };

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

    window.abrirPago = () => {
      if (!carrito.length) return;
      const total = carrito.reduce((s, c) => s + PRODUCTOS.find((p) => p.id === c.id).precio * c.cant, 0);
      $("#pgTotal").textContent = soles(total);
      $("#panel").hidden = true;
      aviso("#pgError", ""); aviso("#pgError2", "");
      mostrar("datos");
      pago.hidden = false; document.body.style.overflow = "hidden";
      $("#pgNombre").focus();
    };

    $("#pagoForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      aviso("#pgError", "");
      const btn = $("#pagoForm button[type=submit]"), txt = btn.textContent;
      btn.disabled = true; btn.textContent = "Preparando el pago…";
      try {
        const d = Object.fromEntries(new FormData(e.target));
        const r = await fetch("/api/formtoken", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: carrito.map((c) => ({ id: c.id, cant: c.cant })), cliente: d }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "No se pudo iniciar el pago. Inténtalo de nuevo.");
        const KR = await cargarKR(j.publicKey);
        pedido = { orderId: j.orderId, total: j.total, cliente: d, lineas: carrito.map((c) => `${c.cant} x ${PRODUCTOS.find((p) => p.id === c.id).nombre}`) };
        mostrar("tarjeta");
        // Orden importante: el contenedor debe estar vacío al configurar, y el formulario se dibuja UNA sola vez.
        const cont = $("#kr-contenedor");
        try { await KR.removeForms(); } catch (x) { /* aún no había formulario */ }
        cont.innerHTML = "";
        await KR.setFormConfig({ formToken: j.formToken, "kr-language": "es-ES" });
        cont.innerHTML = '<div class="kr-smart-form" kr-card-form-expanded></div>';
        await KR.renderElements("#kr-contenedor");
      } catch (err) {
        mostrar("datos");
        aviso("#pgError", err.message === "carga" || err.message === "KR" ? "No se pudo cargar el formulario de pago. Revisa tu conexión e inténtalo de nuevo." : err.message);
      } finally { btn.disabled = false; btn.textContent = txt; }
    });
    $("#cerrarPago").addEventListener("click", cerrarPago);
    $("#pgCerrar2").addEventListener("click", cerrarPago);
  }

  /* ---- Libro de Reclamaciones ---- */
  const modal = $("#reclamo"), form = $("#reclamoForm"), ok = $("#reclamoOk");
  if (!modal) return;
  if (CONF.ruc) { $("#recRuc").textContent = " · RUC " + CONF.ruc; $("#rcRuc").textContent = " · RUC " + CONF.ruc; }

  const abrir = () => { form.hidden = false; ok.hidden = true; modal.hidden = false; document.body.style.overflow = "hidden"; modal.scrollTop = 0; $("#rcNombre").focus(); };
  const cerrar = () => { modal.hidden = true; document.body.style.overflow = ""; };
  $("#abrirReclamo").addEventListener("click", abrir);
  $("#cerrarReclamo").addEventListener("click", cerrar);
  modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) cerrar(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const n = new Date(), p = (x) => String(x).padStart(2, "0");
    const cod = `RC-${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}-${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
    const fecha = `${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()} ${p(n.getHours())}:${p(n.getMinutes())}`;
    const t = (v) => (v || "").trim();
    const texto = [
      `LIBRO DE RECLAMACIONES - ${CONF.tienda.toUpperCase()}`,
      `N.º: ${cod}`,
      `Fecha: ${fecha}`,
      `Proveedor: ${CONF.tienda}${CONF.ruc ? " · RUC " + CONF.ruc : ""} · ${CONF.direccion}`,
      "",
      "1. DATOS DEL CONSUMIDOR",
      `Nombre: ${t(d.nombre)}`,
      `Documento: ${d.tipoDoc} ${t(d.doc)}`,
      `Teléfono: ${t(d.tel)}`,
      `Correo: ${t(d.email)}`,
      `Domicilio: ${t(d.domicilio) || "-"}`,
      "",
      "2. BIEN CONTRATADO",
      `Tipo: ${d.bien}`,
      `Descripción: ${t(d.descBien)}`,
      `Monto: ${t(d.monto) ? "S/ " + t(d.monto) : "-"}`,
      "",
      "3. DETALLE",
      `Tipo: ${d.tipo}`,
      `Detalle: ${t(d.detalle)}`,
      `Pedido del consumidor: ${t(d.pedido)}`,
    ].join("\n");
    $("#constancia").textContent = texto;
    const url = `https://wa.me/${CONF.whatsapp}?text=${encodeURIComponent(texto)}`;
    $("#rcWa").href = url;
    form.hidden = true; ok.hidden = false; modal.scrollTop = 0;
    form.reset();
    window.open(url, "_blank", "noopener");
  });

  $("#rcCopiar").addEventListener("click", (e) => {
    const b = e.currentTarget;
    navigator.clipboard.writeText($("#constancia").textContent).then(() => { b.textContent = "¡Copiada!"; setTimeout(() => (b.textContent = "Copiar hoja"), 2000); });
  });
})();
