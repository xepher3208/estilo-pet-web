// Verifica la firma (kr-hash) de la respuesta que recibe el navegador tras pagar, con la clave HMAC-SHA-256.
const { firmaValida, leerJSON } = require("./_util");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const { answer, hash, hashKey } = leerJSON(req);
  // Izipay indica con qué clave firmó: "password" (contraseña) o, por defecto, la clave HMAC-SHA-256.
  const clave = hashKey === "password" ? process.env.IZIPAY_PASSWORD : process.env.IZIPAY_HMAC_KEY;
  if (!firmaValida(answer, hash, clave)) {
    console.error("validar: firma inválida · hashKey:", hashKey, "· clave configurada en Vercel:", clave ? "sí" : "NO");
    return res.status(400).json({ ok: false });
  }
  let a;
  try { a = JSON.parse(answer); } catch (e) { return res.status(400).json({ ok: false }); }
  const d = a.orderDetails || {};
  return res.status(200).json({ ok: true, estado: a.orderStatus, orderId: d.orderId, monto: d.orderTotalAmount, moneda: d.orderCurrency });
};
