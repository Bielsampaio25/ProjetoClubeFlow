//rede-social.js

const stories = document.querySelectorAll(".story .avatar");
const storyModal = document.getElementById("storyModal");
const fecharStoryModal = document.getElementById("fecharStoryModal");
const storyUsuario = document.getElementById("storyUsuario");
const storyNome = document.getElementById("storyNome");

const publicacao = document.getElementById("Publicacao");
const btnAbrir = document.getElementById("fazerPublicacao");
const btnFechar = document.getElementById("fecharPublicacao");

const feed = document.getElementById("Feed");
const btnAbrirFeed = document.getElementById("publicarFeed");
const btnFecharFeed = document.getElementById("fecharFeed");

const dialogStory = document.getElementById("Story");
const btnAbrirStory = document.getElementById("publicarStory");
const btnFecharStory = document.getElementById("fecharStory");

const formFeed = document.getElementById("formFeed");
const arquivoFeed = document.getElementById("arquivoFeed");
const previewFeed = document.getElementById("previewFeed");
const legendaFeed = document.getElementById("legendaFeed");
const removerArquivo = document.getElementById("removerArquivo");
const timeline = document.getElementById("timeline");

const abrirCriacaoStory = document.getElementById("abrirCriacaoStory");
const arquivoStory = document.getElementById("arquivoStory");
const previewStory = document.getElementById("previewStory");
const btnpublicarStory = document.getElementById("btnpublicarStory");
const visualizarStory = document.getElementById("visualizarStory");
const conteudoVisualizarStory = document.getElementById("conteudoVisualizarStory");
const fecharVisualizacaoStory = document.getElementById("fecharVisualizacaoStory");
const storyAnterior = document.getElementById("storyAnterior");
const storyProximo = document.getElementById("storyProximo");
const contadorStory = document.getElementById("contadorStory");

const dialogComentarios = document.getElementById("Comentarios");
const sessaoComentarios = document.getElementById("sessaoComentarios");
const btnEnviarComentarios = document.getElementById("btnEnviarComentarios");
const inputComentarios = document.getElementById("inputComentarios");
const voltarComentarios = document.getElementById("voltarComentarios");
const excluirStory = document.getElementById("excluirStory");
const listaStories = document.querySelector(".story-row");

const publicacoesStorageKey = "publicacoes";
const perfilStorageKey = "perfilAtleta";
const fotoStorageKey = "fotoPerfil";
const tamanhoMaximoArquivo = 2 * 1024 * 1024;

let arquivosSelecionados = [];
let urlsPreview = [];
let arquivosStory = [];
let urlsPreviewStory = [];
let storiesPublicados = [];
let indiceStoryAtual = 0;

function obterPerfilAtleta() {
    let perfilSalvo = {};

    try {
        perfilSalvo = JSON.parse(
            localStorage.getItem(perfilStorageKey) || "{}"
        );
    } catch {
        perfilSalvo = {};
    }

    const nome = perfilSalvo.nome || "Gabriel Sampaio";
    const usuario = perfilSalvo.usuario || "gabrielalmeida";

    return {
        id: perfilSalvo.id || usuario,
        nome,
        usuario
    };
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
        alert("Não foi possível salvar a publicação. O armazenamento do navegador pode estar cheio.");
        return false;
    }
}

function converterArquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();

        leitor.onload = () => {
            resolve({
                nome: arquivo.name,
                tipo: arquivo.type,
                tamanho: arquivo.size,
                dados: leitor.result
            });
        };

        leitor.onerror = () => {
            reject(new Error("Não foi possível ler o arquivo."));
        };

        leitor.readAsDataURL(arquivo);
    });
}

function obterDataPublicacao(data) {
    if (!data) {
        return new Date();
    }

    const dataConvertida = new Date(data);

    return Number.isNaN(dataConvertida.getTime())
        ? new Date()
        : dataConvertida;
}

