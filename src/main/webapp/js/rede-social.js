const API = "../RedeSocialController";

const publicacaoDialog = document.getElementById("Publicacao");
const feedDialog = document.getElementById("Feed");
const storyDialog = document.getElementById("Story");
const comentariosDialog = document.getElementById("Comentarios");
const visualizarStoryDialog = document.getElementById("visualizarStory");

const timeline = document.getElementById("timeline");
const listaStories = document.getElementById("listaStories");

const formFeed = document.getElementById("formFeed");
const arquivoFeed = document.getElementById("arquivoFeed");
const legendaFeed = document.getElementById("legendaFeed");
const previewFeed = document.getElementById("previewFeed");

const arquivoStory = document.getElementById("arquivoStory");
const previewStory = document.getElementById("previewStory");
const btnPublicarStory = document.getElementById("btnpublicarStory");

const sessaoComentarios = document.getElementById("sessaoComentarios");
const inputComentarios = document.getElementById("inputComentarios");
const btnEnviarComentarios = document.getElementById("btnEnviarComentarios");

let arquivosFeed = [];
let arquivosStory = [];
let publicacaoComentarioAtual = null;
let stories = [];
let indiceStory = 0;

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: "same-origin",
        ...opcoes
    });

    const dados = await resposta.json();

    if (!resposta.ok || dados.sucesso === false) {
        throw new Error(dados.mensagem || "Erro na requisição.");
    }

    return dados;
}

function identificarMime(bytes) {
    if (
        bytes.length >= 8 &&
        bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 &&
        bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 &&
        bytes[6] === 26 && bytes[7] === 10
    ) return "image/png";

    if (
        bytes.length >= 3 &&
        bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    ) return "image/jpeg";

    if (
        bytes.length >= 12 &&
        bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
        bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80
    ) return "image/webp";

    if (
        bytes.length >= 6 &&
        (String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a" ||
         String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a")
    ) return "image/gif";

    return "application/octet-stream";
}


function dataUrl(bytes, mime = "application/octet-stream") {
    if (bytes == null || bytes === "") return "";

    if (typeof bytes === "string") {
        if (
            bytes.startsWith("data:") ||
            bytes.startsWith("http://") ||
            bytes.startsWith("https://") ||
            bytes.startsWith("/") ||
            bytes.startsWith("../") ||
            bytes.startsWith("../../")
        ) return bytes;

        try {
            const binario = atob(bytes);
            const array = new Uint8Array(binario.length);

            for (let i = 0; i < binario.length; i++) {
                array[i] = binario.charCodeAt(i);
            }

            const mimeDetectado = identificarMime(array);
            const tipoFinal = mimeDetectado !== "application/octet-stream"
                ? mimeDetectado
                : mime;

            return URL.createObjectURL(new Blob([array], { type: tipoFinal }));
        } catch (erro) {
            console.error("Erro ao converter mídia Base64:", erro);
            return "";
        }
    }

    if (Array.isArray(bytes) || bytes instanceof Uint8Array) {
        const array = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
        const mimeDetectado = identificarMime(array);
        const tipoFinal = mimeDetectado !== "application/octet-stream"
            ? mimeDetectado
            : mime;

        return URL.createObjectURL(new Blob([array], { type: tipoFinal }));
    }

    console.error("Formato de mídia não reconhecido:", bytes);
    return "";
}

function criarAvatar(foto, nome) {
    const avatar = document.createElement("div");
    avatar.className = "avatar post-avatar";

    if (foto) {
        const img = document.createElement("img");
        img.src = dataUrl(foto, "image/jpeg");
        img.alt = "Foto de perfil";
        avatar.appendChild(img);
    } else {
        avatar.textContent = (nome || "Atleta")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(p => p[0])
            .join("")
            .toUpperCase();
    }

    return avatar;
}

function formatarData(data) {
    if (!data) return "";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) return "";

    return dataObj.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function criarMidias(midias) {
    const container = document.createElement("div");
    container.className = "post-media";

    if (!midias || midias.length === 0) {
        container.remove();
        return null;
    }

    const galeria = document.createElement("div");
    galeria.className = "post-galeria";

    midias.forEach(midia => {
        const elemento = midia.tipo === "VIDEO"
            ? document.createElement("video")
            : document.createElement("img");

        elemento.src = dataUrl(midia.arquivo, midia.mime);

        if (elemento.tagName === "VIDEO") {
            elemento.controls = true;
            elemento.playsInline = true;
        } else {
            elemento.alt = "Imagem da publicação";
        }

        galeria.appendChild(elemento);
    });

    container.appendChild(galeria);

    return container;
}

async function compartilharPublicacao(post) {
    const link = new URL(window.location.href);
    link.hash = `publicacao-${post.id}`;
    const dados = {
        title: `Publicação de ${post.nome || "atleta"} · Club Flow`,
        text: post.texto || "Confira esta publicação no Club Flow.",
        url: link.href
    };
    try {
        if (navigator.share) {
            await navigator.share(dados);
        } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(link.href);
            alert("Link da publicação copiado!");
        } else {
            prompt("Copie o link da publicação:", link.href);
        }
    } catch (erro) {
        if (erro.name !== "AbortError") {
            prompt("Copie o link da publicação:", link.href);
        }
    }
}

