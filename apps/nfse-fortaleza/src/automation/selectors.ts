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
 *   4. [OK] Formulário "Emitir NFS-e" mapeado — tem 3 abas (Tomador,
 *      Serviço, Valores). Busca de cliente é autocomplete (RichFaces
 *      Suggestion), não dropdown simples.
 *   5. [OK] Campos do formulário mapeados (ver FORM_NOTA_SELECTORS). O
 *      "objeto" da nota não é um campo livre só — tem um select de CNAE
 *      (define a alíquota automaticamente) + a descrição livre do serviço.
 *   6. [OK] O botão "Validar Campos Obrigatórios da NFS-e" abre um modal de
 *      confirmação ("Você confirma a geração deste documento?") — isso é a
 *      nossa tela de revisão. Depois de "Sim", a área
 *      emitirnfseForm:divEmitirNota mostra o botão final "Confirmar Emissão
 *      de NFS-e" (btnEmitir), que já está mapeado.
 *   7. [DECISÃO] Tela de sucesso pós-emissão (número da nota / link do PDF)
 *      NÃO será mapeada por seletor — mapear exigiria emitir uma nota real
 *      de teste só pra ver o HTML, o que tem implicação tributária real.
 *      Combinado: o robô confirma que os cliques mapeados aconteceram, tira
 *      um print de auditoria logo após o clique final, e quem confere o
 *      resultado (número da nota, PDF) é você mesmo, direto no portal, em
 *      "Consultar NFS-e".
 *
 * Com isso o robô já fica funcional de ponta a ponta.
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

// CONFIRMADO. Tela "Emitir NFS-e" (aba Tomador, ativa por padrão). A busca
// tem 4 modos via rádio (CPF/CNPJ/Nome ou Razão Social/Inscrição Municipal)
// — usamos "Nome ou Razão Social" (índice 2) pra buscar pelo nome do
// cliente. Digitar no campo dispara um autocomplete (RichFaces Suggestion);
// clicar no item da lista de sugestão carrega os dados do cliente na tela
// via AJAX (não precisa clicar em nada mais pra "confirmar" a escolha).
export const SELECAO_CLIENTE_SELECTORS = {
  radioTipoBuscaNomeRazaoSocial: '#emitirnfseForm\\:tipoPesquisaTomadorRb\\:2',
  campoBusca: '#emitirnfseForm\\:cpfPesquisaTomador',
  // Caixa de sugestões do RichFaces que aparece abaixo do campo de busca.
  caixaSugestao: '#emitirnfseForm\\:j_id216',
  // Dentro da caixa, cada sugestão é uma linha de tabela — casamos pelo texto.
  sugestaoPorTexto: (texto: string) => `#emitirnfseForm\\:j_id216 :text("${texto}")`,
  botaoCadastrarNovoCliente: 'input[value="Cadastrar Novo Cliente"]',
};

// CONFIRMADO. Aba "Serviço" e aba "Valores" do mesmo formulário
// (emitirnfseForm) — trocar de aba é só um clique, sem reload. O "objeto"
// da nota não é um único campo livre: primeiro escolhe-se o CNAE (que
// define a alíquota automaticamente), depois preenche a descrição livre.
export const FORM_NOTA_SELECTORS = {
  // Cabeçalhos das abas (clique troca via RichFaces.switchTab, sem navegação)
  abaServico: "#emitirnfseForm\\:abaServico_lbl",
  abaValores: "#emitirnfseForm\\:abaValores_lbl",

  // --- Aba Serviço ---
  comboMesCompetencia: "#emitirnfseForm\\:comboEscolherMesCompetencia",
  comboAnoCompetencia: "#emitirnfseForm\\:comboEscolherAnoCompetencia",
  // Select de CNAE — as opções são descrições de atividade (ex.:
  // "CONSULTORIA EM TECNOLOGIA DA INFORMAÇÃO"), escolhidas por texto visível,
  // não por um código que o usuário digitaria. Existe também um botão
  // "Pesquisar" (title="Pesquisar CNAE") que abre um modal de busca — não
  // mapeado ainda, só necessário se o CNAE não estiver nas ~12 opções da
  // lista curta já carregada.
  comboCnae: "#emitirnfseForm\\:comboEscolherAtividadeCpbs",
  campoDescricaoServico: "#emitirnfseForm\\:idDescricaoServico",

  // --- Aba Valores ---
  campoValorServico: "#emitirnfseForm\\:idValorServicoPrestado", // maskMoney R$
  botaoValidar: "#emitirnfseForm\\:btnCalcular", // "Validar Campos Obrigatórios da NFS-e"
};

// PARCIAL. O botão "Validar Campos Obrigatórios da NFS-e" abre este modal
// de confirmação — na prática é a nossa "tela de revisão". CONFIRMADO: depois
// de clicar "Sim" aqui, o modal fecha e o formulário reaparece travado
// (campos disabled), com a área emitirnfseForm:divEmitirNota agora populada
// com dois botões: "Confirmar Emissão de NFS-e" (botaoConfirmarEmissao, o
// clique que de fato emite o documento) e "Alterar" (volta a editar). TODO:
// ainda não vi a tela que aparece DEPOIS de clicar em "Confirmar Emissão de
// NFS-e" — é aí que deve aparecer o número da nota / link do PDF.
export const CONFIRMACAO_SELECTORS = {
  modalConfirmacao: "#emitirnfseForm\\:confirmacao_customizadaContainer",
  botaoSimNoModal: '#emitirnfseForm\\:confirmacao_customizadaContainer input[value="Sim"]',
  botaoNaoNoModal: '#emitirnfseForm\\:confirmacao_customizadaContainer input[value="Não"]',
  // CONFIRMADO. Só aparece depois de "Sim" no modal acima. Este é o clique
  // que de fato emite o documento fiscal — é o ponto de não-retorno.
  botaoConfirmarEmissao: "#emitirnfseForm\\:btnEmitir",
  botaoAlterar: "#emitirnfseForm\\:btnAlterar",
  // DECISÃO: não vamos mapear a tela pós-emissão por seletor (ver nota no
  // topo do arquivo) — o robô não depende destes pra funcionar. O número da
  // nota e o PDF são conferidos manualmente no portal, em "Consultar NFS-e".
};
