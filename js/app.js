/* ============================================
   GUIA DIGITAL PARA IDOSOS - JavaScript Principal
   Sem cookies de rastreamento, sem analytics externos
   Dados armazenados no banco SQLite via API
   ============================================ */

var API_URL = 'https://guia-digital-para-idosos-api-v2.onrender.com/api';

// Soma de todas as aulas de todas as trilhas (usada no progresso geral)
var TOTAL_AULAS_PLATAFORMA = 61;

// ============ AJUDANTES DE SESSAO ============

function getToken() {
    return localStorage.getItem('guiaDigital_token');
}

function getUsuarioAtual() {
    try {
        return JSON.parse(localStorage.getItem('guiaDigital_usuarioAtual') || '{}');
    } catch (e) {
        return {};
    }
}

function salvarUsuarioAtual(usuario) {
    localStorage.setItem('guiaDigital_usuarioAtual', JSON.stringify(usuario));
}

function sincronizarUsuario(stats) {
    if (!stats) return;
    var usuario = getUsuarioAtual();
    if (stats.pontuacao !== undefined) usuario.pontuacao = stats.pontuacao;
    if (stats.aulasCompletas !== undefined) usuario.aulasCompletas = stats.aulasCompletas;
    if (stats.certificados !== undefined) usuario.certificados = stats.certificados;
    salvarUsuarioAtual(usuario);
}

// ============ ACESSIBILIDADE ============

let tamanhoFonte = 0; // 0 = normal, 1 = grande, 2 = extra grande

function aumentarFonte() {
    if (tamanhoFonte < 2) {
        tamanhoFonte++;
        aplicarFonte();
        salvarPreferencia('tamanhoFonte', tamanhoFonte);
        falarTexto('Letra aumentada');
    }
}

function diminuirFonte() {
    if (tamanhoFonte > 0) {
        tamanhoFonte--;
        aplicarFonte();
        salvarPreferencia('tamanhoFonte', tamanhoFonte);
        falarTexto('Letra diminuída');
    }
}

function aplicarFonte() {
    document.body.classList.remove('font-large', 'font-extra-large');
    if (tamanhoFonte === 1) {
        document.body.classList.add('font-large');
    } else if (tamanhoFonte === 2) {
        document.body.classList.add('font-extra-large');
    }
}

function toggleContraste() {
    document.body.classList.toggle('high-contrast');
    var ativo = document.body.classList.contains('high-contrast');
    salvarPreferencia('altoContraste', ativo);
    falarTexto(ativo ? 'Alto contraste ativado' : 'Alto contraste desativado');
}

function lerPagina() {
    var mainContent = document.querySelector('main') || document.querySelector('.hero');
    if (mainContent) {
        var texto = mainContent.innerText;
        falarTexto(texto);
    }
}

function falarTexto(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }
}

// ============ PREFERENCIAS (localStorage) ============

function salvarPreferencia(chave, valor) {
    try {
        var prefs = JSON.parse(localStorage.getItem('guiaDigital_prefs') || '{}');
        prefs[chave] = valor;
        localStorage.setItem('guiaDigital_prefs', JSON.stringify(prefs));
    } catch (e) {
        // localStorage indisponível
    }
}

function carregarPreferencias() {
    try {
        var prefs = JSON.parse(localStorage.getItem('guiaDigital_prefs') || '{}');
        if (prefs.tamanhoFonte !== undefined) {
            tamanhoFonte = prefs.tamanhoFonte;
            aplicarFonte();
        }
        if (prefs.altoContraste) {
            document.body.classList.add('high-contrast');
        }
    } catch (e) {
        // localStorage indisponível
    }
}

// ============ AUTENTICACAO (via API com Prisma + SQLite) ============

function fazerLogin(event) {
    event.preventDefault();
    var email = document.getElementById('email').value;
    var senha = document.getElementById('senha').value;

    fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, senha: senha })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.erro) {
            alert(data.erro);
            return;
        }
        localStorage.setItem('guiaDigital_token', data.token);
        localStorage.setItem('guiaDigital_usuarioAtual', JSON.stringify(data.usuario));
        alert('Bem-vindo(a) de volta, ' + data.usuario.nome + '! 😊');
        window.location.href = 'dashboard.html';
    })
    .catch(function() {
        alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    });
}