function formatarTempoPublicacao(data) {
    const diferenca = Math.max(
        0,
        Math.floor((Date.now() - data.getTime()) / 1000)
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

stories.forEach((storyItem) => {
    storyItem.addEventListener("click", (evento) => {
        evento.preventDefault();

        if (storyItem.id === "abrirCriacaoStory") {
            return;
        }

        const nome = storyItem.dataset.nome ||
            storyItem.parentElement?.textContent.trim() ||
            "Story";

        if (storyModal && storyUsuario && storyNome) {
            storyUsuario.textContent = nome;
            storyNome.textContent = nome;
            storyModal.classList.add("ativo");
        }
    });
});

if (fecharStoryModal && storyModal) {
    fecharStoryModal.addEventListener("click", () => {
        storyModal.classList.remove("ativo");
    });

    storyModal.addEventListener("click", (evento) => {
        if (evento.target === storyModal) {
            storyModal.classList.remove("ativo");
        }
    });
}

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && storyModal) {
        storyModal.classList.remove("ativo");
    }
});

btnAbrir.addEventListener("click", (evento) => {
    evento.preventDefault();
    publicacao.showModal();
});

btnFechar.addEventListener("click", () => {
    publicacao.close();
});

btnAbrirFeed.addEventListener("click", (evento) => {
    evento.preventDefault();
    publicacao.close();
    feed.showModal();
});

btnFecharFeed.addEventListener("click", () => {
    feed.close();
});

btnAbrirStory.addEventListener("click", (evento) => {
    evento.preventDefault();
    publicacao.close();
    dialogStory.showModal();
});

function limparPreview() {
    urlsPreview.forEach((url) => URL.revokeObjectURL(url));
    urlsPreview = [];
    previewFeed.replaceChildren();
}

function renderizarPreview() {
    limparPreview();

    if (arquivosSelecionados.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Nenhum arquivo selecionado";
        previewFeed.appendChild(mensagem);
        return;
    }

    arquivosSelecionados.forEach((arquivo, indice) => {
        const url = URL.createObjectURL(arquivo);
        urlsPreview.push(url);

        const item = document.createElement("div");
        item.classList.add("preview-item");

        let midia;

        if (arquivo.type.startsWith("image/")) {
            midia = document.createElement("img");
            midia.alt = `Imagem ${indice + 1}`;
        } else {
            midia = document.createElement("video");
            midia.controls = true;
            midia.playsInline = true;
        }

        midia.src = url;

        const remover = document.createElement("button");
        remover.type = "button";
        remover.classList.add("remover-midia");
        remover.textContent = "×";
        remover.setAttribute("aria-label", `Remover mídia ${indice + 1}`);

        remover.addEventListener("click", () => {
            arquivosSelecionados.splice(indice, 1);
            renderizarPreview();
        });

        item.append(midia, remover);
        previewFeed.appendChild(item);
    });
}

arquivoFeed.addEventListener("change", () => {
    const novosArquivos = Array.from(arquivoFeed.files);

    const validos = novosArquivos.filter((arquivo) =>
        arquivo.type.startsWith("image/") ||
        arquivo.type.startsWith("video/")
    );

    if (validos.length !== novosArquivos.length) {
        alert("Selecione apenas imagens ou vídeos.");
    }

    const excedidos = validos.filter(
        (arquivo) => arquivo.size > tamanhoMaximoArquivo
    );

    if (excedidos.length > 0) {
        alert("Cada imagem ou vídeo deve ter no máximo 2 MB.");
    }

    arquivosSelecionados.push(
        ...validos.filter((arquivo) => arquivo.size <= tamanhoMaximoArquivo)
    );

    arquivoFeed.value = "";
    renderizarPreview();
});

removerArquivo.addEventListener("click", () => {
    arquivosSelecionados = [];
    arquivoFeed.value = "";
    renderizarPreview();
});

