# Agência Nitro — site

Esta é a distribuição compilada do site da Agência Nitro (Vinext/Next).

## Implantação no Cloudflare Workers

- Repositório Git conectado: `kimbwjula-hub/nitro-site`
- Comando de build: deixar vazio (os arquivos já estão compilados)
- Comando de deploy: `npx wrangler deploy`
- Arquivo de configuração: `wrangler.json` na raiz
- Entry point: `dist/server/index.js`
- Assets públicos: `dist/client/`

O projeto implantado usa Workers, não Pages estático.
