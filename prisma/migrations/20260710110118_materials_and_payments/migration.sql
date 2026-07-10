-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('HTML', 'VIDEO', 'SHEET', 'LINK');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "feePaid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "feeTotal" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaterialType" NOT NULL,
    "contentPath" TEXT,
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materials_courseId_sortOrder_idx" ON "materials"("courseId", "sortOrder");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
