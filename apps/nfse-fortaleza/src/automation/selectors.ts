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
 *   1. Tela de login (URL + campos de usuário/senha + botão entrar)
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

export const PORTAL = {
  // TODO: confirmar URL exata (login pode ficar num subdomínio separado, ex. sso.fortaleza.ce.gov.br)
  loginUrl: "https://TODO-preencher-url-real-do-portal-iss-fortaleza/login",
};

export const LOGIN_SELECTORS = {
  // TODO: seletores reais. Os valores abaixo são só exemplos plausíveis.
  campoUsuario: 'input[name="usuario"]',
  campoSenha: 'input[name="senha"]',
  botaoEntrar: 'button[type="submit"]',
  // Texto/elemento que confirma que o login deu certo (ex.: nome do usuário no topo)
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
