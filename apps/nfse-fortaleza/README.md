# nfse-fortaleza

Robô de emissão de NFS-e no portal ISS da SEFIN de Fortaleza: loga com seu
usuário/senha, escolhe o CNPJ, escolhe o cliente já cadastrado no site,
preenche os campos da nota e — depois de você revisar e confirmar — emite.

Ferramentas usadas, todas gratuitas/open source: Node.js, TypeScript,
[Playwright](https://playwright.dev) (automação de navegador), SQLite +
[Prisma](https://www.prisma.io) (banco local). Roda inteiro na sua máquina,
sem custo, inclusive nos testes.

## ⚠️ Status atual: seletores mapeados, falta o primeiro teste real ponta a ponta

O fluxo completo (login → escolher CNPJ → escolher cliente → preencher →
validar → confirmar → emitir) está implementado em `src/automation/` e os
seletores reais do portal (`src/automation/selectors.ts`) já foram mapeados
a partir de HTML de telas reais do site (inclusive uma emissão real de
teste). Build, typecheck e testes unitários passam.

O que **ainda não foi validado** é rodar o robô de ponta a ponta de verdade
(este ambiente de desenvolvimento não tem acesso de rede a
`iss.fortaleza.ce.gov.br`) — isso só dá pra fazer na sua máquina. Veja
"Como rodar" abaixo e o roteiro de teste em modo semi-automático.

Pontos ainda em aberto (não bloqueiam o teste, mas valem nota):

- Mensagem exata de erro de login inválido não foi confirmada.
- A extração do número da nota na tela final é best-effort (ver
  `TELA_RESULTADO_SELECTORS` em `selectors.ts`) — a fonte de verdade
  continua sendo o próprio portal, em "Consultar NFS-e".

## Como rodar

```bash
cd apps/nfse-fortaleza
pnpm install
pnpm playwright:install     # baixa o navegador do Playwright (uma vez só)
cp .env.example .env
# Gere e cole uma chave em NFSE_MASTER_KEY:
openssl rand -base64 32
pnpm prisma:migrate          # cria o banco local (dev.db)
```

### Cadastrar uma empresa (CNPJ + login do portal)

```bash
pnpm cli empresa:add
```

As credenciais ficam **criptografadas** no banco local (AES-256-GCM,
`src/crypto/secret-box.ts`) — nunca em texto puro.

### Cadastrar um cliente (por enquanto, manual — ver TODO abaixo)

```bash
pnpm cli cliente:add --empresa "meu-apelido"
```

### Emitir uma nota

```bash
pnpm cli nota:emitir \
  --empresa "meu-apelido" \
  --cliente "Nome do Cliente" \
  --valor 1500.00 \
  --objeto "Descrição do serviço prestado" \
  --aliquota 5
```

Por padrão roda em **modo semi-automático**: o robô preenche tudo, tira um
print da tela de revisão, deixa o navegador aberto pra você olhar, e só
clica em "Emitir" depois que você confirmar `s` no terminal. Nada é enviado
ao portal sem essa confirmação explícita.

### Modo automático (depois que você validar bem o fluxo)

```bash
pnpm cli nota:emitir --empresa "..." --cliente "..." --valor 1500 --objeto "..." --automatico
```

Só funciona se a empresa foi cadastrada com "liberar modo automático" = sim
(ou ajuste depois via banco/`permiteModoAutomatico`). Mesmo automático, o
robô **nunca inventa valores** — todo campo da nota precisa ter sido
passado explicitamente no comando.

## Roteiro do primeiro teste real (rode isso na sua máquina)

Este ambiente de desenvolvimento não alcança `iss.fortaleza.ce.gov.br`, então
este primeiro teste ponta a ponta precisa ser feito por você, localmente.
Faça em modo semi-automático (é o padrão) e com o navegador **visível**
(`NFSE_HEADLESS=false` no `.env`, que também é o padrão) pra acompanhar cada
passo lado a lado com a janela do robô.

1. Siga "Como rodar" acima até `pnpm prisma:migrate`.
2. Cadastre a empresa de verdade (CNPJ 68.515.819/0001-25, F. Martins
   Consultoria e Serviços LTDA) com seu usuário/senha reais do portal:
   ```bash
   pnpm cli empresa:add
   ```
   Confirme "não" para "liberar modo automático" por enquanto.
3. Cadastre o cliente que você já usou no teste manual (KBM Representações
   e Comércio de Gêneros Alimentícios LTDA), com o nome **exatamente** como
   aparece no portal:
   ```bash
   pnpm cli cliente:add --empresa "<apelido-que-você-deu>"
   ```
4. Rode uma emissão de valor baixo (ideal: não repetir o mesmo teste de
   R$ 15.000,00 — use algo simbólico se for só validar o fluxo, ou o valor
   real se já for a nota que você precisa emitir mesmo — lembre que emitir
   é irreversível e tem efeito tributário real):
   ```bash
   pnpm cli nota:emitir \
     --empresa "<apelido-que-você-deu>" \
     --cliente "KBM Representações e Comércio de Gêneros Alimentícios LTDA" \
     --valor 1.00 \
     --objeto "SERVIÇOS COMBINADOS DE ESCRITÓRIO E APOIO ADMINISTRATIVO" \
     --observacoes "teste de automação"
   ```
   O `--objeto` precisa bater com o texto exato de uma opção do dropdown de
   CNAE no portal (é o campo `itemListaServico` internamente).
5. Acompanhe a janela do Chromium que abre. Nos pontos em que o robô parar
   pra confirmação no terminal, **compare com o que está na tela real**
   antes de digitar `s`.
6. Se algum passo falhar (seletor não encontrado, timeout, etc.), a
   mensagem de erro no terminal deve dizer exatamente onde parou — me
   manda essa mensagem (e, se puder, o HTML da tela naquele ponto) que eu
   ajusto o seletor.
7. Se tudo passar até o fim, confira a nota emitida direto no portal, em
   "Consultar NFS-e", antes de considerar o robô confiável pra uso real.

Só depois de um teste real bem-sucedido faz sentido cogitar liberar o modo
automático para essa empresa.

## Próximos passos conhecidos (TODO)

- Mapear `src/automation/selectors.ts` com os seletores reais (depende dos
  seus prints/HTML — ver seção acima).
- Ler a lista de clientes direto do portal em vez de cadastro manual
  (`cliente:add`), depois que soubermos como a tela de busca funciona.
- Guardar o `storageState` do Playwright (sessão logada) pra não precisar
  logar do zero toda vez, se o portal permitir.
- Alertas por e-mail/WhatsApp quando uma emissão falhar em modo automático
  (hoje só fica registrado como `FALHOU` no banco, com a mensagem de erro).
