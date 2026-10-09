-- Agência Nitro: tabela para armazenar contatos enviados pelo formulário.
-- Execute no console de um banco Cloudflare D1 da conta que hospeda o Worker nitro-site.
CREATE TABLE IF NOT EXISTS nitro_leads (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  whatsapp TEXT,
  service TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consent_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nitro_leads_created_at ON nitro_leads(created_at);
