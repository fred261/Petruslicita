#!/usr/bin/env node
import { Command } from "commander";
import prompts from "prompts";
import { cadastrarEmpresa, listarEmpresas, buscarEmpresaPorCnpjOuApelido } from "../services/empresas.service.js";
import { cadastrarCliente, listarClientes, buscarCliente } from "../services/clientes.service.js";
import { criarNota } from "../services/notas.service.js";
import { executarEmissao } from "../automation/engine.js";

const program = new Command();
program.name("nfse-fortaleza").description("Robô de emissão de NFS-e no portal ISS SEFIN Fortaleza");

program
  .command("empresa:add")
  .description("Cadastra uma empresa (CNPJ) e as credenciais de login do portal SEFIN")
  .action(async () => {
    const respostas = await prompts([
      { type: "text", name: "cnpj", message: "CNPJ (só números ou formatado)" },
      { type: "text", name: "razaoSocial", message: "Razão social" },
      { type: "text", name: "apelido", message: "Apelido curto (opcional, pra escolher rápido depois)" },
      { type: "text", name: "sefinUsuario", message: "Usuário de login do portal SEFIN" },
      { type: "password", name: "sefinSenha", message: "Senha de login do portal SEFIN" },
      {
        type: "confirm",
        name: "permiteModoAutomatico",
        message: "Liberar modo automático (sem pausa de revisão) para essa empresa desde já?",
        initial: false,
      },
    ]);
    const empresa = await cadastrarEmpresa(respostas);
    console.log(`Empresa cadastrada: ${empresa.razaoSocial} (${empresa.cnpj}). Credenciais salvas criptografadas.`);
  });

program
  .command("empresa:list")
  .description("Lista empresas cadastradas")
  .action(async () => {
    const empresas = await listarEmpresas();
    for (const e of empresas) {
      console.log(`${e.cnpj}  ${e.apelido ?? ""}  ${e.razaoSocial}  automatico=${e.permiteModoAutomatico}`);
    }
  });

program
  .command("cliente:add")
  .description("Cadastra localmente um cliente já existente no portal (para facilitar a seleção)")
  .requiredOption("--empresa <cnpjOuApelido>", "CNPJ ou apelido da empresa")
  .action(async (opts) => {
    const empresa = await buscarEmpresaPorCnpjOuApelido(opts.empresa);
    const respostas = await prompts([
      { type: "text", name: "idNoPortal", message: "Identificador do cliente no portal (como aparece lá — TODO mapear)" },
      { type: "text", name: "nome", message: "Nome do cliente (exatamente como está no portal)" },
      { type: "text", name: "cnpjOuCpf", message: "CNPJ/CPF do cliente (opcional)" },
    ]);
    const cliente = await cadastrarCliente({ empresaId: empresa.id, ...respostas });
    console.log(`Cliente cadastrado: ${cliente.nome}`);
  });

program
  .command("cliente:list")
  .description("Lista clientes cadastrados localmente para uma empresa")
  .requiredOption("--empresa <cnpjOuApelido>", "CNPJ ou apelido da empresa")
  .action(async (opts) => {
    const empresa = await buscarEmpresaPorCnpjOuApelido(opts.empresa);
    const clientes = await listarClientes(empresa.id);
    for (const c of clientes) console.log(`${c.id}  ${c.nome}`);
  });

program
  .command("nota:emitir")
  .description("Cria e emite uma nota fiscal (login -> CNPJ -> cliente -> preencher -> revisar -> confirmar)")
  .requiredOption("--empresa <cnpjOuApelido>", "CNPJ ou apelido da empresa")
  .requiredOption("--cliente <nomeOuId>", "Nome ou id do cliente cadastrado localmente")
  .requiredOption("--valor <valor>", "Valor do serviço, ex: 1500.00")
  .requiredOption("--objeto <texto>", "Discriminação/objeto do serviço prestado")
  .option("--aliquota <aliquota>", "Alíquota do ISS, ex: 5")
  .option("--item-lista <item>", "Item da lista de serviço")
  .option("--observacoes <texto>", "Observações adicionais")
  .option("--automatico", "Roda em modo automático (exige empresa liberada) em vez de semi-automático", false)
  .action(async (opts) => {
    const empresa = await buscarEmpresaPorCnpjOuApelido(opts.empresa);
    const cliente = await buscarCliente(empresa.id, opts.cliente);

    const nota = await criarNota({
      empresaId: empresa.id,
      clienteId: cliente.id,
      discriminacaoServico: opts.objeto,
      valorServico: Number(opts.valor),
      aliquotaIss: opts.aliquota ? Number(opts.aliquota) : undefined,
      itemListaServico: opts.itemLista,
      observacoes: opts.observacoes,
      modo: opts.automatico ? "AUTOMATICO" : "SEMI_AUTOMATICO",
    });

    console.log(`Nota criada (${nota.id}). Iniciando automação em modo ${nota.modo}...`);
    await executarEmissao(nota.id);
  });

program.parseAsync(process.argv);
