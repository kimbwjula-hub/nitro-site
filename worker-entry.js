import site from "./dist/server/index.js";

// Public lead capture endpoint for the Agência Nitro 3-step contact form.
// The form is intentionally unchanged; only its server-side persistence changes.
const SERVICE_OPTIONS = new Set(["propagandas", "site", "ambos"]);
const CONSENT_VERSION = "nitro-atendimento-v2";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body, status) => Response.json(body, {
  status,
  headers: {"Cache-Control": "no-store"},
});
const clean = (value) => value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();

async function receiveLead(request, env) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return reply({error: "Pedido não autorizado."}, 403);
      }
    } catch { return reply({error: "Pedido não autorizado."}, 403); }
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return reply({error: "Pedido não autorizado."}, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({error: "Pedido inválido."}, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 6000) {
    return reply({error: "Pedido muito grande."}, 413);
  }

  let data;
  try {
    const body = await request.text();
    if (body.length > 6000) return reply({error: "Pedido muito grande."}, 413);
    data = JSON.parse(body);
  } catch { return reply({error: "Pedido inválido."}, 400); }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return reply({error: "Pedido inválido."}, 400);
  }
  if (["name", "company", "service", "id", "consentVersion"].some(k => typeof data[k] !== "string")) {
    return reply({error: "Preencha todas as informações."}, 400);
  }
  if (!UUID_V4.test(data.id)) {
    return reply({error: "Recarregue a página e tente novamente."}, 400);
  }
  if (data.consent !== true || data.consentVersion !== CONSENT_VERSION) {
    return reply({error: "É necessário concordar com o uso dos dados para o atendimento."}, 400);
  }
  const name = clean(data.name);
  const company = clean(data.company);
  if (name.length < 2 || name.length > 120) {
    return reply({error: "Conta pra gente seu nome, com pelo menos 2 caracteres.", field: 0}, 400);
  }
  if (company.length < 2 || company.length > 160) {
    return reply({error: "Digite o nome da sua empresa, com pelo menos 2 caracteres.", field: 1}, 400);
  }
  if (!SERVICE_OPTIONS.has(data.service)) {
    return reply({error: "Escolha uma das três opções para continuar.", field: 2}, 400);
  }
  // Spam honeypot already used by the form's previous backend.
  if (typeof data.extraInfo === "string" && data.extraInfo) {
    return reply({accepted: true}, 202);
  }
  try {
    const namespace = env.NITRO_LEADS_STORE;
    if (!namespace) throw new Error("Lead storage binding is missing");
    const object = namespace.get(namespace.idFromName("nitro-leads-v1"));
    const saved = await object.fetch("https://nitro.internal/save", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({id: data.id, name, company, whatsapp: null,
        service: data.service, createdAt: new Date().toISOString(),
        consentVersion: CONSENT_VERSION}),
    });
    if (!saved.ok) throw new Error("Failed to save lead");
    return reply({accepted: true}, 201);
  } catch (error) {
    console.error("Nitro lead save error:", error);
    return reply({error: "Não foi possível enviar agora. Suas respostas continuam aqui; tente novamente."}, 503);
  }
}

// SQLite-backed Durable Object: Cloudflare provisions persistent storage
// automatically on deployment, without a separate D1 database ID.
export class NitroLeadsStore {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (request.method !== "POST") return new Response("Method not allowed", {status: 405});
    let lead;
    try { lead = await request.json(); }
    catch { return new Response("Invalid JSON", {status: 400}); }
    if (!lead || typeof lead !== "object" || !UUID_V4.test(lead.id || "") ||
        typeof lead.name !== "string" || typeof lead.company !== "string" ||
        !SERVICE_OPTIONS.has(lead.service) || lead.consentVersion !== CONSENT_VERSION) {
      return new Response("Invalid data", {status: 400});
    }
    const key = "lead:" + lead.id;
    if (!(await this.state.storage.get(key))) {
      await this.state.storage.put(key, lead);
    }
    return reply({accepted: true}, 201);
  }
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/api/leads" && request.method === "POST") {
      return receiveLead(request, env);
    }
    return site.fetch(request, env, ctx);
  }
};
