//perfil-atleta-social.js

const perfilStorageKey = "perfilAtleta";
const fotoStorageKey = "fotoPerfil";
const publicacoesStorageKey = "publicacoes";

const parametros = new URLSearchParams(window.location.search);
const idAtleta = parametros.get("id");

const perfilPadrao = {
    nome: "Gabriel Almeida",
    usuario: "gabrielalmeida",
    posicao: "Atacante",
    categoria: "Sub-20",
    cidade: "São Paulo - SP",
    peDominante: "Direito",
    altura: "1,78 m",
    peso: "72 kg",
    nivel: "Nível 18",
    ranking: "#10",
    bio: "Atacante com perfil ofensivo, velocidade e boa capacidade de finalização. Em busca de novas oportunidades para evoluir no futebol.",
    sobre: "Apaixonado por futebol e comprometido com a evolução técnica, física e tática dentro e fora de campo."
};

function obterPerfil() {
    const publicacoes = obterPublicacoesSalvas();
    const identificador = idAtleta;

    let perfilSalvo;

    try {
        perfilSalvo = JSON.parse(localStorage.getItem(perfilStorageKey));
    } catch {
        perfilSalvo = null;
    }

    if (
        !identificador ||
        String(identificador) === String(perfilSalvo?.id) ||
        String(identificador) === String(perfilSalvo?.usuario)
    ) {
        return {
            ...perfilPadrao,
            ...perfilSalvo
        };
    }

    const publicacaoAtleta = publicacoes.find((publicacao) =>
        String(publicacao.usuarioId) === String(identificador) ||
        String(publicacao.usuario) === String(identificador)
    );

    if (publicacaoAtleta) {
        return {
            ...perfilPadrao,
            id: publicacaoAtleta.usuarioId,
            nome: publicacaoAtleta.usuarioNome || perfilPadrao.nome,
            usuario: publicacaoAtleta.usuario || perfilPadrao.usuario
        };
    }

    return {
        ...perfilPadrao,
        id: identificador
    };
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento && valor !== undefined && valor !== null) {
        elemento.textContent = valor;
    }
}

const foto = obterFotoPerfil();

aplicarFoto(document.getElementById("fotoAtleta"), foto);
aplicarFoto(document.getElementById("fotoCabecalho"), foto);

function aplicarFoto(elemento, foto) {
    if (!elemento) {
        return;
    }

    elemento.src = foto || "../../assets/images/avatar-padrao.png";
    elemento.hidden = false;

    elemento.onerror = () => {
        elemento.onerror = null;
        elemento.src = "../../assets/images/avatar-padrao.png";
    };
}

function carregarPerfil() {
    const perfil = obterPerfil();

    definirTexto("nomeAtleta", perfil.nome);
    definirTexto("nomeCabecalho", perfil.nome);
    definirTexto("usuarioAtleta", `@${perfil.usuario || "atleta"}`);
    definirTexto("bioAtleta", perfil.bio);
    definirTexto("sobreAtleta", perfil.sobre || perfil.bio);

    definirTexto("posicaoAtleta", perfil.posicao);
    definirTexto("categoriaAtleta", perfil.categoria);
    definirTexto("cidadeAtleta", perfil.cidade);
    definirTexto("peAtleta", perfil.peDominante);
    definirTexto("alturaAtleta", perfil.altura);
    definirTexto("pesoAtleta", perfil.peso);
    definirTexto("nivelAtleta", perfil.nivel);
    definirTexto("rankingAtleta", perfil.ranking);

    definirTexto("posicaoCabecalho", `${perfil.posicao} · ${perfil.categoria}`);

    definirTexto("sobrePosicao", perfil.posicao);
    definirTexto("sobreCategoria", perfil.categoria);
    definirTexto("sobreAltura", perfil.altura);
    definirTexto("sobrePeso", perfil.peso);
    definirTexto("sobrePe", perfil.peDominante);
    definirTexto("sobreRanking", perfil.ranking);

    const foto = obterFotoPerfil();

    aplicarFoto(document.getElementById("fotoAtleta"), foto);
    aplicarFoto(document.getElementById("fotoCabecalho"), foto);

    document.querySelectorAll(".post-avatar").forEach((imagem) => {
        aplicarFoto(imagem, foto);
    });

    document.querySelectorAll(".post-author strong").forEach((nome) => {
        nome.textContent = perfil.nome;
    });

    document.querySelectorAll(".post-author span").forEach((usuario) => {
        usuario.textContent = `@${perfil.usuario || "atleta"}`;
    });
}

