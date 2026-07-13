import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Cria o primeiro usuário Master, necessário porque o sistema não tem
 * cadastro público — todo usuário nasce a partir de Master/Admin.
 * Sobrescreva PETRUS_SEED_EMAIL / PETRUS_SEED_PASSWORD antes de rodar em produção.
 */
async function main() {
  const email = process.env.PETRUS_SEED_EMAIL ?? "master@petruslicitacao.com.br";
  const senha = process.env.PETRUS_SEED_PASSWORD ?? "TrocarSenha!2026";

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário Master já existe (${email}). Nada a fazer.`);
    return;
  }

  const senhaHash = await argon2.hash(senha);
  await prisma.usuario.create({
    data: { nome: "Administrador Master", email, senhaHash, papel: "MASTER" },
  });

  console.log(`Usuário Master criado: ${email} / ${senha}`);
  console.log("Troque a senha no primeiro acesso.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