function criarPost(post) {
    const card = document.createElement("article");
    card.className = "card-post";
    card.dataset.id = post.id;
    card.id = `publicacao-${post.id}`;

    const cabecalho = document.createElement("div");
    cabecalho.className = "post-head";

    cabecalho.appendChild(criarAvatar(post.fotoPerfil, post.nome));

    const identificacao = document.createElement("div");

    const nome = document.createElement("a");
    nome.className = "nome-atleta-link";
    nome.textContent = post.nome || "Atleta";
    nome.href = `perfil-atleta-social.html?id=${encodeURIComponent(post.idAtleta)}`;

    const data = document.createElement("small");
    data.className = "post-hora";
    data.textContent = formatarData(post.data);

    identificacao.append(nome, data);
    cabecalho.appendChild(identificacao);

    card.appendChild(cabecalho);

    const midias = criarMidias(post.midias);

    if (midias) {
        card.appendChild(midias);
    }

    if (post.texto) {
        const texto = document.createElement("p");
        texto.className = "post-body";
        texto.textContent = post.texto;
        card.appendChild(texto);
    }

    const acoes = document.createElement("div");
    acoes.className = "post-actions";

    const btnCurtir = document.createElement("button");
    btnCurtir.type = "button";
    btnCurtir.className = "btn-curtida";

    function atualizarCurtir() {
        btnCurtir.classList.toggle("curtido", post.curtido);

        btnCurtir.textContent =
            `${post.curtido ? "♥" : "♡"} ${post.curtidas || 0}`;
    }

    atualizarCurtir();

    btnCurtir.addEventListener("click", async () => {
        try {
            const resultado = await requisicao(API, {
                method: "POST",
                body: new URLSearchParams({
                    acao: "curtir",
                    id: post.id
                })
            });

            post.curtido = resultado.curtido;
            post.curtidas += post.curtido ? 1 : -1;
            atualizarCurtir();
        } catch (erro) {
            alert(erro.message);
        }
    });

    const btnComentar = document.createElement("button");
    btnComentar.type = "button";
    btnComentar.className = "btn-comentarios";
    btnComentar.textContent = `💬 ${post.comentarios || 0} comentários`;

    btnComentar.addEventListener("click", () => abrirComentarios(post.id));

    const btnCompartilhar = document.createElement("button");
    btnCompartilhar.type = "button";
    btnCompartilhar.className = "btn-compartilhar";
    btnCompartilhar.textContent = "↗ Compartilhar";
    btnCompartilhar.addEventListener("click", () => compartilharPublicacao(post));

    acoes.append(btnCurtir, btnComentar, btnCompartilhar);
    card.appendChild(acoes);

    return card;
}

async function carregarFeed() {
    try {
        const publicacoes = await requisicao(`${API}?acao=feed`);

        timeline.replaceChildren();

        publicacoes.forEach(post => {
            timeline.appendChild(criarPost(post));
        });

        if (publicacoes.length === 0) {
            const vazio = document.createElement("p");
            vazio.textContent = "Nenhuma publicação ainda. Seja o primeiro a publicar!";
            timeline.appendChild(vazio);
        }
    } catch (erro) {
        timeline.textContent = erro.message;
    }
}

function renderizarPreviewFeed() {
    previewFeed.replaceChildren();

    if (arquivosFeed.length === 0) {
        const texto = document.createElement("p");
        texto.textContent = "Nenhum arquivo selecionado";
        previewFeed.appendChild(texto);
        return;
    }

    arquivosFeed.forEach((arquivo, indice) => {
        const item = document.createElement("div");
        item.className = "preview-item";

        const midia = arquivo.type.startsWith("video/")
            ? document.createElement("video")
            : document.createElement("img");

        midia.src = URL.createObjectURL(arquivo);

        if (midia.tagName === "VIDEO") {
            midia.controls = true;
        } else {
            midia.alt = "Pré-visualização";
        }

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "remover-midia";
        remover.textContent = "×";

        remover.addEventListener("click", () => {
            arquivosFeed.splice(indice, 1);
            renderizarPreviewFeed();
        });

        item.append(midia, remover);
        previewFeed.appendChild(item);
    });
}

