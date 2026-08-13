// Market/news/fundamentals data never needs seeding — DEMO MODE generates
// it deterministically on every request (see src/lib/market-data/demo-provider.ts),
// and a live provider fetches it from the vendor. This script only exists
// for *account-level* fixtures you might want in a fresh dev database.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo user already exists (${email}) — nothing to do.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("demo-password-123"),
      displayName: "Demo User",
      onboardedAt: new Date(),
    },
  });

  const watchlist = await prisma.watchlist.create({ data: { userId: user.id, name: "My Watchlist" } });
  await prisma.watchlistItem.createMany({
    data: ["AAPL", "MSFT", "NVDA", "TSLA"].map((ticker, i) => ({ watchlistId: watchlist.id, ticker, sortOrder: i })),
  });

  await prisma.paperAccount.create({
    data: {
      userId: user.id,
      name: "Paper Account",
      startingBalance: 100_000,
      cashBalance: 100_000,
      commissionPerOrder: 0,
      slippageBps: 5,
    },
  });

  console.log(`Created demo user: ${email} / demo-password-123`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