function criarCarrossel(arquivos) {
    const midiaContainer = document.createElement("div");
    midiaContainer.classList.add("post-media");

    if (!arquivos || arquivos.length === 0) {
        return midiaContainer;
    }

    const galeria = document.createElement("div");
    galeria.classList.add("post-carousel");

    const slides = [];
    const indicadores = [];
    let indiceAtual = 0;

    arquivos.forEach((arquivo, indice) => {
        const slide = document.createElement("div");
        slide.classList.add("post-slide");

        if (indice === 0) {
            slide.classList.add("ativo");
        }

        const tipo = arquivo.type || arquivo.tipo || "";
        const origem = arquivo.dados || arquivo.url || "";

        let midia;

        if (tipo.startsWith("image/")) {
            midia = document.createElement("img");
            midia.alt = `Mídia ${indice + 1} da publicação`;
        } else {
            midia = document.createElement("video");
            midia.controls = false;
            midia.loop = true;
            midia.autoplay = true;
            midia.playsInline = true;
            midia.preload = "metadata";
        }

        if (arquivo instanceof Blob) {
            midia.src = URL.createObjectURL(arquivo);
        } else {
            midia.src = origem;
        }

        slide.appendChild(midia);
        galeria.appendChild(slide);
        slides.push(slide);
    });

    const contador = document.createElement("span");
    contador.classList.add("post-carousel-contador");

    const anterior = document.createElement("button");
    anterior.type = "button";
    anterior.classList.add("post-carousel-btn", "anterior");
    anterior.textContent = "‹";
    anterior.setAttribute("aria-label", "Mídia anterior");

    const proximo = document.createElement("button");
    proximo.type = "button";
    proximo.classList.add("post-carousel-btn", "proximo");
    proximo.textContent = "›";
    proximo.setAttribute("aria-label", "Próxima mídia");

    const containerIndicadores = document.createElement("div");
    containerIndicadores.classList.add("post-carousel-indicadores");

    arquivos.forEach((arquivo, indice) => {
        const indicador = document.createElement("span");

        if (indice === 0) {
            indicador.classList.add("ativo");
        }

        containerIndicadores.appendChild(indicador);
        indicadores.push(indicador);
    });

    function atualizarCarrossel() {
        slides.forEach((slide, indice) => {
            slide.classList.toggle("ativo", indice === indiceAtual);

            const video = slide.querySelector("video");

            if (video && indice !== indiceAtual) {
                video.pause();
            }
        });

        contador.textContent = `${indiceAtual + 1}/${slides.length}`;
        anterior.disabled = indiceAtual === 0;
        proximo.disabled = indiceAtual === slides.length - 1;

        indicadores.forEach((indicador, indice) => {
            indicador.classList.toggle("ativo", indice === indiceAtual);
        });
    }

    anterior.addEventListener("click", () => {
        if (indiceAtual > 0) {
            indiceAtual--;
            atualizarCarrossel();
        }
    });

    proximo.addEventListener("click", () => {
        if (indiceAtual < slides.length - 1) {
            indiceAtual++;
            atualizarCarrossel();
        }
    });

    galeria.append(contador, anterior, proximo);
    midiaContainer.appendChild(galeria);

    if (arquivos.length > 1) {
        midiaContainer.appendChild(containerIndicadores);
    }

    atualizarCarrossel();

    return midiaContainer;
}