arquivoFeed.addEventListener("change", () => {
    const selecionados = Array.from(arquivoFeed.files);

    selecionados.forEach(arquivo => {
        if (!arquivo.type.startsWith("image/") &&
            !arquivo.type.startsWith("video/")) {
            alert("Arquivo não suportado.");
            return;
        }

        if (arquivo.size > 2 * 1024 * 1024) {
            alert(`${arquivo.name} ultrapassa 2 MB.`);
            return;
        }

        arquivosFeed.push(arquivo);
    });

    arquivoFeed.value = "";
    renderizarPreviewFeed();
});

formFeed.addEventListener("submit", async evento => {
    evento.preventDefault();

    const texto = legendaFeed.value.trim();

    if (!texto && arquivosFeed.length === 0) {
        alert("Escreva uma legenda ou selecione uma mídia.");
        return;
    }

    const dados = new FormData();

    dados.append("acao", "publicar");
    dados.append("texto", texto);

    arquivosFeed.forEach(arquivo => {
        dados.append("arquivos", arquivo);
    });

    try {
        await requisicao(API, {
            method: "POST",
            body: dados
        });

        feedDialog.close();
        legendaFeed.value = "";
        arquivosFeed = [];
        renderizarPreviewFeed();

        await carregarFeed();

        alert("Publicação realizada com sucesso!");
    } catch (erro) {
        alert(erro.message);
    }
});

async function abrirComentarios(idPublicacao) {
    publicacaoComentarioAtual = idPublicacao;

    sessaoComentarios.replaceChildren();

    try {
        const comentarios = await requisicao(
            `${API}?acao=comentarios&id=${idPublicacao}`
        );

        comentarios.forEach(comentario => {
            const item = document.createElement("div");
            item.className = "comentario";

            const nome = document.createElement("strong");
            nome.textContent = comentario.nome;

            const texto = document.createElement("p");
            texto.textContent = comentario.texto;

            const data = document.createElement("small");
            data.textContent = formatarData(comentario.data);

            item.append(nome, texto, data);
            sessaoComentarios.appendChild(item);
        });

        if (comentarios.length === 0) {
            sessaoComentarios.textContent = "Nenhum comentário ainda.";
        }

        comentariosDialog.showModal();

    } catch (erro) {
        alert(erro.message);
    }
}

btnEnviarComentarios.addEventListener("click", async () => {
    const texto = inputComentarios.value.trim();

    if (!texto || !publicacaoComentarioAtual) return;

    try {
        await requisicao(API, {
            method: "POST",
            body: new URLSearchParams({
                acao: "comentar",
                id: publicacaoComentarioAtual,
                texto
            })
        });

        inputComentarios.value = "";

        await abrirComentarios(publicacaoComentarioAtual);
        await carregarFeed();

    } catch (erro) {
        alert(erro.message);
    }
});

inputComentarios.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        btnEnviarComentarios.click();
    }
});

document.getElementById("voltarComentarios")
    .addEventListener("click", evento => {
        evento.preventDefault();
        comentariosDialog.close();
    });

document.getElementById("fazerPublicacao")
    .addEventListener("click", evento => {
        evento.preventDefault();
        publicacaoDialog.showModal();
    });

document.getElementById("fecharPublicacao")
    .addEventListener("click", () => publicacaoDialog.close());

document.getElementById("publicarFeed")
    .addEventListener("click", () => {
        publicacaoDialog.close();
        feedDialog.showModal();
    });

document.getElementById("fecharFeed")
    .addEventListener("click", () => feedDialog.close());

document.getElementById("removerArquivo")
    .addEventListener("click", () => {
        arquivosFeed = [];
        renderizarPreviewFeed();
    });

feedDialog.addEventListener("close", () => {
    arquivosFeed = [];
    legendaFeed.value = "";
    renderizarPreviewFeed();
});

document.getElementById("publicarStory")
    .addEventListener("click", () => {
        publicacaoDialog.close();
        storyDialog.showModal();
    });

document.getElementById("abrirCriacaoStory")
    .addEventListener("click", () => storyDialog.showModal());

document.getElementById("fecharStory")
    .addEventListener("click", () => {
        storyDialog.close();
        limparStory();
    });

arquivoStory.addEventListener("change", () => {
    Array.from(arquivoStory.files).forEach(arquivo => {
        if (arquivo.type.startsWith("image/") ||
            arquivo.type.startsWith("video/")) {
            if (arquivo.size <= 2 * 1024 * 1024) {
                arquivosStory.push(arquivo);
            } else {
                alert("O story deve ter no máximo 2 MB.");
            }
        }
    });

    arquivoStory.value = "";
    renderizarPreviewStory();
});