function configurarSeguir() {
    const botao = document.getElementById("btnSeguir");
    const total = document.getElementById("totalSeguidores");

    if (!botao || !total) {
        return;
    }

    let seguindo = false;
    const seguidoresIniciais = Number(total.textContent) || 0;

    botao.addEventListener("click", () => {
        seguindo = !seguindo;
        botao.textContent = seguindo ? "✓ Seguindo" : "+ Seguir";
        botao.classList.toggle("following", seguindo);
        botao.setAttribute("aria-pressed", String(seguindo));

        total.textContent = String(
            seguidoresIniciais + (seguindo ? 1 : 0)
        );
    });
}

function obterPublicacoesSalvas() {
    try {
        const publicacoes = JSON.parse(
            localStorage.getItem(publicacoesStorageKey) || "[]"
        );

        return Array.isArray(publicacoes) ? publicacoes : [];
    } catch {
        return [];
    }
}

function salvarPublicacoesSalvas(publicacoes) {
    try {
        localStorage.setItem(
            publicacoesStorageKey,
            JSON.stringify(publicacoes)
        );

        return true;
    } catch (erro) {
        console.error("Erro ao salvar publicações:", erro);
        alert("Não foi possível atualizar a publicação no armazenamento.");
        return false;
    }
}

function configurarCurtidas() {
    document.querySelectorAll(".like-btn").forEach((botao) => {
        botao.addEventListener("click", () => {
            const curtido = botao.classList.toggle("liked");
            botao.textContent = curtido ? "♥ Curtido" : "♡ Curtir";
            botao.setAttribute("aria-pressed", String(curtido));

            const publicacao = botao.closest(".post");
            const quantidade = publicacao?.querySelector(
                ".post-stats span:first-child b"
            );

            if (quantidade) {
                const atual = Number(quantidade.textContent) || 0;
                quantidade.textContent = String(
                    Math.max(0, atual + (curtido ? 1 : -1))
                );
            }
        });
    });
}

function configurarComentarios() { }

function configurarCompartilhamento() {
    document.querySelectorAll(".share-btn").forEach((botao) => {
        botao.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link do perfil copiado!");
            } catch {
                prompt("Copie o link do perfil:", window.location.href);
            }
        });
    });
}

function configurarMensagem() {
    document.getElementById("btnMensagem")?.addEventListener("click", () => {
        alert("Integre este botão à funcionalidade de mensagens da rede social.");
    });
}

function atualizarPublicacaoSalva(id, alteracoes) {
    const publicacoes = obterPublicacoesSalvas();
    const indice = publicacoes.findIndex(
        (item) => String(item.id) === String(id)
    );

    if (indice === -1) {
        return false;
    }

    publicacoes[indice] = {
        ...publicacoes[indice],
        ...alteracoes
    };

    return salvarPublicacoesSalvas(publicacoes);
}

function formatarComentarios(comentarios) {
    if (!Array.isArray(comentarios)) {
        return [];
    }

    return comentarios.map((comentario) => {
        if (typeof comentario === "string") {
            return {
                id: `comentario-${Date.now()}-${Math.random()}`,
                autor: "Atleta",
                usuario: "atleta",
                texto: comentario,
                data: new Date().toISOString()
            };
        }

        return comentario;
    });
}

function formatarDataPublicacao(data) {
    if (!data) {
        return "Agora mesmo";
    }

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "Agora mesmo";
    }

    const diferenca = Math.max(
        0,
        Math.floor((Date.now() - dataConvertida.getTime()) / 1000)
    );

    if (diferenca < 60) {
        return "há poucos segundos";
    }

    if (diferenca < 3600) {
        return `há ${Math.floor(diferenca / 60)} min`;
    }

    if (diferenca < 86400) {
        return `há ${Math.floor(diferenca / 3600)} h`;
    }

    return `há ${Math.floor(diferenca / 86400)} dias`;
}