function criarPublicacao(arquivos, legenda, dados = {}) {
    const artigo = document.createElement("article");
    artigo.classList.add("card-post");

    const idPublicacao = dados.id || `publicacao-${Date.now()}-${Math.random()}`;
    artigo.dataset.id = idPublicacao;

    const perfil = obterPerfilAtleta();

    const cabecalho = document.createElement("div");
    cabecalho.classList.add("post-head");

    const avatar = document.createElement("span");
    avatar.classList.add("avatar");

    const fotoPerfil = dados.fotoPerfil || localStorage.getItem(fotoStorageKey);

    if (fotoPerfil) {
        const imagemAvatar = document.createElement("img");
        imagemAvatar.src = fotoPerfil;
        imagemAvatar.alt = "Foto do atleta";
        avatar.textContent = "";
        avatar.appendChild(imagemAvatar);
    } else {
        avatar.textContent = (perfil.nome || "Atleta")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((parte) => parte[0])
            .join("")
            .toUpperCase();
    }

    const identificacao = document.createElement("div");

    const nome = document.createElement("a");
    nome.classList.add("nome-atleta-link");
    nome.textContent = dados.usuarioNome || perfil.nome;

    const idAtleta = dados.usuarioId || dados.atletaId || perfil.id;

    nome.href = `perfil-atleta-social.html?id=${encodeURIComponent(idAtleta)}`;
    nome.setAttribute("aria-label", `Ver perfil de ${nome.textContent}`);

    const descricao = document.createElement("small");
    descricao.classList.add("post-hora");

    const dataPublicacao = obterDataPublicacao(dados.data);

    function atualizarHora() {
        descricao.textContent = formatarTempoPublicacao(dataPublicacao);
    }

    atualizarHora();

    const intervaloHora = setInterval(atualizarHora, 10000);

    artigo.addEventListener("DOMNodeRemoved", () => {
        clearInterval(intervaloHora);
    }, { once: true });

    identificacao.append(nome, descricao);
    cabecalho.append(avatar, identificacao);

    const btnCurtida = document.createElement("button");
    btnCurtida.type = "button";
    btnCurtida.classList.add("btn-curtida");

    const iconeCurtida = document.createElement("span");
    iconeCurtida.classList.add("material-symbols-outlined");
    iconeCurtida.textContent = "favorite";

    const textoCurtida = document.createElement("span");
    let curtido = Boolean(dados.curtido);
    let totalCurtidas = Number(dados.curtidas) || 0;

    textoCurtida.textContent = String(totalCurtidas);
    btnCurtida.classList.toggle("curtido", curtido);

    btnCurtida.append(iconeCurtida, textoCurtida);

    btnCurtida.addEventListener("click", () => {
        curtido = !curtido;
        totalCurtidas = Math.max(0, totalCurtidas + (curtido ? 1 : -1));

        textoCurtida.textContent = String(totalCurtidas);
        btnCurtida.classList.toggle("curtido", curtido);

        atualizarPublicacaoSalva(idPublicacao, {
            curtidas: totalCurtidas,
            curtido
        });
    });

    const btnComentarios = document.createElement("button");
    btnComentarios.type = "button";
    btnComentarios.classList.add("btn-comentarios");

    const iconeComentarios = document.createElement("span");
    iconeComentarios.classList.add("material-symbols-outlined");
    iconeComentarios.textContent = "comment";

    const textoComentarios = document.createElement("span");
    textoComentarios.textContent = "Comentários";

    btnComentarios.append(iconeComentarios, textoComentarios);
    btnComentarios.addEventListener("click", () => {
        dialogComentarios.showModal();
    });

    const btnCompartilhar = document.createElement("button");
    btnCompartilhar.type = "button";
    btnCompartilhar.classList.add("btn-compartilhar");

    const iconeCompartilhar = document.createElement("span");
    iconeCompartilhar.classList.add("material-symbols-outlined");
    iconeCompartilhar.textContent = "share";

    const textoCompartilhar = document.createElement("span");
    textoCompartilhar.textContent = "Compartilhar";

    btnCompartilhar.append(iconeCompartilhar, textoCompartilhar);

    btnCompartilhar.addEventListener("click", async () => {
        const dadosCompartilhamento = {
            title: "Club Flow",
            text: `${dados.usuarioNome || perfil.nome} publicou no Club Flow: ${legenda || "Confira esta publicação!"}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(dadosCompartilhamento);
            } else if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(
                    `${dadosCompartilhamento.text}\n${dadosCompartilhamento.url}`
                );
                alert("Link copiado! Você já pode compartilhar.");
            } else {
                prompt(
                    "Copie o texto para compartilhar:",
                    `${dadosCompartilhamento.text}\n${dadosCompartilhamento.url}`
                );
            }
        } catch (erro) {
            if (erro.name !== "AbortError") {
                console.error("Erro ao compartilhar:", erro);
                alert("Não foi possível compartilhar a publicação.");
            }
        }
    });

    artigo.appendChild(cabecalho);
    artigo.appendChild(criarCarrossel(arquivos));

    if (legenda) {
        const corpo = document.createElement("p");
        corpo.classList.add("post-body");
        corpo.textContent = legenda;
        artigo.appendChild(corpo);
    }

    const acoes = document.createElement("div");
    acoes.classList.add("post-actions");
    acoes.append(btnCurtida, btnComentarios, btnCompartilhar);
    artigo.appendChild(acoes);

    return artigo;
}

function atualizarPublicacaoSalva(id, alteracoes) {
    const publicacoes = obterPublicacoesSalvas();

    const indice = publicacoes.findIndex(
        (item) => String(item.id) === String(id)
    );

    if (indice === -1) {
        return;
    }

    publicacoes[indice] = {
        ...publicacoes[indice],
        ...alteracoes
    };

    salvarPublicacoesSalvas(publicacoes);
}

function carregarPublicacoesNoFeed() {
    const publicacoes = obterPublicacoesSalvas();

    timeline.replaceChildren();

    publicacoes.forEach((item) => {
        const artigo = criarPublicacao(
            item.arquivos || [],
            item.texto || item.conteudo || "",
            item
        );

        timeline.appendChild(artigo);
    });
}

formFeed.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (arquivosSelecionados.length === 0) {
        alert("Selecione pelo menos uma imagem ou um vídeo.");
        return;
    }

    if (arquivosSelecionados.some((arquivo) => arquivo.size > tamanhoMaximoArquivo)) {
        alert("Cada imagem ou vídeo deve ter no máximo 2 MB.");
        return;
    }

    try {
        const perfil = obterPerfilAtleta();

        const arquivosSalvos = await Promise.all(
            arquivosSelecionados.map(converterArquivoParaBase64)
        );

        const idPublicacao = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `publicacao-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const novaPublicacaoSalva = {
            id: idPublicacao,
            usuarioId: perfil.id,
            usuario: perfil.usuario,
            usuarioNome: perfil.nome,
            fotoPerfil: localStorage.getItem(fotoStorageKey) || "",
            texto: legendaFeed.value.trim(),
            data: new Date().toISOString(),
            arquivos: arquivosSalvos,
            curtidas: 0,
            curtido: false,
            comentarios: []
        };

        const publicacoes = obterPublicacoesSalvas();
        publicacoes.unshift(novaPublicacaoSalva);

        if (!salvarPublicacoesSalvas(publicacoes)) {
            return;
        }

        const novaPublicacao = criarPublicacao(
            [...arquivosSelecionados],
            novaPublicacaoSalva.texto,
            novaPublicacaoSalva
        );

        timeline.prepend(novaPublicacao);
        feed.close();
    } catch (erro) {
    console.error("Erro ao publicar:", erro);

    if (erro.name === "QuotaExceededError") {
        alert(
            "O armazenamento do navegador está cheio. " +
            "Exclua publicações antigas ou reduza o tamanho das mídias."
        );
    } else {
        alert(
            `Erro ao publicar: ${erro.message || "Erro desconhecido."}`
        );
    }
}
});

feed.addEventListener("close", () => {
    arquivosSelecionados = [];
    arquivoFeed.value = "";
    legendaFeed.value = "";

    limparPreview();

    const mensagem = document.createElement("p");
    mensagem.textContent = "Nenhum arquivo selecionado";
    previewFeed.appendChild(mensagem);
});

btnEnviarComentarios.addEventListener("click", () => {
    const textoComentario = inputComentarios.value.trim();

    if (!textoComentario) {
        return;
    }

    const comentario = document.createElement("div");
    comentario.classList.add("comentario");

    const texto = document.createElement("p");
    texto.classList.add("texto-comentario");
    texto.textContent = textoComentario;

    const acoes = document.createElement("div");
    acoes.classList.add("acoes-comentario");

    const btnCurtir = document.createElement("button");
    btnCurtir.type = "button";
    btnCurtir.classList.add("btn-curtida-comentario");

    const iconeCurtir = document.createElement("span");
    iconeCurtir.classList.add("material-symbols-outlined");
    iconeCurtir.textContent = "favorite_border";

    btnCurtir.appendChild(iconeCurtir);

    btnCurtir.addEventListener("click", () => {
        const curtido = btnCurtir.classList.toggle("curtido");
        iconeCurtir.textContent = curtido ? "favorite" : "favorite_border";
    });

    const btnApagar = document.createElement("button");
    btnApagar.type = "button";
    btnApagar.classList.add("btn-apagar-comentario");

    const iconeApagar = document.createElement("span");
    iconeApagar.classList.add("material-symbols-outlined");
    iconeApagar.textContent = "delete";

    btnApagar.appendChild(iconeApagar);
    btnApagar.addEventListener("click", () => comentario.remove());

    acoes.append(btnCurtir, btnApagar);
    comentario.append(texto, acoes);
    sessaoComentarios.appendChild(comentario);

    inputComentarios.value = "";
});

voltarComentarios.addEventListener("click", (evento) => {
    evento.preventDefault();
    dialogComentarios.close();
});

inputComentarios.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        btnEnviarComentarios.click();
    }
});

