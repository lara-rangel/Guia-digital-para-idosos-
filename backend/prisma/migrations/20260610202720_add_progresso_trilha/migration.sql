-- CreateTable
CREATE TABLE "ProgressoTrilha" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "trilha" TEXT NOT NULL,
    "aula" INTEGER NOT NULL,
    "tituloAula" TEXT NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT true,
    "concluidaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressoTrilha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProgressoTrilha_usuarioId_trilha_idx" ON "ProgressoTrilha"("usuarioId", "trilha");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoTrilha_usuarioId_trilha_aula_key" ON "ProgressoTrilha"("usuarioId", "trilha", "aula");
