// Sirve las imágenes subidas desde el panel: /media/<archivo>

import { getBlobStore } from "../lib/store.mts";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export default async (req: Request) => {
  const key = new URL(req.url).pathname.replace(/^\/media\//, "");
  const match = /^[a-z0-9-]{8,60}\.(jpg|png|webp)$/.exec(key);

  if (!match) {
    return new Response("No encontrado", { status: 404 });
  }

  const data = await getBlobStore("media").get(key, { type: "arrayBuffer" });

  if (!data) {
    return new Response("No encontrado", { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": TYPES[match[1]],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

export const config = {
  path: "/media/*",
};
