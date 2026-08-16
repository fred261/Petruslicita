/**
 * =====================================================================
 * MAPA DE SELETORES DO PORTAL ISS SEFIN FORTALEZA — AINDA NÃO PREENCHIDO
 * =====================================================================
 *
 * Tudo aqui é placeholder. Antes de rodar o robô de verdade, precisamos
 * mapear cada tela real do site. Para isso, me mande (print de tela ou,
 * melhor ainda, o HTML — botão direito > "Inspecionar" > copiar o
 * elemento) de cada uma destas telas, NUNCA com usuário/senha visíveis:
 *
 *   1. [OK] URL base, botão "Fazer login" e formulário de usuário/senha
 *      (Keycloak, idp2.sefin.fortaleza.ce.gov.br) mapeados. Falta só saber
 *      como fica a tela quando o login FALHA (mensagem de erro exata) —
 *      se puder, tente logar com senha errada de propósito uma vez e me
 *      manda o HTML/print da mensagem que aparece.
 *   2. [OK] Modal "Selecione Inscrição" mapeado (ver SELECAO_EMPRESA_SELECTORS)
 *   3. [OK] Home com os 4 "hot-links", incluindo "Emitir NFS-e", mapeada
 *   4. Tela de seleção do cliente/tomador já cadastrado (busca? dropdown?) —
 *      próximo passo: clique em "Emitir NFS-e" e me manda o HTML da tela
 *      seguinte
 *   5. Formulário da nota (nomes exatos de cada campo: discriminação do
 *      serviço, valor, alíquota, item da lista de serviço, data de
 *      competência, etc. — e a ordem/paginação entre eles, se houver)
 *   6. Tela final de revisão + botão de confirmar/emitir
 *   7. Tela de sucesso (onde aparece o número da nota emitida / link do PDF)
 *
 * Depois que eu tiver isso, preencho os seletores abaixo e o robô fica
 * funcional de ponta a ponta.
 */

// CONFIRMADO: o portal usa OAuth2 (não é usuário/senha na própria página).
// A página inicial só tem um botão "Fazer login" que aponta para
// /grpfor/oauth2/login — isso redireciona para um provedor de identidade
// separado (bem provável gov.br), onde ficam os campos reais de
// usuário/senha. TODO: mapear a URL base do portal e a tela pós-redirect.
export const PORTAL = {
  // CONFIRMADO. Nota: o jsessionid/cid do link original são parâmetros de
  // sessão dinâmicos (JBoss Seam) — não fazem sentido fixos aqui, cada
  // execução do robô gera os seus ao navegar.
  baseUrl: "https://iss.fortaleza.ce.gov.br/grpfor/login.seam",
  caminhoOauthLogin: "/grpfor/oauth2/login",
};

export const LOGIN_SELECTORS = {
  // Página inicial: botão que dispara o redirect OAuth2.
  botaoFazerLogin: "a.btn-login",

  // CONFIRMADO: tela do Keycloak (idp2.sefin.fortaleza.ce.gov.br/realms/sefin).
  // O login é feito por CPF (não é um "usuário" genérico), com máscara
  // 999.999.999-99 aplicada via jquery.inputmask — por isso usamos page.type()
  // no lugar de page.fill() (fill não dispara os eventos de tecla que o
  // plugin de máscara escuta).
  campoUsuario: "#username", // CPF
  campoSenha: "#password",
  botaoEntrar: "#botao-entrar",
  // TODO: confirmar texto/elemento pós-login, de volta no portal da SEFIN
  // (ex.: nome do usuário no topo, menu principal aparecendo, etc.)
  indicadorLoginOk: "text=Sair",
  // TODO: confirmar a mensagem de erro real do Keycloak quando login falha
  // (geralmente fica na própria página, ex. div.alert-error ou #input-error)
  indicadorLoginFalhou: "text=usuário ou senha inválidos",
};

// IMPORTANTE: a partir daqui (dentro de /grpfor/*) o sistema é JSF/RichFaces
// com AJAX parcial — a maioria dos cliques dispara A4J.AJAX.Submit(...) via
// onclick, SEM navegação de página inteira. Por isso os steps depois do
// login não usam page.waitForNavigation(); usam waitFor de elementos
// aparecendo/sumindo (ex.: o modal fechar). Também evitamos os ids
// "j_idNNN" gerados automaticamente pelo JSF (mudam entre views) e
// preferimos atributos estáveis como title="..." e classes semânticas.
export const SELECAO_EMPRESA_SELECTORS = {
  // CONFIRMADO. No primeiro login (sem inscrição ainda escolhida) o modal
  // "Selecione Inscrição" abre sozinho. Se já estiver fechado, este botão
  // (o ícone de troca ao lado de "Selecione uma inscrição") abre de novo.
  botaoAbrirTrocaInscricao: 'a[title="Alterar Inscrição Atual"]',
  modalContainer: "#alteraInscricaoModalContainer",

  // A tabela do modal lista CNPJ/CPF, Inscrição e Razão Social/Nome, um por
  // linha. O CNPJ aparece formatado (99.999.999/9999-99). Cada linha tem um
  // link com title="Selecionar" (ícone de check) que efetivamente escolhe
  // aquela empresa.
  linhaEmpresaPorCnpj: (cnpjFormatado: string) => `tr:has-text("${cnpjFormatado}")`,
  linkSelecionarNaLinha: 'a[title="Selecionar"]',
};

export const MENU_SELECTORS = {
  // CONFIRMADO. É um dos 4 quadros "hot-links" da home (Emitir/Substituir/
  // Cancelar/Consultar NFS-e). Não tem <a href> nem onclick visível no HTML
  // (o clique deve ser tratado por JS externo/delegação) — escopamos pelo
  // texto dentro do container .hot-links-box, que deve funcionar via bubble
  // do evento de clique independente de onde o listener real está.
  linkEmitirNota: '.hot-links-box:has-text("Emitir NFS-e")',
};

export const SELECAO_CLIENTE_SELECTORS = {
  // TODO: campo de busca de cliente cadastrado + como selecionar o resultado
  campoBuscaCliente: 'input[name="tomador"]',
  resultadoClientePorNome: (nome: string) => `text=${nome}`,
};

export const FORM_NOTA_SELECTORS = {
  // TODO: nomes reais de cada campo do formulário da nota
  campoDiscriminacaoServico: 'textarea[name="discriminacao"]',
  campoValorServico: 'input[name="valorServico"]',
  campoAliquotaIss: 'input[name="aliquota"]',
  campoItemListaServico: 'select[name="itemLista"]',
  campoDataCompetencia: 'input[name="dataCompetencia"]',
  campoObservacoes: 'textarea[name="observacoes"]',
  botaoAvancar: "text=Avançar",
};

export const CONFIRMACAO_SELECTORS = {
  // TODO: tela final de revisão antes de emitir
  botaoConfirmarEmissao: "text=Confirmar e Emitir",
  // TODO: onde aparece o número da nota / link do PDF após sucesso
  indicadorSucesso: "text=Nota emitida com sucesso",
  numeroNotaEmitida: "[data-testid=numero-nota]",
  linkPdfNota: "a:has-text('Baixar PDF')",
};
