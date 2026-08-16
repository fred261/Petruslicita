import { prisma } from "../db/client.js";
import { decryptSecret, encryptSecret } from "../crypto/secret-box.js";

export interface CadastrarEmpresaInput {
  cnpj: string;
  razaoSocial: string;
  apelido?: string;
  sefinUsuario: string;
  sefinSenha: string;
  permiteModoAutomatico?: boolean;
}

export async function cadastrarEmpresa(input: CadastrarEmpresaInput) {
  return prisma.empresa.create({
    data: {
      cnpj: input.cnpj,
      razaoSocial: input.razaoSocial,
      apelido: input.apelido,
      sefinUsuarioCriptografado: encryptSecret(input.sefinUsuario),
      sefinSenhaCriptografada: encryptSecret(input.sefinSenha),
      permiteModoAutomatico: input.permiteModoAutomatico ?? false,
    },
  });
}

export async function listarEmpresas() {
  return prisma.empresa.findMany({ where: { ativo: true }, orderBy: { razaoSocial: "asc" } });
}

export async function buscarEmpresaPorCnpjOuApelido(termo: string) {
  const empresa = await prisma.empresa.findFirst({
    where: {
      ativo: true,
      OR: [{ cnpj: termo }, { apelido: termo }],
    },
  });
  if (!empresa) {
    throw new Error(`Nenhuma empresa ativa encontrada para "${termo}". Cadastre com \`cli empresa:add\` primeiro.`);
  }
  return empresa;
}

/** Só chame isso dentro do processo do robô, na hora de logar — nunca logue o retorno. */
export function credenciaisSefin(empresa: { sefinUsuarioCriptografado: string; sefinSenhaCriptografada: string }) {
  return {
    usuario: decryptSecret(empresa.sefinUsuarioCriptografado),
    senha: decryptSecret(empresa.sefinSenhaCriptografada),
  };
}
