/*
  Warnings:

  - The primary key for the `BoundChat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `BoundChat` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "BoundChat_chatId_userId_key";

-- AlterTable
ALTER TABLE "BoundChat" DROP CONSTRAINT "BoundChat_pkey",
DROP COLUMN "id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "userId" DROP NOT NULL,
ADD CONSTRAINT "BoundChat_pkey" PRIMARY KEY ("chatId");