function renderizarPreviewStory() {
    previewStory.replaceChildren();

    arquivosStory.forEach((arquivo, indice) => {
        const item = document.createElement("div");
        item.className = "preview-story-item";

        const midia = arquivo.type.startsWith("video/")
            ? document.createElement("video")
            : document.createElement("img");

        midia.src = URL.createObjectURL(arquivo);

        if (midia.tagName === "VIDEO") {
            midia.controls = true;
        } else {
            midia.alt = "Pré-visualização do story";
        }

        const remover = document.createElement("button");
        remover.type = "button";
        remover.textContent = "×";

        remover.addEventListener("click", () => {
            arquivosStory.splice(indice, 1);
            renderizarPreviewStory();
        });

        item.append(midia, remover);
        previewStory.appendChild(item);
    });

    btnPublicarStory.disabled = arquivosStory.length === 0;
}

btnPublicarStory.addEventListener("click", async () => {
    if (arquivosStory.length === 0) return;

    try {
        for (const arquivo of arquivosStory) {
            const dados = new FormData();
            dados.append("acao", "publicarStory");
            dados.append("arquivo", arquivo);

            await requisicao(API, {
                method: "POST",
                body: dados
            });
        }

        storyDialog.close();
        limparStory();
        await carregarStories();

        alert("Story publicado!");
    } catch (erro) {
        alert(erro.message);
    }
});

function limparStory() {
    arquivosStory = [];
    previewStory.replaceChildren();
    btnPublicarStory.disabled = true;
}

async function carregarStories() {
    try {
        stories = await requisicao(`${API}?acao=stories`);
        renderizarStories();
    } catch (erro) {
        console.error(erro);
    }
}

function renderizarStories() {
    listaStories.querySelectorAll(".story-remoto").forEach(item => item.remove());

    const atletas = new Map();

    stories.forEach(story => {
        if (!atletas.has(story.idAtleta)) {
            atletas.set(story.idAtleta, []);
        }

        atletas.get(story.idAtleta).push(story);
    });

    atletas.forEach((itens, idAtleta) => {
        const primeiro = itens[0];

        const elemento = document.createElement("div");
        elemento.className = "story story-remoto";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "avatar avatar-story";

        if (primeiro.fotoPerfil) {
            const img = document.createElement("img");
            img.src = dataUrl(primeiro.fotoPerfil, "image/jpeg");
            img.alt = primeiro.nome;
            botao.appendChild(img);
        } else {
            botao.textContent = (primeiro.nome || "Atleta")
                .split(" ")
                .map(p => p[0])
                .slice(0, 2)
                .join("");
        }

        const nome = document.createElement("span");
        nome.textContent = primeiro.nome;

        botao.addEventListener("click", () => {
            const lista = itens;
            indiceStory = 0;
            abrirVisualizacaoStory(lista);
        });

        elemento.append(botao, nome);
        listaStories.appendChild(elemento);
    });
}

let storiesAtuais = [];

function abrirVisualizacaoStory(lista) {
    storiesAtuais = lista;
    indiceStory = 0;
    mostrarStory();
    visualizarStoryDialog.showModal();
}

function mostrarStory() {
    const story = storiesAtuais[indiceStory];

    const conteudo = document.getElementById("conteudoVisualizarStory");
    const contador = document.getElementById("contadorStory");

    conteudo.replaceChildren();

    const media = story.mime.startsWith("video/")
        ? document.createElement("video")
        : document.createElement("img");

    media.src = dataUrl(story.arquivo, story.mime);

    if (media.tagName === "VIDEO") {
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;
    } else {
        media.alt = "Story de " + story.nome;
    }

    conteudo.appendChild(media);

    contador.textContent = `${indiceStory + 1} / ${storiesAtuais.length}`;

    document.getElementById("storyAnterior").disabled = indiceStory === 0;
    document.getElementById("storyProximo").disabled =
        indiceStory === storiesAtuais.length - 1;

    document.getElementById("excluirStory").hidden = !story.proprio;
}

document.getElementById("storyAnterior")
    .addEventListener("click", () => {
        if (indiceStory > 0) {
            indiceStory--;
            mostrarStory();
        }
    });

document.getElementById("storyProximo")
    .addEventListener("click", () => {
        if (indiceStory < storiesAtuais.length - 1) {
            indiceStory++;
            mostrarStory();
        }
    });

document.getElementById("fecharVisualizacaoStory")
    .addEventListener("click", () => visualizarStoryDialog.close());

document.getElementById("excluirStory")
    .addEventListener("click", async () => {
        const story = storiesAtuais[indiceStory];

        if (!story || !confirm("Deseja excluir este story?")) return;

        try {
            await requisicao(API, {
                method: "POST",
                body: new URLSearchParams({
                    acao: "excluirStory",
                    id: story.id
                })
            });

            visualizarStoryDialog.close();
            await carregarStories();
        } catch (erro) {
            alert(erro.message);
        }
    });

carregarFeed();
carregarStories();
renderizarPreviewFeed();