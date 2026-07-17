# Deploy em produção — Render + Neon

Guia passo a passo para publicar o Petrus Licitação. Nenhum destes passos pode
ser feito por mim diretamente — todos exigem acesso às suas contas.

## 1. Banco de dados (Neon)

1. Crie um projeto em [neon.com](https://neon.com) (plano **Launch**, não o Free — ver
   recomendação de planos no final).
2. Copie a *Connection String* (formato `postgresql://usuario:senha@host/banco`).
3. Garanta que ela termina com `?sslmode=require` (o Neon já inclui isso por padrão).
4. Guarde essa string — vai virar `DATABASE_URL` no Render.

## 2. Redis (fila do motor de prazos)

O motor de cobrança automática (BullMQ) depende de Redis. Crie-o direto no
Render, fora do blueprint:

1. No painel do Render: **New > Key Value**.
2. Escolha um plano pago (não o Free de 25 MB — ver recomendação no final).
3. Depois de criado, copie a **Internal Connection String**.

## 3. Armazenamento de documentos (Cloudflare R2)

O disco do Render **não é persistente** — qualquer redeploy apaga arquivos
enviados localmente. Decisão: **Cloudflare R2** (S3-compatível, sem custo de
saída de dados).

1. No painel da Cloudflare: **R2 Object Storage > Create bucket**. Nome
   sugerido: `brpetrus-documentos`.
2. Em **R2 > Manage API tokens > Create API token**, permissão
   *Object Read & Write*, restrita a esse bucket.
3. Anote os quatro valores que a Cloudflare mostra na criação do token:
   - **Access Key ID** → `S3_ACCESS_KEY`
   - **Secret Access Key** → `S3_SECRET_KEY`
   - **Endpoint** (formato `https://<account_id>.r2.cloudflarestorage.com`) → `S3_ENDPOINT`
4. Variáveis a configurar na API:
   - `S3_BUCKET=brpetrus-documentos`
   - `S3_REGION=auto` (valor exigido pelo R2, não é uma região real)
   - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `S3_ACCESS_KEY` / `S3_SECRET_KEY` do token gerado
   - `S3_FORCE_PATH_STYLE=true`

## 4. E-mail transacional (Resend)

As notificações automáticas (cobrança, escalonamento, vencimento de
documento/contrato) são enviadas por e-mail. Sem uma chave real do Resend, o
sistema usa um adaptador que só grava o conteúdo no log — nenhum e-mail sai.

1. Crie uma conta em [resend.com](https://resend.com), plano pago.
2. Verifique o domínio de envio (`nao-responda@seudominio.com.br` ou o que
   preferir — ajuste `EMAIL_FROM`).
3. Gere uma API key.

## 5. Deploy no Render

### Opção A — Blueprint (`render.yaml`, já no repositório)

1. No painel do Render: **New > Blueprint**, aponte para este repositório
   (branch `main`, depois que o PR #1 for mesclado).
2. O Render lê `render.yaml` e propõe dois serviços: `petrus-api` (Web
   Service) e `petrus-web` (Static Site). Confirme a criação.
3. Ele vai pedir os valores das variáveis marcadas `sync: false` — preencha
   com os dados dos passos 1–4 (deixe `VITE_API_URL` e `WEB_URL` em branco
   por enquanto, ainda não existem).

### Opção B — Criar os dois serviços manualmente

Se preferir não usar o blueprint: crie um **Web Service** (Node, root do
repo, build command e start command iguais aos do `render.yaml`) e um
**Static Site** (mesma lógica, `staticPublishPath: apps/web/dist`, com a
regra de rewrite `/* → /index.html` para o roteamento do React funcionar).

### Depois do primeiro deploy de cada serviço

1. Anote a URL pública de `petrus-api` (ex.: `https://petrus-api.onrender.com`).
2. Em `petrus-web`, defina `VITE_API_URL=https://petrus-api.onrender.com/api`
   e faça um novo deploy (é embutida no build, não dá pra trocar em runtime).
3. Anote a URL pública de `petrus-web` (ex.: `https://petrus-web.onrender.com`).
4. Em `petrus-api`, defina `WEB_URL=https://petrus-web.onrender.com` (usada
   pelo CORS) e redeploy.

A migração do banco (`prisma migrate deploy`) já roda automaticamente dentro
do `buildCommand` da API a cada deploy — não precisa rodar manualmente.

## 6. Criar o primeiro usuário Master

O sistema não tem cadastro público — todo usuário nasce de um Master/Admin.
No painel do Render, abra o **Shell** do serviço `petrus-api` já publicado e rode:

```bash
PETRUS_SEED_EMAIL="seu-email@escritorio.com.br" PETRUS_SEED_PASSWORD="uma-senha-forte" pnpm --filter @petrus/api prisma:seed
```

Troque a senha no primeiro login e ative 2FA (recomendado para Master/Admin).

## 7. Domínio próprio (opcional, recomendado)

Tanto o Web Service quanto o Static Site aceitam domínio customizado em
**Settings > Custom Domains** no Render. Aponte `app.seudominio.com.br` para
o `petrus-web` e `api.seudominio.com.br` para o `petrus-api`; depois ajuste
`VITE_API_URL` e `WEB_URL` para os domínios finais.

## Checklist antes de liberar para uso real

- [ ] `DATABASE_URL` (Neon) configurado e `prisma migrate deploy` rodou sem erro
- [ ] `REDIS_URL` (Render Key Value) configurado — teste a Central de Pendências
- [ ] Bucket S3/R2 configurado — teste um upload de documento e confirme que
      sobrevive a um redeploy
- [ ] `RESEND_API_KEY` configurado — teste uma cobrança manual
      (`POST /prazos/executar-agora` como Master) e confira o e-mail chegando
- [ ] `WEB_URL` e `VITE_API_URL` apontando um para o outro corretamente
- [ ] Primeiro usuário Master criado, senha trocada, 2FA ativado
- [ ] `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` gerados pelo Render
      (`generateValue: true` no blueprint) — nunca reaproveitar os valores de
      desenvolvimento
