// Lógica compartida del panel: sesiones firmadas y validación del contenido.
// No depende de Netlify, así que se puede probar por separado.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export class ValidationError extends Error {}

export const STATUSES = ["active", "development", "hidden"];

const MAX_PROJECTS = 50;
const MAX_LINKS = 30;

/* ---------- Sesión ---------- */

export function signToken(secret: string, days = 7): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + days * 86400000 })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return payload + "." + sig;
}

export function verifyToken(secret: string, token: string): boolean {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = createHmac("sha256", secret).update(parts[0]).digest("base64url");
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function passwordMatches(input: unknown, expected: string): boolean {
  if (typeof input !== "string" || !expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/* ---------- Imágenes ---------- */

export function detectImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  const is = (offset: number, sig: number[]) => sig.every((v, i) => bytes[offset + i] === v);
  if (bytes.length > 12) {
    if (is(0, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
    if (is(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
    if (is(0, [0x52, 0x49, 0x46, 0x46]) && is(8, [0x57, 0x45, 0x42, 0x50])) return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export function newMediaKey(ext: string): string {
  return Date.now().toString(36) + "-" + randomBytes(6).toString("hex") + "." + ext;
}

/* ---------- Validación de contenido ---------- */

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

function httpUrl(value: unknown, what: string): string {
  const s = str(value, 600);
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
  } catch {
    // cae al error de abajo
  }
  throw new ValidationError(`${what}: la dirección no es válida (tiene que empezar con https://).`);
}

function linkUrl(value: unknown, what: string): string {
  const s = str(value, 600);
  if (/^(mailto:|tel:)[^\s]+$/i.test(s)) return s;
  return httpUrl(s, what);
}

function imageUrl(value: unknown, what: string): string {
  const s = str(value, 600);
  if (!s) return "";
  if (/^\/media\/[a-z0-9-]+\.(jpg|png|webp)$/.test(s)) return s;
  return httpUrl(s, what);
}

function order(value: unknown, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(-9999, Math.min(9999, n)) : fallback;
}

function uniqueId(value: unknown, used: Set<string>, prefix: string): string {
  let id = str(value, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!id || used.has(id)) id = prefix + randomBytes(4).toString("hex");
  used.add(id);
  return id;
}

export function sanitizeContent(input: any) {
  if (!input || typeof input !== "object") throw new ValidationError("Contenido inválido.");

  const rawSite = input.site && typeof input.site === "object" ? input.site : {};
  const email = str(rawSite.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("El correo de contacto no es válido.");
  }
  const site = {
    heroTitle1: str(rawSite.heroTitle1, 120),
    heroTitle2: str(rawSite.heroTitle2, 120),
    heroText: str(rawSite.heroText, 600),
    servicesTitle: str(rawSite.servicesTitle, 160),
    servicesText: str(rawSite.servicesText, 600),
    heroImage: imageUrl(rawSite.heroImage, "Imagen principal"),
    whatsapp: digits(rawSite.whatsapp),
    email,
  };

  const rawProjects = Array.isArray(input.projects) ? input.projects : [];
  if (rawProjects.length > MAX_PROJECTS) throw new ValidationError(`Máximo ${MAX_PROJECTS} proyectos.`);
  const projectIds = new Set<string>();
  const projects = rawProjects.map((p: any, i: number) => {
    const name = str(p?.name, 80);
    if (!name) throw new ValidationError(`El proyecto ${i + 1} necesita un nombre.`);
    const status = STATUSES.includes(p?.status) ? p.status : "active";
    return {
      id: uniqueId(p?.id, projectIds, "p-"),
      name,
      category: str(p?.category, 60),
      tag: str(p?.tag, 60),
      symbol: str(p?.symbol, 6),
      description: str(p?.description, 300),
      detail: str(p?.detail, 2000),
      image: imageUrl(p?.image, `Imagen de «${name}»`),
      url: httpUrl(p?.url, `URL de «${name}»`),
      whatsapp: digits(p?.whatsapp),
      status,
      order: order(p?.order, i + 1),
    };
  });
  projects.sort((a: any, b: any) => a.order - b.order);

  const rawLinks = Array.isArray(input.links) ? input.links : [];
  if (rawLinks.length > MAX_LINKS) throw new ValidationError(`Máximo ${MAX_LINKS} enlaces.`);
  const linkIds = new Set<string>();
  const links = rawLinks.map((l: any, i: number) => {
    const label = str(l?.label, 60);
    if (!label) throw new ValidationError(`El enlace ${i + 1} necesita un texto.`);
    const url = linkUrl(l?.url, `Enlace «${label}»`);
    if (!url) throw new ValidationError(`El enlace «${label}» necesita una dirección.`);
    return { id: uniqueId(l?.id, linkIds, "l-"), label, url, order: order(l?.order, i + 1) };
  });
  links.sort((a: any, b: any) => a.order - b.order);

  return { site, projects, links, updatedAt: new Date().toISOString() };
}
