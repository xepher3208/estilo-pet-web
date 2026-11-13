// Utilidades compartidas por las funciones de pago. El guion bajo en el nombre evita que Vercel lo publique como endpoint.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let cache = null;
// Lee el catálogo real (js/productos.js) para calcular los montos en el servidor, nunca con lo que mande el navegador.
function catalogo() {
  if (cache) return cache;
  const candidatos = [path.join(process.cwd(), "js", "productos.js"), path.join(__dirname, "..", "js", "productos.js")];
  let src = null;
  for (const f of candidatos) { try { src = fs.readFileSync(f, "utf8"); break; } catch (e) { /* prueba el siguiente */ } }
  if (!src) throw new Error("No se encontró js/productos.js");
  cache = new Function(src + "\n;return PRODUCTOS;")();
  return cache;
}

// Firma HMAC-SHA-256 en hexadecimal, comparada en tiempo constante.
function firmaValida(texto, hash, clave) {
  if (!texto || !hash || !clave) return false;
  const calc = Buffer.from(crypto.createHmac("sha256", clave).update(String(texto)).digest("hex"));
  const recibido = Buffer.from(String(hash));
  return calc.length === recibido.length && crypto.timingSafeEqual(calc, recibido);
}

function leerJSON(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b && typeof b === "object" ? b : {};
}

module.exports = { catalogo, firmaValida, leerJSON };