arquivoStory.addEventListener("change", () => {
    const novosArquivos = Array.from(arquivoStory.files);

    const validos = novosArquivos.filter((arquivo) =>
        arquivo.type.startsWith("image/") ||
        arquivo.type.startsWith("video/")
    );

    if (validos.length !== novosArquivos.length) {
        alert("Selecione apenas imagens ou vídeos válidos.");
    }

    arquivosStory.push(...validos);
    arquivoStory.value = "";

    renderizarPreviewStory();
});

function renderizarPreviewStory() {
    urlsPreviewStory.forEach((url) => URL.revokeObjectURL(url));
    urlsPreviewStory = [];
    previewStory.replaceChildren();

    arquivosStory.forEach((arquivo, indice) => {
        const url = URL.createObjectURL(arquivo);
        urlsPreviewStory.push(url);

        const item = document.createElement("div");
        item.classList.add("preview-story-item");

        const midia = document.createElement(
            arquivo.type.startsWith("image/") ? "img" : "video"
        );

        midia.src = url;

        if (midia.tagName === "IMG") {
            midia.alt = `Prévia do Story ${indice + 1}`;
        } else {
            midia.controls = true;
            midia.muted = true;
            midia.playsInline = true;
        }

        const remover = document.createElement("button");
        remover.type = "button";
        remover.textContent = "×";
        remover.setAttribute("aria-label", `Remover mídia ${indice + 1}`);

        remover.addEventListener("click", () => {
            arquivosStory.splice(indice, 1);
            renderizarPreviewStory();
        });

        item.append(midia, remover);
        previewStory.appendChild(item);
    });

    btnpublicarStory.disabled = arquivosStory.length === 0;
}

