import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  console.log("ExportCategory count =", await p.exportCategory.count());
  await p.$disconnect();
})();
