// Notificación instantánea (IPN): Izipay llama a esta dirección al terminar cada pago.
// Registra en Vercel (Logs) el resultado verificado. Configúrala en el Back Office: Reglas de notificaciones.
const { firmaValida } = require("./_util");

module.exports = (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  let b = req.body;
  if (typeof b === "string") b = Object.fromEntries(new URLSearchParams(b));
  b = b || {};
  const answer = b["kr-answer"], hash = b["kr-hash"];
  if (!answer || !hash) return res.status(400).send("Bad request");
  // En la IPN la firma se calcula con la contraseña; en el retorno al navegador, con la clave HMAC.
  const clave = b["kr-hash-key"] === "password" ? process.env.IZIPAY_PASSWORD : process.env.IZIPAY_HMAC_KEY;
  if (!firmaValida(answer, hash, clave)) return res.status(400).send("Invalid signature");
  let a = {};
  try { a = JSON.parse(answer); } catch (e) { /* respuesta no JSON */ }
  console.log("IPN verificada · pedido:", a.orderDetails && a.orderDetails.orderId, "· estado:", a.orderStatus);
  return res.status(200).send("OK! OrderStatus is " + (a.orderStatus || "UNKNOWN"));
};
