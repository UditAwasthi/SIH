import { PrismaClient } from "@prisma/client";
import { buildJobSeed, KNOWLEDGE_DOCS, NAVIGATION_SEED, SCHEME_SEED } from "./seed-data";

const prisma = new PrismaClient();

async function embedIfPossible(text: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
    const embedding = body.data[0]?.embedding;
    return embedding ? `[${embedding.join(",")}]` : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Seeding PGRKAM MVP data...");

  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.navigationMap.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.job.deleteMany();
  await prisma.$executeRawUnsafe(`DELETE FROM "Document"`);

  await prisma.job.createMany({ data: buildJobSeed() });
  await prisma.scheme.createMany({ data: SCHEME_SEED });

  for (const item of NAVIGATION_SEED) {
    await prisma.navigationMap.create({ data: item });
  }

  for (const doc of KNOWLEDGE_DOCS) {
    const vector = await embedIfPossible(doc.content);
    if (vector) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Document" (id, content, "sourceUrl", category, language, embedding, "lastCrawledAt")
         VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())`,
        doc.id,
        doc.content,
        doc.sourceUrl,
        doc.category,
        doc.language,
        vector,
      );
    } else {
      await prisma.document.create({
        data: {
          id: doc.id,
          content: doc.content,
          sourceUrl: doc.sourceUrl,
          category: doc.category,
          language: doc.language,
        },
      });
    }
  }

  const counts = {
    jobs: await prisma.job.count(),
    schemes: await prisma.scheme.count(),
    navigation: await prisma.navigationMap.count(),
    documents: await prisma.document.count(),
  };
  console.log("Seed complete:", counts);
  if (!process.env.OPENAI_API_KEY) {
    console.log("Note: OPENAI_API_KEY not set — documents stored without embeddings; text search fallback will be used.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