function criarMidiaPublicacao(arquivos) {
    const midias = document.createElement("div");
    midias.className = "post-media";

    if (!Array.isArray(arquivos) || arquivos.length === 0) {
        return midias;
    }

    arquivos.forEach((arquivo) => {
        const tipo = arquivo.tipo || arquivo.type || "";
        const origem = arquivo.dados || arquivo.url || "";

        if (!origem) {
            return;
        }

        if (tipo.startsWith("image/")) {
            const imagem = document.createElement("img");
            imagem.className = "post-image";
            imagem.src = origem;
            imagem.alt = arquivo.nome || "Imagem da publicação";
            imagem.loading = "lazy";
            midias.appendChild(imagem);
        } else if (tipo.startsWith("video/")) {
            const video = document.createElement("video");
            video.className = "post-image";
            video.src = origem;
            video.controls = true;
            video.playsInline = true;
            video.preload = "metadata";
            midias.appendChild(video);
        }
    });

    return midias;
}

function obterFotoPerfil(publicacao) {
    const fotoSalva = localStorage.getItem(fotoStorageKey);

    if (fotoSalva) {
        return fotoSalva;
    }

    if (publicacao && publicacao.fotoPerfil) {
        return publicacao.fotoPerfil;
    }

    return "";
}

function criarPublicacaoPerfil(publicacao, perfil) {
    const artigo = document.createElement("article");
    artigo.className = "post card";
    artigo.dataset.id = publicacao.id || "";

    const cabecalho = document.createElement("div");
    cabecalho.className = "post-header";

    const foto = document.createElement("img");
    foto.className = "post-avatar";
    foto.alt = "Foto do atleta";
    aplicarFoto(foto, publicacao.fotoPerfil || obterFotoPerfil());

    const autor = document.createElement("div");
    autor.className = "post-author";

    const nome = document.createElement("strong");
    nome.textContent = publicacao.usuarioNome || perfil.nome;

    const data = document.createElement("span");
    data.textContent = `@${publicacao.usuario || perfil.usuario} · ${formatarDataPublicacao(publicacao.data)}`;

    autor.append(nome, data);
    cabecalho.append(foto, autor);
    artigo.appendChild(cabecalho);

    const textoPublicacao = publicacao.texto || publicacao.conteudo || "";

    if (textoPublicacao) {
        const texto = document.createElement("p");
        texto.className = "post-text";
        texto.textContent = textoPublicacao;
        artigo.appendChild(texto);
    }

    if (Array.isArray(publicacao.arquivos) && publicacao.arquivos.length > 0) {
        artigo.appendChild(criarMidiaPublicacao(publicacao.arquivos));
    } else {
        const imagemUrl = publicacao.imagem || publicacao.foto;

        if (imagemUrl) {
            const imagem = document.createElement("img");
            imagem.className = "post-image";
            imagem.src = imagemUrl;
            imagem.alt = "Imagem da publicação";
            imagem.loading = "lazy";
            artigo.appendChild(imagem);
        }
    }

    const estatisticas = document.createElement("div");
    estatisticas.className = "post-stats";

    const totalCurtidas = document.createElement("span");
    const numeroCurtidas = document.createElement("b");
    numeroCurtidas.textContent = String(Number(publicacao.curtidas) || 0);
    totalCurtidas.append("❤️ ", numeroCurtidas, " curtidas");

    const totalComentarios = document.createElement("span");
    const comentarios = Array.isArray(publicacao.comentarios)
        ? publicacao.comentarios.length
        : Number(publicacao.comentarios) || 0;

    totalComentarios.textContent = `💬 ${comentarios} comentários`;

    estatisticas.append(totalCurtidas, totalComentarios);
    artigo.appendChild(estatisticas);

    const acoes = document.createElement("div");
    acoes.className = "post-actions";

    const botaoCurtir = document.createElement("button");
    botaoCurtir.type = "button";
    botaoCurtir.className = "like-btn";
    botaoCurtir.textContent = "♡ Curtir";

    const botaoCompartilhar = document.createElement("button");
    botaoCompartilhar.type = "button";
    botaoCompartilhar.className = "share-btn";
    botaoCompartilhar.textContent = "Compartilhar";

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "btn-apagar-publicacao";
    botaoExcluir.textContent = "Excluir publicação";

    acoes.append(botaoCurtir, botaoCompartilhar, botaoExcluir);
    artigo.appendChild(acoes);

    botaoCurtir.addEventListener("click", () => {
        const curtido = botaoCurtir.classList.toggle("liked");
        botaoCurtir.textContent = curtido ? "♥ Curtido" : "♡ Curtir";
        botaoCurtir.setAttribute("aria-pressed", String(curtido));

        const atual = Number(numeroCurtidas.textContent) || 0;
        numeroCurtidas.textContent = String(
            Math.max(0, atual + (curtido ? 1 : -1))
        );
    });

    botaoCompartilhar.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link do perfil copiado!");
        } catch {
            prompt("Copie o link do perfil:", window.location.href);
        }
    });

    botaoExcluir.addEventListener("click", () => {
        if (!confirm("Tem certeza de que deseja excluir esta publicação?")) {
            return;
        }

        const publicacoesAtualizadas = obterPublicacoesSalvas().filter(
            (item) => String(item.id) !== String(publicacao.id)
        );

        if (!salvarPublicacoesSalvas(publicacoesAtualizadas)) {
            return;
        }

        artigo.remove();

        const feed = document.getElementById("feedAtleta");
        const vazio = document.getElementById("feedVazio");
        const total = document.getElementById("totalPublicacoes");

        const identificadorPerfil = String(
            idAtleta || perfil.id || perfil.usuario || "gabrielalmeida"
        );
        const restantesDoPerfil = publicacoesAtualizadas.filter((item) => {
            const identificadores = [
                item.usuarioId,
                item.usuario,
                item.atletaId
            ].filter((valor) => valor !== undefined && valor !== null);

            return identificadores.some(
                (identificador) =>
                    String(identificador) === String(identificadorPerfil)
            );
        });

        if (total) {
            total.textContent = String(restantesDoPerfil.length);
        }

        if (feed && feed.children.length === 0 && vazio) {
            vazio.hidden = false;
        }
    });

    return artigo;
}