function fazerCadastro(event) {
    event.preventDefault();
    var nome = document.getElementById('nome').value;
    var email = document.getElementById('email').value;
    var idade = document.getElementById('idade').value;
    var senha = document.getElementById('senha').value;
    var confirmarSenha = document.getElementById('confirmarSenha').value;

    if (senha !== confirmarSenha) {
        alert('As senhas não são iguais. Por favor, digite a mesma senha nos dois campos.');
        return;
    }

    if (senha.length < 6) {
        alert('A senha precisa ter pelo menos 6 caracteres.');
        return;
    }

    fetch(API_URL + '/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, email: email, idade: idade, senha: senha })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.erro) {
            alert(data.erro);
            return;
        }
        localStorage.setItem('guiaDigital_token', data.token);
        localStorage.setItem('guiaDigital_usuarioAtual', JSON.stringify(data.usuario));
        alert('Conta criada com sucesso! 🎉 Vamos escolher seu nível de conhecimento.');
        window.location.href = 'nivel.html';
    })
    .catch(function() {
        alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    });
}

function fazerLogout() {
    localStorage.removeItem('guiaDigital_token');
    localStorage.removeItem('guiaDigital_usuarioAtual');
    window.location.href = 'index.html';
}

function confirmarExclusao() {
    var confirmacao = confirm(
        'ATENÇÃO: Isso vai apagar todos os seus dados permanentemente.\n\n' +
        'Tem certeza que deseja excluir sua conta?\n\n' +
        'Esta ação NÃO pode ser desfeita.'
    );

    if (confirmacao) {
        var token = localStorage.getItem('guiaDigital_token');
        fetch(API_URL + '/usuario', {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            localStorage.removeItem('guiaDigital_token');
            localStorage.removeItem('guiaDigital_usuarioAtual');
            alert('Sua conta e todos os seus dados foram excluídos com sucesso.');
            window.location.href = 'index.html';
        })
        .catch(function() {
            alert('Erro ao excluir conta. Tente novamente.');
        });
    }
}

// ============ MOSTRAR/OCULTAR SENHA ============

function toggleSenha() {
    var campo = document.getElementById('senha');
    var checkbox = document.getElementById('mostrarSenha');
    campo.type = checkbox.checked ? 'text' : 'password';
}

function toggleSenhaCadastro() {
    var senha = document.getElementById('senha');
    var confirmar = document.getElementById('confirmarSenha');
    var checkbox = document.getElementById('mostrarSenha');
    var tipo = checkbox.checked ? 'text' : 'password';
    senha.type = tipo;
    confirmar.type = tipo;
}

// ============ SELECAO DE NIVEL ============

function selecionarNivel(nivel, elemento) {
    var cards = document.querySelectorAll('.level-card');
    cards.forEach(function(card) {
        card.classList.remove('selected');
    });
    elemento.classList.add('selected');

    // Salvar no localStorage para uso imediato
    var usuario = JSON.parse(localStorage.getItem('guiaDigital_usuarioAtual') || '{}');
    if (usuario.id) {
        usuario.nivel = nivel;
        localStorage.setItem('guiaDigital_usuarioAtual', JSON.stringify(usuario));
    }

    // Salvar no banco via API
    var token = localStorage.getItem('guiaDigital_token');
    if (token) {
        fetch(API_URL + '/usuario/nivel', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nivel: nivel })
        }).catch(function() {});
    }

    var btnContinuar = document.getElementById('btnContinuar');
    if (btnContinuar) {
        btnContinuar.style.display = 'inline-flex';
    }

    var nivelTexto = nivel === 'iniciante' ? 'Iniciante' :
                     nivel === 'intermediario' ? 'Intermediário' : 'Avançado';
    falarTexto('Nível ' + nivelTexto + ' selecionado!');
}

// ============ TRILHAS ============

function abrirTrilha(trilha) {
    if (trilha === 'whatsapp') {
        window.location.href = 'trilha-whatsapp.html';
        return;
    }
    alert('A trilha "' + trilha + '" está sendo preparada com muito carinho!\n\n' +
          'Por enquanto, experimente a trilha de WhatsApp, que já está completa. 💬');
}

// ============ TRILHA DE WHATSAPP ============

