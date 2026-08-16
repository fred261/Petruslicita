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
 *   1. [PARCIAL] Botão "Fazer login" da página inicial já mapeado. Falta:
 *      URL base do portal, e a tela do provedor OAuth2 (usuário/senha reais)
 *   2. Tela de seleção de CNPJ/empresa (como aparece a lista, o que se clica)
 *   3. Menu/tela de "Emitir NFS-e" (onde essa opção fica)
 *   4. Tela de seleção do cliente/tomador já cadastrado (busca? dropdown?)
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
  // TODO: preencher a URL base real (domínio da página com o botão "Fazer login")
  baseUrl: "https://TODO-preencher-url-real-do-portal-iss-fortaleza",
  caminhoOauthLogin: "/grpfor/oauth2/login",
};

export const LOGIN_SELECTORS = {
  // Página inicial: botão que dispara o redirect OAuth2.
  botaoFazerLogin: "a.btn-login",

  // TODO: mapear a tela seguinte (provavelmente em outro domínio, ex.
  // sso.acesso.gov.br) — campos reais de usuário/senha ficam lá, não aqui.
  campoUsuario: 'input[name="usuario"]',
  campoSenha: 'input[name="senha"]',
  botaoEntrar: 'button[type="submit"]',
  // Texto/elemento que confirma que o login deu certo, já de volta no portal
  // da SEFIN (ex.: nome do usuário no topo, ou o botão "Fazer login" sumiu)
  indicadorLoginOk: "text=Sair",
  // Texto/elemento que aparece quando o login falha (usuário/senha errados)
  indicadorLoginFalhou: "text=usuário ou senha inválidos",
};

export const SELECAO_EMPRESA_SELECTORS = {
  // TODO: como o CNPJ é escolhido — lista de links? dropdown? Preencher com o padrão real.
  // Placeholder assume um link/linha de tabela contendo o CNPJ.
  linhaEmpresaPorCnpj: (cnpj: string) => `text=${cnpj}`,
};

export const MENU_SELECTORS = {
  // TODO: caminho de navegação até a emissão de NFS-e (pode ser um menu lateral)
  linkEmitirNota: "text=Emitir NFS-e",
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
