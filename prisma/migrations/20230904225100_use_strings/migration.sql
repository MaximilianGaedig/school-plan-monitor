/*
  Warnings:

  - The primary key for the `BoundChat` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "BoundChat" DROP CONSTRAINT "BoundChat_pkey",
ALTER COLUMN "chatId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "BoundChat_pkey" PRIMARY KEY ("chatId");
