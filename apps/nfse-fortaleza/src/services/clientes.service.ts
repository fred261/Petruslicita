import { prisma } from "../db/client.js";

export interface CadastrarClienteInput {
  empresaId: string;
  idNoPortal: string;
  nome: string;
  cnpjOuCpf?: string;
}

/** Cadastro manual/local. No futuro, isso pode ser preenchido automaticamente
 * lendo a lista de clientes direto do portal (ver TODO em automation/steps/selecionar-cliente.step.ts). */
export async function cadastrarCliente(input: CadastrarClienteInput) {
  return prisma.cliente.upsert({
    where: { empresaId_idNoPortal: { empresaId: input.empresaId, idNoPortal: input.idNoPortal } },
    create: input,
    update: { nome: input.nome, cnpjOuCpf: input.cnpjOuCpf },
  });
}

export async function listarClientes(empresaId: string) {
  return prisma.cliente.findMany({ where: { empresaId }, orderBy: { nome: "asc" } });
}

export async function buscarCliente(empresaId: string, termo: string) {
  const cliente = await prisma.cliente.findFirst({
    where: { empresaId, OR: [{ idNoPortal: termo }, { nome: { contains: termo } }] },
  });
  if (!cliente) {
    throw new Error(`Cliente "${termo}" não encontrado para esta empresa. Cadastre com \`cli cliente:add\` primeiro.`);
  }
  return cliente;
}