// Conteúdo completo da trilha de WhatsApp (10 aulas)
var TRILHA_WHATSAPP = {
    id: 'whatsapp',
    nome: 'WhatsApp',
    icone: '💬',
    aulas: [
        {
            numero: 1,
            titulo: 'O que é o WhatsApp e para que serve',
            descricao: 'Conheça o aplicativo mais usado para conversar no Brasil.',
            passos: [
                'O WhatsApp é um aplicativo gratuito que funciona pela internet.',
                'Com ele você envia mensagens de texto, fotos, áudios e vídeos.',
                'Também dá para fazer chamadas de voz e de vídeo sem pagar nada a mais.',
                'Você só precisa estar conectado ao Wi-Fi ou usar os dados do celular.'
            ]
        },
        {
            numero: 2,
            titulo: 'Instalando o WhatsApp no celular',
            descricao: 'Baixe o aplicativo na loja do seu celular com segurança.',
            passos: [
                'No Android, abra a "Play Store". No iPhone, abra a "App Store".',
                'Toque na busca e escreva "WhatsApp".',
                'Procure o ícone verde com um telefone branco e toque em "Instalar".',
                'Espere baixar e depois toque em "Abrir".'
            ]
        },
        {
            numero: 3,
            titulo: 'Criando sua conta com o seu número',
            descricao: 'Configure o WhatsApp pela primeira vez usando seu telefone.',
            passos: [
                'Abra o WhatsApp e toque em "Concordar e continuar".',
                'Digite o seu número de celular com o DDD.',
                'O app envia um código por SMS para confirmar que o número é seu.',
                'Digite o código recebido e pronto: sua conta está criada!'
            ]
        },
        {
            numero: 4,
            titulo: 'Conhecendo a tela inicial',
            descricao: 'Entenda onde fica cada coisa dentro do aplicativo.',
            passos: [
                'Na aba "Conversas" ficam todas as suas mensagens.',
                'Na aba "Ligações" ficam as chamadas que você fez ou recebeu.',
                'O lápis ou o balãozinho serve para começar uma conversa nova.',
                'Toque no nome de uma pessoa para abrir a conversa com ela.'
            ]
        },
        {
            numero: 5,
            titulo: 'Enviando sua primeira mensagem de texto',
            descricao: 'Aprenda a escrever e enviar uma mensagem.',
            passos: [
                'Abra a conversa com a pessoa com quem você quer falar.',
                'Toque na barra branca embaixo, onde está escrito "Mensagem".',
                'Escreva o que quiser usando o teclado que aparece na tela.',
                'Toque na setinha verde para enviar. Pronto!'
            ]
        },
        {
            numero: 6,
            titulo: 'Enviando fotos e vídeos',
            descricao: 'Compartilhe momentos com a família e os amigos.',
            passos: [
                'Dentro de uma conversa, toque no ícone de clipe ou de câmera.',
                'Escolha "Galeria" para enviar uma foto que você já tirou.',
                'Toque na foto ou no vídeo que deseja enviar.',
                'Toque na setinha verde para mandar.'
            ]
        },
        {
            numero: 7,
            titulo: 'Gravando e enviando áudios',
            descricao: 'Mande recados de voz quando não quiser digitar.',
            passos: [
                'Abra a conversa desejada.',
                'Toque e segure o ícone do microfone, do lado direito.',
                'Fale o seu recado enquanto mantém o dedo no microfone.',
                'Solte o dedo para enviar o áudio automaticamente.'
            ]
        },
        {
            numero: 8,
            titulo: 'Fazendo chamadas de voz e de vídeo',
            descricao: 'Converse olhando para a pessoa, de graça.',
            passos: [
                'Abra a conversa com a pessoa para quem deseja ligar.',
                'Toque no ícone de telefone para uma chamada de voz.',
                'Toque no ícone de câmera para uma chamada de vídeo.',
                'Para encerrar, toque no botão vermelho.'
            ]
        },
        {
            numero: 9,
            titulo: 'Criando e participando de grupos',
            descricao: 'Converse com várias pessoas ao mesmo tempo, como a família.',
            passos: [
                'Toque no menu (três pontinhos) e escolha "Novo grupo".',
                'Selecione as pessoas que vão participar.',
                'Dê um nome ao grupo, como "Família" ou "Amigos".',
                'Toque em confirmar para criar o grupo.'
            ]
        },
        {
            numero: 10,
            titulo: 'Segurança e privacidade: evitando golpes',
            descricao: 'Proteja-se de mensagens falsas e pessoas mal-intencionadas.',
            passos: [
                'Nunca compartilhe o código de 6 dígitos que chega por SMS.',
                'Desconfie de mensagens pedindo dinheiro, mesmo de conhecidos.',
                'Ative a "Confirmação em duas etapas" nas configurações.',
                'Na dúvida, ligue para a pessoa para confirmar se a mensagem é verdadeira.'
            ]
        }
    ]
};