function criarStory(arquivos) {
    const novasMidias = arquivos.map((arquivo) => ({
        arquivo,
        url: URL.createObjectURL(arquivo),
        tipo: arquivo.type
    }));

    storiesPublicados.push(...novasMidias);

    const meuStoryExistente = document.getElementById("meuStory");
    const storyExistente = document.querySelector(".story-publicado");

    let storyElemento = meuStoryExistente || storyExistente;

    if (!storyElemento) {
        storyElemento = document.createElement("div");
        storyElemento.classList.add("story", "story-publicado");

        if (listaStories) {
            listaStories.prepend(storyElemento);
        }
    } else {
        storyElemento.classList.add("story-publicado");
        storyElemento.removeAttribute("id");
    }

    storyElemento.replaceChildren();

    const botaoStory = document.createElement("button");
    botaoStory.type = "button";
    botaoStory.classList.add("avatar", "avatar-story");

    const primeiraMidia = storiesPublicados[0];

    const miniatura = document.createElement(
        primeiraMidia.tipo.startsWith("image/") ? "img" : "video"
    );

    miniatura.src = primeiraMidia.url;

    if (miniatura.tagName === "IMG") {
        miniatura.alt = "Seu Story";
    } else {
        miniatura.muted = true;
        miniatura.preload = "metadata";
    }

    botaoStory.appendChild(miniatura);

    const nomeStory = document.createElement("div");
    nomeStory.textContent = "Seu Story";

    storyElemento.append(botaoStory, nomeStory);

    botaoStory.addEventListener("click", () => {
        indiceStoryAtual = 0;
        visualizarMidiaStory();
        visualizarStory.showModal();
    });
}

