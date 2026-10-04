// Acceso al almacenamiento (Netlify Blobs).
// En producción se usa el almacén global del sitio; en vistas previas y
// ramas se usa uno aislado, para no mezclar datos de prueba con los reales.

import { getDeployStore, getStore } from "@netlify/blobs";

export function getBlobStore(name: string) {
  if (Netlify.context?.deploy?.context === "production") {
    return getStore({ name, consistency: "strong" });
  }
  return getDeployStore(name);
}
