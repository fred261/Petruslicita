import path from "node:path";
import prompts from "prompts";
import { abrirSessao } from "./browser.js";
import { fazerLogin } from "./steps/login.step.js";
import { selecionarEmpresa } from "./steps/selecionar-empresa.step.js";
import { irParaEmissaoEEscolherCliente } from "./steps/selecionar-cliente.step.js";
import { preencherFormularioNota } from "./steps/preencher-nota.step.js";
import { capturarTelaDeRevisao, confirmarEmissao } from "./steps/revisar-e-confirmar.step.js";
import { buscarNota, marcarAguardandoRevisao, marcarEmitida, marcarEmitindo, marcarFalha } from "../services/notas.service.js";
import { credenciaisSefin } from "../services/empresas.service.js";

const DIR_SCREENSHOTS = path.resolve(process.cwd(), "screenshots");

/**
 * Roda a emissão de uma nota do início ao fim.
 *
 * - modo SEMI_AUTOMATICO: preenche tudo, tira print, e PARA para você
 *   confirmar no terminal (o navegador fica aberto e visível pra você
 *   conferir a tela real do portal também). Só clica em "Emitir" depois
 *   de resposta explícita "s".
 * - modo AUTOMATICO: só é permitido se `empresa.permiteModoAutomatico`
 *   estiver true; nesse caso pula a pausa e confirma direto. Continua
 *   exigindo que a nota já tenha TODOS os valores definidos de antemão —
 *   o robô nunca decide/estima valores sozinho.
 */
export async function executarEmissao(notaId: string): Promise<void> {
  const nota = await buscarNota(notaId);

  if (nota.modo === "AUTOMATICO" && !nota.empresa.permiteModoAutomatico) {
    throw new Error(
      `A empresa "${nota.empresa.razaoSocial}" ainda não está liberada para modo automático ` +
        `(permiteModoAutomatico=false). Rode em modo semi-automático primeiro ou libere a empresa.`,
    );
  }

  const sessao = await abrirSessao({ headless: nota.modo === "AUTOMATICO" });

  try {
    const credenciais = credenciaisSefin(nota.empresa);
    await fazerLogin(sessao.page, credenciais);
    await selecionarEmpresa(sessao.page, nota.empresa.cnpj);
    await irParaEmissaoEEscolherCliente(sessao.page, nota.cliente.nome);
    await preencherFormularioNota(sessao.page, {
      discriminacaoServico: nota.discriminacaoServico,
      valorServico: Number(nota.valorServico),
      // itemListaServico guarda a descrição do CNAE (ver comentário em
      // preencher-nota.step.ts) — não é mais um código arbitrário.
      itemListaServico: nota.itemListaServico ?? undefined,
      dataCompetencia: nota.dataCompetencia ?? undefined,
      observacoes: nota.observacoes ?? undefined,
    });

    const screenshotPath = path.join(DIR_SCREENSHOTS, `${nota.id}.png`);
    await capturarTelaDeRevisao(sessao.page, screenshotPath);
    await marcarAguardandoRevisao(nota.id, screenshotPath);

    if (nota.modo === "SEMI_AUTOMATICO") {
      const { confirmar } = await prompts({
        type: "confirm",
        name: "confirmar",
        message:
          `Nota pronta para revisão (print salvo em ${screenshotPath}, navegador aberto). ` +
          `Confira TUDO com atenção — isso emite um documento fiscal real. Confirmar emissão?`,
        initial: false,
      });
      if (!confirmar) {
        console.log("Emissão cancelada por você. Nada foi enviado ao portal. A nota continua como AGUARDANDO_REVISAO.");
        return;
      }
    }

    await marcarEmitindo(nota.id);
    const resultado = await confirmarEmissao(sessao.page);
    await marcarEmitida(nota.id, resultado.numeroNota, resultado.urlPdf);
    console.log(`Nota emitida com sucesso. Número: ${resultado.numeroNota}`);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await marcarFalha(nota.id, mensagem);
    throw erro;
  } finally {
    if (nota.modo === "AUTOMATICO") {
      await sessao.fechar();
    } else {
      // Modo semi-automático: deixa a janela aberta pra você conferir o
      // resultado, mas não trava o processo esperando pra sempre — pergunta
      // explicitamente antes de encerrar.
      await prompts({ type: "confirm", name: "ok", message: "Pode fechar o navegador?", initial: true });
      await sessao.fechar();
    }
  }
}
