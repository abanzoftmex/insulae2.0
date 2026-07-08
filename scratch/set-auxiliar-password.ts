import { prisma } from "../src/shared/infrastructure/db/prisma";
import crypto from "crypto";

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function main() {
  const email = "auxiliar@valquirico.com";
  const password = "Valquirico2026!";
  const hash = hashSHA256(password);

  await prisma.user.updateMany({
    where: {
      OR: [
        { email },
        { personalEmail: email },
        { businessEmail: email }
      ]
    },
    data: {
      passwordHash: hash
    }
  });

  console.log(`Password for ${email} set to '${password}' (hash: ${hash})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
