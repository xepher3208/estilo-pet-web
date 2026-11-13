// Verifica la firma (kr-hash) de la respuesta que recibe el navegador tras pagar, con la clave HMAC-SHA-256.
const { firmaValida, leerJSON } = require("./_util");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const { answer, hash } = leerJSON(req);
  if (!firmaValida(answer, hash, process.env.IZIPAY_HMAC_KEY)) return res.status(400).json({ ok: false });
  let a;
  try { a = JSON.parse(answer); } catch (e) { return res.status(400).json({ ok: false }); }
  const d = a.orderDetails || {};
  return res.status(200).json({ ok: true, estado: a.orderStatus, orderId: d.orderId, monto: d.orderTotalAmount, moneda: d.orderCurrency });
};
