// API privada del panel. Todo lo que modifica datos pasa por acá y exige
// una sesión válida. La contraseña vive en la variable de entorno
// ADMIN_PASSWORD de Netlify; nunca llega al navegador.
//
//   POST /api/admin/login    { password }  -> { token }
//   GET  /api/admin/session                -> { ok }
//   PUT  /api/admin/content  { site, projects, links } -> { ok, content }
//   POST /api/admin/upload   (imagen)      -> { url }

import {
  ValidationError,
  detectImageType,
  newMediaKey,
  passwordMatches,
  sanitizeContent,
  signToken,
  verifyToken,
} from "../lib/core.mts";
import { getBlobStore } from "../lib/store.mts";

const MAX_UPLOAD = 4 * 1024 * 1024;
const MAX_JSON = 300 * 1024;

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export default async (req: Request) => {
  const password = Netlify.env.get("ADMIN_PASSWORD");
  if (!password) {
    return reply({ error: "Falta configurar la variable ADMIN_PASSWORD en Netlify." }, 503);
  }
  const secret = Netlify.env.get("SESSION_SECRET") || password;

  const route = new URL(req.url).pathname.replace(/\/+$/, "").replace(/^\/api\/admin/, "");

  if (route === "/login" && req.method === "POST") {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // body inválido
    }
    if (!passwordMatches(body?.password, password)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return reply({ error: "Contraseña incorrecta." }, 401);
    }
    return reply({ token: signToken(secret) });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!verifyToken(secret, token)) {
    return reply({ error: "Sesión no válida. Ingresá de nuevo." }, 401);
  }

  if (route === "/session" && req.method === "GET") {
    return reply({ ok: true });
  }

  if (route === "/content" && req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_JSON) {
      return reply({ error: "El contenido es demasiado grande." }, 413);
    }
    try {
      const content = sanitizeContent(JSON.parse(text));
      await getBlobStore("content").setJSON("content", content);
      return reply({ ok: true, content });
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply({ error: err.message }, 400);
      }
      if (err instanceof SyntaxError) {
        return reply({ error: "Datos ilegibles." }, 400);
      }
      throw err;
    }
  }

  if (route === "/upload" && req.method === "POST") {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length === 0) {
      return reply({ error: "No llegó ninguna imagen." }, 400);
    }
    if (bytes.length > MAX_UPLOAD) {
      return reply({ error: "La imagen pesa más de 4 MB." }, 413);
    }
    const type = detectImageType(bytes);
    if (!type) {
      return reply({ error: "Formato no admitido. Usá JPG, PNG o WEBP." }, 400);
    }
    const key = newMediaKey(type.ext);
    await getBlobStore("media").set(key, bytes.buffer as ArrayBuffer);
    return reply({ url: "/media/" + key });
  }

  return reply({ error: "No encontrado." }, 404);
};

export const config = {
  path: "/api/admin/*",
};
