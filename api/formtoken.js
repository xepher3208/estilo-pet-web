// Crea el pago en Izipay (Charge/CreatePayment) y devuelve el formToken que muestra el formulario de tarjeta.
// El monto se calcula AQUÍ con los precios de js/productos.js. Las claves están en las variables de entorno de Vercel.
const { catalogo, leerJSON } = require("./_util");

const API = "https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment";
const limpiar = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { IZIPAY_USER: usuario, IZIPAY_PASSWORD: clave, IZIPAY_PUBLIC_KEY: publica } = process.env;
  if (!usuario || !clave || !publica) {
    console.error("Faltan variables de entorno de Izipay");
    return res.status(500).json({ error: "El pago no está configurado todavía." });
  }

  const body = leerJSON(req);
  const c = body.cliente || {};
  const nombre = limpiar(c.nombre, 60), email = limpiar(c.email, 80), tel = limpiar(c.tel, 20), direccion = limpiar(c.direccion, 150);
  if (nombre.length < 3) return res.status(400).json({ error: "Escribe tus nombres y apellidos." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: "Escribe un correo válido." });
  if (!/^\+?[0-9 ]{6,20}$/.test(tel)) return res.status(400).json({ error: "Escribe un celular válido." });
  if (direccion.length < 3) return res.status(400).json({ error: "Escribe tu dirección de entrega o 'Recojo en tienda'." });

  // Total real en céntimos
  const items = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  if (!items.length) return res.status(400).json({ error: "Tu carrito está vacío." });
  let productos;
  try { productos = catalogo(); } catch (e) { console.error(e); return res.status(500).json({ error: "No se pudo leer el catálogo." }); }
  let centimos = 0;
  for (const it of items) {
    const id = Number(it.id), cant = Number(it.cant);
    const p = productos.find((x) => x.id === id);
    if (!p || typeof p.precio !== "number" || p.precio <= 0 || !Number.isInteger(cant) || cant < 1 || cant > 99) {
      return res.status(400).json({ error: "Hay un producto del carrito que no se puede comprar. Revisa tu carrito." });
    }
    centimos += Math.round(p.precio * 100) * cant;
  }
  if (centimos < 100) return res.status(400).json({ error: "El monto es demasiado bajo." });

  const orderId = "EP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const payload = {
    amount: centimos,
    currency: "PEN",
    orderId,
    customer: { email, billingDetails: { firstName: nombre, phoneNumber: tel, address: direccion } },
  };

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(usuario + ":" + clave).toString("base64") },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (j.status !== "SUCCESS" || !j.answer || !j.answer.formToken) {
      console.error("CreatePayment falló:", j.answer && j.answer.errorCode, j.answer && j.answer.errorMessage);
      return res.status(502).json({ error: "No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos." });
    }
    return res.status(200).json({ formToken: j.answer.formToken, publicKey: publica, orderId, total: centimos / 100 });
  } catch (e) {
    console.error("Error llamando a Izipay:", e);
    return res.status(502).json({ error: "No pudimos conectar con la pasarela de pago." });
  }
};
