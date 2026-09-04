/*
  Warnings:

  - A unique constraint covering the columns `[Nit]` on the table `Proveedor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Nit` to the `Proveedor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "Nit" TEXT;

UPDATE "Proveedor" SET "Nit" ='900123456-1' WHERE id=1;

ALTER TABLE "Proveedor" ALTER COLUMN "Nit" SET NOT NULL;
--reateIndex
CREATE UNIQUE INDEX "Proveedor_Nit_key" ON "Proveedor"("Nit");