function carregarPublicacoes() {
    const feed = document.getElementById("feedAtleta");
    const vazio = document.getElementById("feedVazio");
    const totalElemento = document.getElementById("totalPublicacoes");

    if (!feed || !vazio) {
        console.error(
            "Não foram encontrados os elementos feedAtleta ou feedVazio."
        );
        return;
    }

    const publicacoes = obterPublicacoesSalvas();
    const perfil = obterPerfil();
    const identificadorPerfil = String(
        idAtleta || perfil.id || perfil.usuario
    );

    const minhasPublicacoes = publicacoes.filter((publicacao) => {
        return [
            publicacao.usuarioId,
            publicacao.usuario,
            publicacao.atletaId
        ].some((identificador) => {
            return identificador != null &&
                String(identificador) === identificadorPerfil;
        });
    });

    feed.replaceChildren();

    if (totalElemento) {
        totalElemento.textContent = String(minhasPublicacoes.length);
    }

    vazio.hidden = minhasPublicacoes.length > 0;

    minhasPublicacoes.forEach((publicacao) => {
        const elemento = criarPublicacaoPerfil(publicacao, perfil);
        feed.appendChild(elemento);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    carregarPerfil();
    carregarPublicacoes();
    configurarSeguir();
    configurarCurtidas();
    configurarComentarios();
    configurarCompartilhamento();
    configurarMensagem();
});

window.addEventListener("storage", (evento) => {
    if (evento.key === publicacoesStorageKey) {
        carregarPublicacoes();
    }
});

window.addEventListener("focus", () => {
    carregarPublicacoes();
});