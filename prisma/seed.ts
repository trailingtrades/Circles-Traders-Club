/* eslint-disable no-console */
// Seeds the first admin account and the initial course.
// Configure via env: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD.
// Run: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const adminName = process.env.ADMIN_NAME || "Institute Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in your environment (or .env) before seeding."
    );
  }
  if (adminPassword.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
  }

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
    update: {}, // never overwrite an existing admin's password on re-seed
  });
  console.log(`Admin ready: ${admin.email}`);

  const course = await prisma.course.upsert({
    where: { slug: "options-selling-playbook" },
    create: {
      name: "Five Circles Options — Selling Playbook",
      slug: "options-selling-playbook",
      description:
        "Every options-selling strategy: deploy conditions, technical checklist, DTE, stop-loss, targets and adjustments — English + हिंदी, with NIFTY examples.",
      contentPath: "options-selling-playbook.html",
    },
    update: {},
  });
  console.log(`Course ready: ${course.name}`);

  // Default materials — created once; admins manage the rest from the panel.
  const existingMaterials = await prisma.material.count({ where: { courseId: course.id } });
  if (existingMaterials === 0) {
    await prisma.material.createMany({
      data: [
        {
          courseId: course.id,
          title: "Five Circles Options — Selling Playbook",
          description: "The complete strategy playbook (English + हिंदी)",
          type: "HTML",
          contentPath: "options-selling-playbook.html",
          sortOrder: 0,
        },
        {
          courseId: course.id,
          title: "5Circles Advisory Tracker",
          description: "Live advisory performance tracker (view-only Google Sheet)",
          type: "SHEET",
          url: "https://docs.google.com/spreadsheets/d/1PTvVZxUdbaisTYlpWpb9dReB2q4JN6ZIvQDYBw1kKtQ/edit?usp=sharing",
          sortOrder: 1,
        },
      ],
    });
    console.log("Materials ready: playbook + advisory tracker sheet");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
