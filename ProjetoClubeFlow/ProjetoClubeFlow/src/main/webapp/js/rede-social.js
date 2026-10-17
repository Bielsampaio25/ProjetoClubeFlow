const stories = document.querySelectorAll(".story .avatar");
const storyModal = document.getElementById("storyModal");
const fecharStory = document.getElementById("fecharStory");
const storyUsuario = document.getElementById("storyUsuario");
const storyNome = document.getElementById("storyNome");

const publicacao = document.getElementById("Publicacao");
const btnAbrir = document.getElementById("fazerPublicacao");
const btnFechar = document.getElementById("fecharPublicacao");

const feed = document.getElementById("Feed");
const btnAbrirFeed = document.getElementById("publicarFeed");
const btnFecharFeed = document.getElementById("fecharFeed");

const story = document.getElementById("Story");
const btnAbrirStory = document.getElementById("publicarStory");
const btnFecharStory = document.getElementById("fecharStory");

const formFeed = document.getElementById("formFeed");
const arquivoFeed = document.getElementById("arquivoFeed");
const previewFeed = document.getElementById("previewFeed");
const legendaFeed = document.getElementById("legendaFeed");
const removerArquivo = document.getElementById("removerArquivo");
const timeline = document.getElementById("timeline");

let arquivosSelecionados = [];
let urlsPreview = [];

stories.forEach((storyItem) => {
    storyItem.addEventListener("click", (evento) => {
        evento.preventDefault();

        const nome = storyItem.dataset.nome;

        storyUsuario.textContent = nome;
        storyNome.textContent = nome;

        storyModal.classList.add("ativo");
    });
});

fecharStory.addEventListener("click", () => {
    storyModal.classList.remove("ativo");
});

storyModal.addEventListener("click", (evento) => {
    if (evento.target === storyModal) {
        storyModal.classList.remove("ativo");
    }
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        storyModal.classList.remove("ativo");
    }
});

btnAbrir.addEventListener("click", () => {
    publicacao.showModal();
});

btnFechar.addEventListener("click", () => {
    publicacao.close();
});

btnAbrirFeed.addEventListener("click", () => {
    publicacao.close();
    feed.showModal();
});

btnFecharFeed.addEventListener("click", () => {
    feed.close();
});

btnAbrirStory.addEventListener("click", () => {
    publicacao.close();
    story.showModal();
});