function obterAulaWhatsapp(numero) {
    for (var i = 0; i < TRILHA_WHATSAPP.aulas.length; i++) {
        if (TRILHA_WHATSAPP.aulas[i].numero === numero) {
            return TRILHA_WHATSAPP.aulas[i];
        }
    }
    return null;
}

function renderizarAulasWhatsapp() {
    var container = document.getElementById('listaAulas');
    if (!container) return;

    var html = '';
    TRILHA_WHATSAPP.aulas.forEach(function (aula) {
        var passosHtml = '';
        aula.passos.forEach(function (passo) {
            passosHtml += '<li>' + passo + '</li>';
        });

        html +=
            '<article class="lesson-card" id="aula-' + aula.numero + '" data-aula="' + aula.numero + '">' +
                '<div class="lesson-header">' +
                    '<span class="lesson-number">' + aula.numero + '</span>' +
                    '<div class="lesson-titles">' +
                        '<h3 class="lesson-title">' + aula.titulo + '</h3>' +
                        '<p class="lesson-desc">' + aula.descricao + '</p>' +
                    '</div>' +
                    '<span class="lesson-check" id="check-' + aula.numero + '">⬜</span>' +
                '</div>' +
                '<ul class="lesson-steps">' + passosHtml + '</ul>' +
                '<button type="button" class="btn btn-outline lesson-btn" id="btn-' + aula.numero + '" ' +
                    'onclick="alternarAula(' + aula.numero + ', this)">' +
                    '✅ Marcar como concluída' +
                '</button>' +
            '</article>';
    });

    container.innerHTML = html;
}

function carregarTrilhaWhatsapp() {
    renderizarAulasWhatsapp();

    var token = getToken();
    if (!token) {
        var aviso = document.getElementById('avisoLogin');
        if (aviso) aviso.style.display = 'block';
        return;
    }

    fetch(API_URL + '/trilhas/whatsapp/progresso', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data && data.aulasConcluidas) {
            aplicarProgressoWhatsapp(data);
        }
    })
    .catch(function () {});
}

function aplicarProgressoWhatsapp(data) {
    TRILHA_WHATSAPP.aulas.forEach(function (aula) {
        var concluida = data.aulasConcluidas.indexOf(aula.numero) !== -1;
        atualizarVisualAula(aula.numero, concluida);
    });

    var barra = document.getElementById('barraProgressoWhatsapp');
    if (barra) {
        barra.style.width = data.percentual + '%';
        barra.textContent = data.percentual + '%';
    }
    var contador = document.getElementById('contadorAulas');
    if (contador) {
        contador.textContent = data.quantidadeConcluida + ' de ' + data.totalAulas + ' aulas concluídas';
    }
    var parabens = document.getElementById('mensagemParabens');
    if (parabens) {
        parabens.style.display = data.concluida ? 'block' : 'none';
    }
}

function atualizarVisualAula(numero, concluida) {
    var card = document.getElementById('aula-' + numero);
    var check = document.getElementById('check-' + numero);
    var btn = document.getElementById('btn-' + numero);
    if (!card) return;

    if (concluida) {
        card.classList.add('lesson-done');
        if (check) check.textContent = '✅';
        if (btn) {
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-secondary');
            btn.innerHTML = '↩️ Desfazer conclusão';
        }
    } else {
        card.classList.remove('lesson-done');
        if (check) check.textContent = '⬜';
        if (btn) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-outline');
            btn.innerHTML = '✅ Marcar como concluída';
        }
    }
}

function alternarAula(numero, botao) {
    var token = getToken();
    if (!token) {
        alert('Para salvar o seu progresso, entre na sua conta primeiro. 😊');
        window.location.href = 'login.html';
        return;
    }

    var card = document.getElementById('aula-' + numero);
    var jaConcluida = card && card.classList.contains('lesson-done');
    var aula = obterAulaWhatsapp(numero);

    if (botao) botao.disabled = true;

    var requisicao;
    if (jaConcluida) {
        requisicao = fetch(API_URL + '/trilhas/whatsapp/aula/' + numero, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
    } else {
        requisicao = fetch(API_URL + '/trilhas/whatsapp/aula', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                aula: numero,
                tituloAula: aula ? aula.titulo : ('Aula ' + numero)
            })
        });
    }

    requisicao
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (botao) botao.disabled = false;
            if (data.erro) {
                alert(data.erro);
                return;
            }
            aplicarProgressoWhatsapp(data);
            sincronizarUsuario(data.usuario);
            if (!jaConcluida) {
                falarTexto('Aula ' + numero + ' concluída! Parabéns!');
            }
        })
        .catch(function () {
            if (botao) botao.disabled = false;
            alert('Não conseguimos salvar agora. Verifique sua internet e se o servidor está ligado.');
        });
}

