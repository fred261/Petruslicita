# nfse-fortaleza

Robô de emissão de NFS-e no portal ISS da SEFIN de Fortaleza: loga com seu
usuário/senha, escolhe o CNPJ, escolhe o cliente já cadastrado no site,
preenche os campos da nota e — depois de você revisar e confirmar — emite.

Ferramentas usadas, todas gratuitas/open source: Node.js, TypeScript,
[Playwright](https://playwright.dev) (automação de navegador), SQLite +
[Prisma](https://www.prisma.io) (banco local). Roda inteiro na sua máquina,
sem custo, inclusive nos testes.

## ⚠️ Status atual: scaffold funcional, seletores do site ainda por mapear

O fluxo (login → escolher CNPJ → escolher cliente → preencher → revisar →
confirmar) já está todo implementado em `src/automation/`, mas os seletores
CSS/texto de cada tela do portal real (`src/automation/selectors.ts`) estão
como **placeholders** — não testei contra o site porque este ambiente não
tem acesso de rede a `iss.fortaleza.ce.gov.br`.

### O que preciso de você para terminar o mapeamento

Para cada uma destas telas, me mande **print de tela** (ideal: também o HTML
do elemento — botão direito > Inspecionar > Copiar > Copiar elemento),
**nunca com usuário/senha reais visíveis**:

1. Tela de login (e a URL exata)
2. Tela de seleção de CNPJ/empresa
3. Onde fica a opção "Emitir NFS-e" no menu
4. Tela de seleção do cliente/tomador já cadastrado (é busca? dropdown?)
5. Formulário da nota (todos os campos, nomes exatos, se é uma página só
   ou várias etapas)
6. Tela final de revisão + botão de confirmar
7. Tela de sucesso (onde aparece o número da nota / link do PDF)

Com isso eu preencho `src/automation/selectors.ts` e testamos de ponta a
ponta em modo semi-automático.

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

## Próximos passos conhecidos (TODO)

- Mapear `src/automation/selectors.ts` com os seletores reais (depende dos
  seus prints/HTML — ver seção acima).
- Ler a lista de clientes direto do portal em vez de cadastro manual
  (`cliente:add`), depois que soubermos como a tela de busca funciona.
- Guardar o `storageState` do Playwright (sessão logada) pra não precisar
  logar do zero toda vez, se o portal permitir.
- Alertas por e-mail/WhatsApp quando uma emissão falhar em modo automático
  (hoje só fica registrado como `FALHOU` no banco, com a mensagem de erro).
