const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS total, COUNT(embedding)::int AS with_emb FROM "Document"',
  );
  console.log(JSON.stringify(rows));
  const jobs = await prisma.job.count();
  const schemes = await prisma.scheme.count();
  console.log(JSON.stringify({ jobs, schemes }));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
