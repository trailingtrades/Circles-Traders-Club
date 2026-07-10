-- CreateEnum
CREATE TYPE "MaterialAccessMode" AS ENUM ('ALL', 'CUSTOM');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "materialAccess" "MaterialAccessMode" NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "student_material_access" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_material_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_material_access_studentId_materialId_key" ON "student_material_access"("studentId", "materialId");

-- AddForeignKey
ALTER TABLE "student_material_access" ADD CONSTRAINT "student_material_access_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_material_access" ADD CONSTRAINT "student_material_access_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