// Atualiza a barra de progresso da trilha de WhatsApp na página de Trilhas
function carregarProgressoNasTrilhas() {
    var token = getToken();
    var barra = document.getElementById('barraWhatsappTrilhas');
    if (!token || !barra) return;

    fetch(API_URL + '/trilhas/whatsapp/progresso', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data && typeof data.percentual === 'number') {
            barra.style.width = data.percentual + '%';
            barra.textContent = data.percentual + '%';
        }
    })
    .catch(function () {});
}

// ============ ASSISTENTE VIRTUAL ============

function toggleAssistant() {
    var panel = document.getElementById('assistantPanel');
    panel.classList.toggle('open');
}

function enviarMensagem() {
    var input = document.getElementById('assistantInput');
    var mensagem = input.value.trim();

    if (!mensagem) return;

    adicionarMensagem(mensagem, 'user');
    input.value = '';

    setTimeout(function() {
        var resposta = gerarRespostaAssistente(mensagem);
        adicionarMensagem(resposta, 'bot');
        falarTexto(resposta);
    }, 800);
}

function adicionarMensagem(texto, tipo) {
    var container = document.getElementById('assistantMessages');
    var div = document.createElement('div');
    div.className = 'assistant-message ' + tipo;
    div.textContent = texto;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function gerarRespostaAssistente(pergunta) {
    var p = pergunta.toLowerCase();

    if (p.includes('whatsapp')) {
        return 'O WhatsApp é um aplicativo de mensagens que funciona pela internet. ' +
               'Com ele você pode enviar mensagens de texto, fotos, áudios e fazer chamadas de vídeo gratuitamente! ' +
               'Temos uma trilha completa sobre isso.';
    }
    if (p.includes('senha') || p.includes('password')) {
        return 'Uma senha é como uma chave digital que protege sua conta. ' +
               'Dica: use pelo menos 6 caracteres misturando letras e números. ' +
               'Nunca compartilhe sua senha com ninguém!';
    }
    if (p.includes('golpe') || p.includes('fraude')) {
        return 'Cuidado com golpes! Nunca clique em links de mensagens estranhas. ' +
               'Bancos NUNCA pedem sua senha por mensagem ou ligação. ' +
               'Na dúvida, ligue diretamente para o banco. Temos uma trilha sobre isso!';
    }
    if (p.includes('pix')) {
        return 'O Pix é um sistema de pagamento instantâneo do Banco Central. ' +
               'Com ele você pode transferir dinheiro em segundos, 24 horas por dia. ' +
               'É seguro quando usado pelo aplicativo oficial do seu banco!';
    }
    if (p.includes('email') || p.includes('e-mail')) {
        return 'O e-mail é como uma carta eletrônica. Você pode enviar mensagens, ' +
               'documentos e fotos para qualquer pessoa que tenha um endereço de e-mail. ' +
               'Os mais usados são Gmail, Outlook e Yahoo.';
    }
    if (p.includes('instagram') || p.includes('facebook') || p.includes('rede social')) {
        return 'Redes sociais são como praças virtuais onde você pode encontrar amigos, ' +
               'família e compartilhar fotos e momentos. Facebook e Instagram são os mais populares. ' +
               'Temos uma trilha ensinando a usar!';
    }
    if (p.includes('internet') || p.includes('wifi') || p.includes('wi-fi')) {
        return 'A internet é como uma grande biblioteca mundial que conecta computadores e celulares. ' +
               'O Wi-Fi é a forma de se conectar sem fio. Em casa, é o "sinal" que seu roteador emite.';
    }
    if (p.includes('aplicativo') || p.includes('app')) {
        return 'Aplicativos (ou "apps") são programas que você instala no celular. ' +
               'É como adicionar funções novas. Você encontra na Play Store (Android) ou App Store (iPhone). ' +
               'Muitos são gratuitos!';
    }
    if (p.includes('obrigad')) {
        return 'De nada! Estou sempre aqui para ajudar. Não tenha vergonha de perguntar, ' +
               'toda dúvida é importante! 😊';
    }
    if (p.includes('olá') || p.includes('oi') || p.includes('bom dia') || p.includes('boa tarde') || p.includes('boa noite')) {
        return 'Olá! Que bom falar com você! 😊 Pode me perguntar qualquer coisa sobre tecnologia. ' +
               'Estou aqui para ajudar!';
    }

    return 'Boa pergunta! Infelizmente ainda não sei responder sobre isso, ' +
           'mas você pode encontrar mais informações nas nossas trilhas de aprendizado. ' +
           'Tente perguntar sobre WhatsApp, senhas, Pix, golpes, e-mail ou redes sociais!';
}

// ============ DASHBOARD - CARREGAR DADOS ============

function carregarDashboard() {
    var usuario = getUsuarioAtual();

    if (usuario.nome) {
        var nomeEl = document.getElementById('nomeUsuario');
        if (nomeEl) nomeEl.textContent = usuario.nome;
    }
    atualizarNivelDashboard(usuario.nivel);
    atualizarStatsDashboard(usuario);

    var token = getToken();
    if (!token) return;

    // Dados atualizados do usuário direto do servidor
    fetch(API_URL + '/usuario', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data && data.id) {
            salvarUsuarioAtual(data);
            var nomeEl = document.getElementById('nomeUsuario');
            if (nomeEl) nomeEl.textContent = data.nome;
            atualizarNivelDashboard(data.nivel);
            atualizarStatsDashboard(data);
        }
    })
    .catch(function () {});

    // Progresso da trilha de WhatsApp para mostrar no painel
    fetch(API_URL + '/trilhas/whatsapp/progresso', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data && typeof data.percentual === 'number') {
            atualizarTrilhaWhatsappDashboard(data);
        }
    })
    .catch(function () {});
}

