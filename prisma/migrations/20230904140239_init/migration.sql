-- CreateTable
CREATE TABLE "BoundChat" (
    "id" SERIAL NOT NULL,
    "chatId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "BoundChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "file" BYTEA NOT NULL,
    "image" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoundChat_chatId_userId_key" ON "BoundChat"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_hash_key" ON "Plan"("hash");