btnFecharStory.addEventListener("click", () => {
    story.close();
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

    const validos = novosArquivos.filter((arquivo) => {
        return arquivo.type.startsWith("image/") ||
            arquivo.type.startsWith("video/");
    });

    if (validos.length !== novosArquivos.length) {
        alert("Selecione apenas imagens ou vídeos.");
    }

    arquivosSelecionados.push(...validos);
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

    const galeria = document.createElement("div");
    galeria.classList.add("post-carousel");

    const slides = [];
    const indicadores = [];
    const urlsMidia = [];
    let indiceAtual = 0;

    arquivos.forEach((arquivo, indice) => {
        const url = URL.createObjectURL(arquivo);
        urlsMidia.push(url);

        const slide = document.createElement("div");
        slide.classList.add("post-slide");

        if (indice === 0) {
            slide.classList.add("ativo");
        }

        let midia;

        if (arquivo.type.startsWith("image/")) {
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

        midia.src = url;

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

    galeria.append(contador, anterior, proximo);
    midiaContainer.appendChild(galeria);

    if (arquivos.length > 1) {
        midiaContainer.appendChild(containerIndicadores);
    }

    atualizarCarrossel();

    midiaContainer.addEventListener("DOMNodeRemoved", () => {
        urlsMidia.forEach((url) => URL.revokeObjectURL(url));
    }, { once: true });

    return midiaContainer;
}


function criarPublicacao(arquivos, legenda) {
    const artigo = document.createElement("article");
    artigo.classList.add("card-post");

    const cabecalho = document.createElement("div");
    cabecalho.classList.add("post-head");

    const avatar = document.createElement("span");
    avatar.classList.add("avatar");
    avatar.textContent = "GA";

    const identificacao = document.createElement("div");

    const nome = document.createElement("b");
    nome.textContent = "Gabriel Sampaio";
    nome.id = "postNome";

    const btnApagarPublicacao = document.createElement("div");
    btnApagarPublicacao.id = "btnApagarPublicacao";

    const iconeApagar = document.createElement("span");
    iconeApagar.classList.add("material-symbols-outlined");
    iconeApagar.textContent = "delete";

    const textoApagar = document.createElement("span");
    textoApagar.textContent = "Excluir publicação";

    btnApagarPublicacao.append(iconeApagar, textoApagar);

    btnApagarPublicacao.addEventListener("click", (evento) => {
        evento.preventDefault();

        const confirmar = confirm("Tem certeza de que deseja excluir esta publicação?");

        if (confirmar) {
            artigo.remove();
        }
    });


    const btnCurtida = document.createElement("div");
    btnCurtida.id = "btnCurtida";

    const iconeCurtida = document.createElement("span");
    iconeCurtida.classList.add("material-symbols-outlined");
    iconeCurtida.textContent = "favorite";

    const textoCurtida = document.createElement("span");
    textoCurtida.textContent = "0";

    let curtido = false;

    btnCurtida.addEventListener("click", () => {
        curtido = !curtido;
        textoCurtida.textContent = curtido ? "1" : "0";
        btnCurtida.classList.toggle("curtido", curtido);
    });

    btnCurtida.append(iconeCurtida, textoCurtida);

    const btnComentarios = document.createElement("div");
    btnComentarios.id= "btnComentarios";

    const iconeComentarios = document.createElement("span");
    iconeComentarios.classList.add("material-symbols-outlined");
    iconeComentarios.textContent = "comment";

    const textoComentarios = document.createElement("span");
    textoComentarios.textContent = "Comentários";

    btnComentarios.append(iconeComentarios, textoComentarios);

    const Comentarios = document.getElementById("Comentarios");

    btnComentarios.addEventListener("click", () => {
        Comentarios.showModal();
    });

    const descricao = document.createElement("small");
    descricao.classList.add("post-hora");

    const dataPublicacao = new Date();

    const atualizarHora = () => {
        const agora = new Date();
        const diferenca = Math.floor(
            (agora - dataPublicacao) / 1000
        );

        if (diferenca < 60) {
            descricao.textContent = "há poucos segundos";
        } else if (diferenca < 3600) {
            const minutos = Math.floor(diferenca / 60);
            descricao.textContent = `há ${minutos} min`;
        } else if (diferenca < 86400) {
            const horas = Math.floor(diferenca / 3600);
            descricao.textContent = `há ${horas} h`;
        } else {
            const dias = Math.floor(diferenca / 86400);
            descricao.textContent = `há ${dias} dias`;
        }
    };

    atualizarHora();
    setInterval(atualizarHora, 10000);

    identificacao.append(nome, descricao);
    cabecalho.append(avatar, identificacao);
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

    acoes.appendChild(btnCurtida);
    acoes.appendChild(btnComentarios);
    ["↗ Compartilhar", "🔖 Salvar"].forEach((texto) => {
        const acao = document.createElement("span");
        acao.textContent = texto;
        acoes.appendChild(acao);
        acoes.appendChild(btnApagarPublicacao);
    });

    artigo.appendChild(acoes);

    return artigo;
}

formFeed.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (arquivosSelecionados.length === 0) {
        alert("Selecione pelo menos uma imagem ou um vídeo.");
        return;
    }

    const arquivos = [...arquivosSelecionados];
    const legenda = legendaFeed.value.trim();

    const novaPublicacao = criarPublicacao(arquivos, legenda);

    timeline.prepend(novaPublicacao);

    feed.close();
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