function visualizarMidiaStory() {
    const midiaStory = storiesPublicados[indiceStoryAtual];

    if (!midiaStory) {
        return;
    }

    conteudoVisualizarStory.replaceChildren();

    const midia = document.createElement(
        midiaStory.tipo.startsWith("image/") ? "img" : "video"
    );

    midia.src = midiaStory.url;

    if (midia.tagName === "IMG") {
        midia.alt = "Story publicado";
    } else {
        midia.controls = true;
        midia.autoplay = true;
        midia.playsInline = true;
    }

    conteudoVisualizarStory.appendChild(midia);

    contadorStory.textContent = `${indiceStoryAtual + 1} / ${storiesPublicados.length}`;
    storyAnterior.disabled = indiceStoryAtual === 0;
    storyProximo.disabled = indiceStoryAtual === storiesPublicados.length - 1;
}

storyAnterior.addEventListener("click", () => {
    if (indiceStoryAtual > 0) {
        indiceStoryAtual--;
        visualizarMidiaStory();
    }
});

storyProximo.addEventListener("click", () => {
    if (indiceStoryAtual < storiesPublicados.length - 1) {
        indiceStoryAtual++;
        visualizarMidiaStory();
    }
});

btnpublicarStory.addEventListener("click", () => {
    if (arquivosStory.length === 0) {
        alert("Selecione pelo menos uma foto ou um vídeo.");
        return;
    }

    criarStory(arquivosStory);
    dialogStory.close();
    limparFormularioStory();
});

function limparFormularioStory() {
    urlsPreviewStory.forEach((url) => URL.revokeObjectURL(url));
    urlsPreviewStory = [];
    arquivosStory = [];
    arquivoStory.value = "";
    previewStory.replaceChildren();
    btnpublicarStory.disabled = true;
}

btnFecharStory.addEventListener("click", () => {
    dialogStory.close();
    limparFormularioStory();
});

fecharVisualizacaoStory.addEventListener("click", () => {
    const videos = conteudoVisualizarStory.querySelectorAll("video");
    videos.forEach((video) => video.pause());
    visualizarStory.close();
    conteudoVisualizarStory.replaceChildren();
});

visualizarStory.addEventListener("close", () => {
    const videos = conteudoVisualizarStory.querySelectorAll("video");
    videos.forEach((video) => video.pause());
    conteudoVisualizarStory.replaceChildren();
});

excluirStory.addEventListener("click", () => {
    const storyAtual = storiesPublicados[indiceStoryAtual];

    if (!storyAtual) {
        return;
    }

    const confirmar = confirm("Tem certeza de que deseja excluir este story?");

    if (!confirmar) {
        return;
    }

    URL.revokeObjectURL(storyAtual.url);
    storiesPublicados.splice(indiceStoryAtual, 1);

    if (storiesPublicados.length === 0) {
        const storyElemento = document.querySelector(".story-publicado");

        if (storyElemento) {
            storyElemento.remove();
        }

        visualizarStory.close();
        conteudoVisualizarStory.replaceChildren();
        indiceStoryAtual = 0;
        return;
    }

    if (indiceStoryAtual >= storiesPublicados.length) {
        indiceStoryAtual = storiesPublicados.length - 1;
    }

    visualizarMidiaStory();
});

visualizarStory.addEventListener("close", () => {
    excluirStory.disabled = false;
});

carregarPublicacoesNoFeed();