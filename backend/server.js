const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

const JWT_SECRET = 'guia-digital-idosos-secret-key-2024';
const PORT = 3000;

// Total de aulas de cada trilha (deve refletir o conteúdo do front-end)
const TOTAL_AULAS = {
    'smartphone': 8,
    'whatsapp': 10,
    'redes-sociais': 7,
    'email': 6,
    'compras': 6,
    'seguranca': 8,
    'golpes': 9,
    'bancos': 7
};

// Pontos ganhos a cada aula concluída
const PONTOS_POR_AULA = 50;

app.use(cors());
app.use(express.json());

// ============ ROTAS DE USUARIO ============

// POST /api/cadastro - Criar novo usuário
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, idade, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: 'Nome, e-mail e senha são obrigatórios.'
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                erro: 'A senha precisa ter pelo menos 6 caracteres.'
            });
        }

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email }
        });

        if (usuarioExistente) {
            return res.status(400).json({
                erro: 'Já existe uma conta com este e-mail.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                idade: idade ? parseInt(idade) : null,
                senha: senhaHash
            }
        });

        const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, {
            expiresIn: '7d'
        });

        res.status(201).json({
            mensagem: 'Conta criada com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                idade: usuario.idade,
                nivel: usuario.nivel,
                pontuacao: usuario.pontuacao,
                aulasCompletas: usuario.aulasCompletas,
                certificados: usuario.certificados
            },
            token
        });
    } catch (erro) {
        console.error('Erro no cadastro:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// POST /api/login - Autenticar usuário
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: 'E-mail e senha são obrigatórios.'
            });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email }
        });

        if (!usuario) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos.'
            });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos.'
            });
        }

        const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                idade: usuario.idade,
                nivel: usuario.nivel,
                pontuacao: usuario.pontuacao,
                aulasCompletas: usuario.aulasCompletas,
                certificados: usuario.certificados
            },
            token
        });
    } catch (erro) {
        console.error('Erro no login:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// GET /api/usuario - Obter dados do usuário logado
app.get('/api/usuario', autenticar, async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuarioId }
        });

        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        res.json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            idade: usuario.idade,
            nivel: usuario.nivel,
            pontuacao: usuario.pontuacao,
            aulasCompletas: usuario.aulasCompletas,
            certificados: usuario.certificados
        });
    } catch (erro) {
        console.error('Erro ao buscar usuário:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// PUT /api/usuario/nivel - Atualizar nível do usuário
app.put('/api/usuario/nivel', autenticar, async (req, res) => {
    try {
        const { nivel } = req.body;

        if (!['iniciante', 'intermediario', 'avancado'].includes(nivel)) {
            return res.status(400).json({ erro: 'Nível inválido.' });
        }

        const usuario = await prisma.usuario.update({
            where: { id: req.usuarioId },
            data: { nivel }
        });

        res.json({
            mensagem: 'Nível atualizado com sucesso!',
            nivel: usuario.nivel
        });
    } catch (erro) {
        console.error('Erro ao atualizar nível:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// DELETE /api/usuario - Excluir conta e dados
app.delete('/api/usuario', autenticar, async (req, res) => {
    try {
        await prisma.usuario.delete({
            where: { id: req.usuarioId }
        });

        res.json({ mensagem: 'Conta e dados excluídos com sucesso.' });
    } catch (erro) {
        console.error('Erro ao excluir conta:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// ============ ROTAS DE TRILHAS / PROGRESSO ============

// Monta o objeto de progresso de uma trilha para o usuário
async function montarProgresso(usuarioId, trilha) {
    const totalAulas = TOTAL_AULAS[trilha];
    const registros = await prisma.progressoTrilha.findMany({
        where: { usuarioId, trilha, concluida: true },
        orderBy: { aula: 'asc' }
    });
    const aulasConcluidas = registros.map(function (r) { return r.aula; });

    return {
        trilha,
        totalAulas,
        aulasConcluidas,
        quantidadeConcluida: aulasConcluidas.length,
        percentual: Math.round((aulasConcluidas.length / totalAulas) * 100),
        concluida: aulasConcluidas.length >= totalAulas
    };
}

// Recalcula pontuação, aulas completas e certificados do usuário
async function recalcularEstatisticas(usuarioId) {
    const registros = await prisma.progressoTrilha.findMany({
        where: { usuarioId, concluida: true }
    });

    const aulasCompletas = registros.length;
    const pontuacao = aulasCompletas * PONTOS_POR_AULA;

    const concluidasPorTrilha = {};
    registros.forEach(function (r) {
        concluidasPorTrilha[r.trilha] = (concluidasPorTrilha[r.trilha] || 0) + 1;
    });

    let certificados = 0;
    Object.keys(concluidasPorTrilha).forEach(function (trilha) {
        const total = TOTAL_AULAS[trilha];
        if (total && concluidasPorTrilha[trilha] >= total) {
            certificados++;
        }
    });

    return prisma.usuario.update({
        where: { id: usuarioId },
        data: { aulasCompletas, pontuacao, certificados }
    });
}

// GET /api/trilhas/:trilha/progresso - Progresso de uma trilha específica
app.get('/api/trilhas/:trilha/progresso', autenticar, async (req, res) => {
    try {
        const trilha = req.params.trilha;

        if (!TOTAL_AULAS[trilha]) {
            return res.status(404).json({ erro: 'Trilha não encontrada.' });
        }

        const progresso = await montarProgresso(req.usuarioId, trilha);
        res.json(progresso);
    } catch (erro) {
        console.error('Erro ao buscar progresso:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// POST /api/trilhas/:trilha/aula - Marcar uma aula como concluída
app.post('/api/trilhas/:trilha/aula', autenticar, async (req, res) => {
    try {
        const trilha = req.params.trilha;
        const totalAulas = TOTAL_AULAS[trilha];
        const { aula, tituloAula } = req.body;

        if (!totalAulas) {
            return res.status(404).json({ erro: 'Trilha não encontrada.' });
        }

        const numeroAula = parseInt(aula);
        if (!numeroAula || numeroAula < 1 || numeroAula > totalAulas) {
            return res.status(400).json({ erro: 'Número da aula inválido.' });
        }

        await prisma.progressoTrilha.upsert({
            where: {
                usuarioId_trilha_aula: {
                    usuarioId: req.usuarioId,
                    trilha,
                    aula: numeroAula
                }
            },
            update: { concluida: true, concluidaEm: new Date() },
            create: {
                usuarioId: req.usuarioId,
                trilha,
                aula: numeroAula,
                tituloAula: tituloAula || ('Aula ' + numeroAula),
                concluida: true
            }
        });

        const usuario = await recalcularEstatisticas(req.usuarioId);
        const progresso = await montarProgresso(req.usuarioId, trilha);

        res.json(Object.assign({ mensagem: 'Aula concluída! Progresso salvo.' }, progresso, {
            usuario: {
                pontuacao: usuario.pontuacao,
                aulasCompletas: usuario.aulasCompletas,
                certificados: usuario.certificados
            }
        }));
    } catch (erro) {
        console.error('Erro ao salvar progresso:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// DELETE /api/trilhas/:trilha/aula/:aula - Desmarcar uma aula
app.delete('/api/trilhas/:trilha/aula/:aula', autenticar, async (req, res) => {
    try {
        const trilha = req.params.trilha;
        const totalAulas = TOTAL_AULAS[trilha];
        const numeroAula = parseInt(req.params.aula);

        if (!totalAulas) {
            return res.status(404).json({ erro: 'Trilha não encontrada.' });
        }

        await prisma.progressoTrilha.deleteMany({
            where: { usuarioId: req.usuarioId, trilha, aula: numeroAula }
        });

        const usuario = await recalcularEstatisticas(req.usuarioId);
        const progresso = await montarProgresso(req.usuarioId, trilha);

        res.json(Object.assign({ mensagem: 'Aula desmarcada. Progresso atualizado.' }, progresso, {
            usuario: {
                pontuacao: usuario.pontuacao,
                aulasCompletas: usuario.aulasCompletas,
                certificados: usuario.certificados
            }
        }));
    } catch (erro) {
        console.error('Erro ao desmarcar aula:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// GET /api/progresso - Resumo do progresso de todas as trilhas
app.get('/api/progresso', autenticar, async (req, res) => {
    try {
        const registros = await prisma.progressoTrilha.findMany({
            where: { usuarioId: req.usuarioId, concluida: true }
        });

        const trilhas = {};
        Object.keys(TOTAL_AULAS).forEach(function (trilha) {
            trilhas[trilha] = {
                trilha,
                totalAulas: TOTAL_AULAS[trilha],
                quantidadeConcluida: 0,
                percentual: 0,
                concluida: false
            };
        });

        registros.forEach(function (r) {
            if (trilhas[r.trilha]) {
                trilhas[r.trilha].quantidadeConcluida++;
            }
        });

        Object.keys(trilhas).forEach(function (trilha) {
            const t = trilhas[trilha];
            t.percentual = Math.round((t.quantidadeConcluida / t.totalAulas) * 100);
            t.concluida = t.quantidadeConcluida >= t.totalAulas;
        });

        res.json({ trilhas: Object.values(trilhas) });
    } catch (erro) {
        console.error('Erro ao buscar progresso geral:', erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// ============ MIDDLEWARE DE AUTENTICACAO ============

function autenticar(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: 'Token não fornecido.' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuarioId = decoded.id;
        next();
    } catch (erro) {
        return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
}

// ============ INICIAR SERVIDOR ============

app.listen(PORT, () => {
    console.log('');
    console.log('===========================================');
    console.log('  GUIA DIGITAL PARA IDOSOS - API');
    console.log('  Servidor rodando em: http://localhost:' + PORT);
    console.log('  Banco de dados: SQLite (prisma/dev.db)');
    console.log('===========================================');
    console.log('');
    console.log('Rotas disponíveis:');
    console.log('  POST /api/cadastro  - Criar conta');
    console.log('  POST /api/login     - Fazer login');
    console.log('  GET  /api/usuario   - Ver perfil');
    console.log('  PUT  /api/usuario/nivel - Atualizar nível');
    console.log('  DELETE /api/usuario  - Excluir conta');
    console.log('  GET  /api/trilhas/:trilha/progresso - Ver progresso da trilha');
    console.log('  POST /api/trilhas/:trilha/aula      - Concluir aula');
    console.log('  DELETE /api/trilhas/:trilha/aula/:aula - Desmarcar aula');
    console.log('  GET  /api/progresso - Resumo de todas as trilhas');
    console.log('');
});
