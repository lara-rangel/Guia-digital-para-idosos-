-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "idade" INTEGER,
    "senha" TEXT NOT NULL,
    "nivel" TEXT NOT NULL DEFAULT 'iniciante',
    "pontuacao" INTEGER NOT NULL DEFAULT 0,
    "aulasCompletas" INTEGER NOT NULL DEFAULT 0,
    "certificados" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
