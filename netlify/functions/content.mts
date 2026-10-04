// Contenido público del sitio. Lo lee la página principal y el panel.
// Si todavía no se guardó nada desde el panel, responde 404 y el sitio
// usa data/content.json (los datos iniciales).

import { getBlobStore } from "../lib/store.mts";

export default async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Método no permitido", { status: 405 });
  }

  const store = getBlobStore("content");
  const data = await store.get("content", { type: "json" });

  if (!data) {
    return Response.json(
      { error: "Todavía no hay contenido guardado." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(data, { headers: { "Cache-Control": "no-cache" } });
};

export const config = {
  path: "/api/content",
};