function formatarNivel(nivel) {
    return nivel === 'iniciante' ? 'Iniciante' :
           nivel === 'intermediario' ? 'Intermediário' :
           nivel === 'avancado' ? 'Avançado' : (nivel || 'Iniciante');
}

function atualizarNivelDashboard(nivel) {
    var nivelEl = document.getElementById('nivel');
    if (nivelEl && nivel) nivelEl.textContent = formatarNivel(nivel);
}

function definirTexto(id, valor) {
    var el = document.getElementById(id);
    if (el && valor !== undefined && valor !== null) {
        el.textContent = valor;
    }
}

function atualizarStatsDashboard(usuario) {
    definirTexto('aulasCompletas', usuario.aulasCompletas);
    definirTexto('pontuacao', usuario.pontuacao);
    definirTexto('certificados', usuario.certificados);

    if (typeof usuario.aulasCompletas === 'number') {
        var pct = Math.round((usuario.aulasCompletas / TOTAL_AULAS_PLATAFORMA) * 100);
        var barra = document.getElementById('progressoGeral');
        if (barra) {
            barra.style.width = pct + '%';
            barra.textContent = pct + '%';
        }
        var resumo = document.getElementById('resumoGeral');
        if (resumo) {
            resumo.textContent = 'Você completou ' + usuario.aulasCompletas +
                ' de ' + TOTAL_AULAS_PLATAFORMA + ' aulas disponíveis. Continue assim!';
        }
    }
}

function atualizarTrilhaWhatsappDashboard(data) {
    var barra = document.getElementById('barraWhatsappDashboard');
    if (barra) {
        barra.style.width = data.percentual + '%';
        barra.textContent = data.percentual > 0 ? data.percentual + '%' : '';
    }
    var texto = document.getElementById('textoWhatsappDashboard');
    if (texto) {
        texto.textContent = data.quantidadeConcluida + ' de ' + data.totalAulas + ' aulas concluídas';
    }
    var btn = document.getElementById('btnWhatsappDashboard');
    if (btn) {
        btn.textContent = data.quantidadeConcluida > 0 ? 'Continuar ➡️' : 'Iniciar ➡️';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
    }
}

// ============ INICIALIZACAO ============

document.addEventListener('DOMContentLoaded', function() {
    carregarPreferencias();

    if (document.getElementById('listaAulas')) {
        carregarTrilhaWhatsapp();
    }

    if (document.querySelector('.dashboard-container')) {
        carregarDashboard();
    }

    if (document.getElementById('barraWhatsappTrilhas')) {
        carregarProgressoNasTrilhas();
    }

    // Suporte a teclado para os cartões de nível
    var levelCards = document.querySelectorAll('.level-card');
    levelCards.forEach(function(card) {
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
});
