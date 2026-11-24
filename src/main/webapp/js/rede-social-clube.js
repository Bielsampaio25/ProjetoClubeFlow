
const publicacoesStorageKey = "publicacoesClube";
const perfilStorageKey = "perfilClube";
const fotoStorageKey = "fotoPerfilClube";
const storiesStorageKey = "storiesClube";
const tamanhoMaximoArquivo = 2 * 1024 * 1024;

const elemento = id => document.getElementById(id);

const publicacaoDialog = elemento("Publicacao");
const feedDialog = elemento("Feed");
const storyDialog = elemento("Story");
const visualizarStoryDialog = elemento("visualizarStory");
const comentariosDialog = elemento("Comentarios");

const formFeed = elemento("formFeed");
const arquivoFeed = elemento("arquivoFeed");
const previewFeed = elemento("previewFeed");
const legendaFeed = elemento("legendaFeed");
const timeline = elemento("timeline");

const arquivoStory = elemento("arquivoStory");
const previewStory = elemento("previewStory");
const btnPublicarStory = elemento("btnpublicarStory");
const listaStories = elemento("listaStories");

let arquivosSelecionados = [];
let arquivosStory = [];
let storiesPublicados = [];
let indiceStoryAtual = 0;
let publicacaoSelecionadaId = null;

function lerJSON(chave, padrao) {
    try {
        const valor = JSON.parse(localStorage.getItem(chave) || JSON.stringify(padrao));
        return valor ?? padrao;
    } catch {
        return padrao;
    }
}

function obterPerfilClube() {
    const perfil = lerJSON(perfilStorageKey, {});

    const nome = perfil.nome || perfil.nomeClube || "Meu Clube";
    const usuario = perfil.usuario || perfil.slug || perfil.id || "meu-clube";

    return {
        id: String(perfil.id || usuario),
        nome,
        usuario: String(usuario),
        foto: perfil.fotoPerfil || perfil.foto || localStorage.getItem(fotoStorageKey) || ""
    };
}

function obterPublicacoes() {
    const publicacoes = lerJSON(publicacoesStorageKey, []);
    return Array.isArray(publicacoes) ? publicacoes : [];
}

function salvarPublicacoes(publicacoes) {
    try {
        localStorage.setItem(publicacoesStorageKey, JSON.stringify(publicacoes));
        return true;
    } catch (erro) {
        console.error("Erro ao salvar publicações do clube:", erro);
        alert("Não foi possível salvar. O armazenamento pode estar cheio. Reduza o tamanho dos arquivos.");
        return false;
    }
}

function obterStories() {
    const stories = lerJSON(storiesStorageKey, []);
    return Array.isArray(stories) ? stories : [];
}

function salvarStories(stories) {
    try {
        localStorage.setItem(storiesStorageKey, JSON.stringify(stories));
        return true;
    } catch (erro) {
        console.error("Erro ao salvar stories do clube:", erro);
        alert("Não foi possível salvar o Story. O armazenamento pode estar cheio.");
        return false;
    }
}

function converterArquivo(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();

        leitor.onload = () => resolve({
            nome: arquivo.name,
            tipo: arquivo.type,
            tamanho: arquivo.size,
            dados: leitor.result
        });

        leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));

        leitor.readAsDataURL(arquivo);
    });
}

function formatarTempo(data) {
    const instante = new Date(data).getTime();

    if (!Number.isFinite(instante)) {
        return "Agora";
    }

    const segundos = Math.max(0, Math.floor((Date.now() - instante) / 1000));

    if (segundos < 60) return "Agora";
    if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
    if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;

    return `há ${Math.floor(segundos / 86400)} dias`;
}

function criarAvatar(foto, nome) {
    const avatar = document.createElement("span");
    avatar.className = "avatar";

    if (foto) {
        const imagem = document.createElement("img");
        imagem.src = foto;
        imagem.alt = `Logo de ${nome}`;
        avatar.appendChild(imagem);
    } else {
        avatar.textContent = nome
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte[0])
            .join("")
            .toUpperCase();
    }

    return avatar;
}

function atualizarCabecalhoClube() {
    const clube = obterPerfilClube();
    const nome = elemento("nomeClube");
    const avatar = elemento("perfilClube");

    if (nome) {
        nome.replaceChildren();

        const texto = document.createElement("span");
        texto.textContent = clube.nome;

        const subtitulo = document.createElement("small");
        subtitulo.style.display = "block";
        subtitulo.style.color = "var(--text-muted)";
        subtitulo.textContent = "Perfil oficial";

        nome.append(texto, subtitulo);
    }

    if (avatar) {
        avatar.replaceChildren();

        if (clube.foto) {
            const imagem = document.createElement("img");
            imagem.src = clube.foto;
            imagem.alt = `Logo de ${clube.nome}`;
            avatar.appendChild(imagem);
        } else {
            avatar.textContent = clube.nome
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(parte => parte[0])
                .join("")
                .toUpperCase();
        }
    }
}

function abrirDialog(dialog) {
    if (dialog && !dialog.open) {
        dialog.showModal();
    }
}

function fecharDialog(dialog) {
    if (dialog?.open) {
        dialog.close();
    }
}

function abrirCriacaoPublicacao(evento) {
    evento?.preventDefault();
    abrirDialog(publicacaoDialog);
}

elemento("fazerPublicacao")?.addEventListener("click", abrirCriacaoPublicacao);

elemento("fecharPublicacao")?.addEventListener("click", () => {
    fecharDialog(publicacaoDialog);
});

elemento("publicarFeed")?.addEventListener("click", () => {
    fecharDialog(publicacaoDialog);
    abrirDialog(feedDialog);
});

elemento("publicarStory")?.addEventListener("click", () => {
    fecharDialog(publicacaoDialog);
    abrirDialog(storyDialog);
});

elemento("fecharFeed")?.addEventListener("click", () => {
    fecharDialog(feedDialog);
});

elemento("removerArquivo")?.addEventListener("click", () => {
    arquivosSelecionados = [];
    if (arquivoFeed) arquivoFeed.value = "";
    renderizarPreviewFeed();
});

function renderizarPreviewFeed() {
    if (!previewFeed) return;

    previewFeed.replaceChildren();

    if (arquivosSelecionados.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Nenhum arquivo selecionado";
        previewFeed.appendChild(mensagem);
        return;
    }

    arquivosSelecionados.forEach((arquivo, indice) => {
        const item = document.createElement("div");
        item.className = "preview-item";

        const url = URL.createObjectURL(arquivo);
        const midia = document.createElement(
            arquivo.type.startsWith("image/") ? "img" : "video"
        );

        midia.src = url;

        if (midia.tagName === "IMG") {
            midia.alt = `Imagem ${indice + 1}`;
        } else {
            midia.controls = true;
            midia.playsInline = true;
        }

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "remover-midia";
        remover.textContent = "×";
        remover.setAttribute("aria-label", `Remover arquivo ${indice + 1}`);

        remover.addEventListener("click", () => {
            URL.revokeObjectURL(url);
            arquivosSelecionados.splice(indice, 1);
            renderizarPreviewFeed();
        });

        item.append(midia, remover);
        previewFeed.appendChild(item);
    });
}

arquivoFeed?.addEventListener("change", () => {
    const novosArquivos = Array.from(arquivoFeed.files || []);

    const validos = novosArquivos.filter(arquivo =>
        arquivo.type.startsWith("image/") ||
        arquivo.type.startsWith("video/")
    );

    if (validos.length !== novosArquivos.length) {
        alert("Selecione apenas imagens ou vídeos.");
    }

    const dentroDoLimite = validos.filter(arquivo => {
        if (arquivo.size > tamanhoMaximoArquivo) {
            alert(`${arquivo.name} ultrapassa o limite de 2 MB.`);
            return false;
        }

        return true;
    });

    arquivosSelecionados.push(...dentroDoLimite);
    arquivoFeed.value = "";
    renderizarPreviewFeed();
});

function criarMidiaPublicacao(arquivos) {
    const container = document.createElement("div");
    container.className = "post-media";

    if (!arquivos.length) return container;

    const galeria = document.createElement("div");
    galeria.className = "post-carousel";

    const slides = [];
    let indiceAtual = 0;

    arquivos.forEach((arquivo, indice) => {
        const slide = document.createElement("div");
        slide.className = "post-slide";

        if (indice === 0) slide.classList.add("ativo");

        const tipo = arquivo.tipo || arquivo.type || "";
        const origem = arquivo.dados || arquivo.url || "";

        const midia = document.createElement(
            tipo.startsWith("image/") ? "img" : "video"
        );

        midia.src = origem;

        if (midia.tagName === "IMG") {
            midia.alt = `Mídia ${indice + 1} da publicação`;
        } else {
            midia.controls = true;
            midia.playsInline = true;
            midia.preload = "metadata";
        }

        slide.appendChild(midia);
        galeria.appendChild(slide);
        slides.push(slide);
    });

    const contador = document.createElement("span");
    contador.className = "post-carousel-contador";

    const anterior = document.createElement("button");
    anterior.type = "button";
    anterior.className = "post-carousel-btn anterior";
    anterior.textContent = "‹";
    anterior.setAttribute("aria-label", "Mídia anterior");

    const proximo = document.createElement("button");
    proximo.type = "button";
    proximo.className = "post-carousel-btn proximo";
    proximo.textContent = "›";
    proximo.setAttribute("aria-label", "Próxima mídia");

    function atualizar() {
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
    }

    anterior.addEventListener("click", () => {
        if (indiceAtual > 0) {
            indiceAtual--;
            atualizar();
        }
    });

    proximo.addEventListener("click", () => {
        if (indiceAtual < slides.length - 1) {
            indiceAtual++;
            atualizar();
        }
    });

    galeria.append(contador, anterior, proximo);
    container.appendChild(galeria);
    atualizar();

    return container;
}

function atualizarPublicacao(id, alteracoes) {
    const publicacoes = obterPublicacoes();
    const indice = publicacoes.findIndex(item => item.id === id);

    if (indice === -1) return;

    publicacoes[indice] = {
        ...publicacoes[indice],
        ...alteracoes
    };

    salvarPublicacoes(publicacoes);
}

function criarPublicacao(dados) {
    const clube = obterPerfilClube();
    const artigo = document.createElement("article");
    artigo.className = "card-post";
    artigo.dataset.id = dados.id;

    const cabecalho = document.createElement("div");
    cabecalho.className = "post-head";

    cabecalho.appendChild(criarAvatar(dados.fotoPerfil || clube.foto, dados.clubeNome || clube.nome));


    const identificacao = document.createElement("div");

    const nome = document.createElement("a");
    nome.className = "nome-clube";
    nome.textContent = dados.clubeNome || clube.nome;
    nome.href = `perfil-clube-social.html?id=${encodeURIComponent(
        dados.clubeId || clube.id
    )}`;

    const tempo = document.createElement("small");
    tempo.className = "post-hora";
    tempo.textContent = formatarTempo(dados.data);

    identificacao.append(nome, tempo);
    cabecalho.appendChild(identificacao);


    artigo.appendChild(cabecalho);
    artigo.appendChild(criarMidiaPublicacao(dados.arquivos || []));

    if (dados.texto) {
        const legenda = document.createElement("p");
        legenda.className = "post-body";
        legenda.textContent = dados.texto;
        artigo.appendChild(legenda);
    }

    const acoes = document.createElement("div");
    acoes.className = "post-actions";

    const btnCurtir = document.createElement("button");
    btnCurtir.type = "button";
    btnCurtir.className = "btn-curtida";

    const curtido = Boolean(dados.curtido);
    let totalCurtidas = Number(dados.curtidas) || 0;

    const iconeCurtir = document.createElement("span");
    iconeCurtir.className = "material-symbols-outlined";
    iconeCurtir.textContent = "favorite";

    const numeroCurtidas = document.createElement("span");
    numeroCurtidas.textContent = String(totalCurtidas);

    btnCurtir.classList.toggle("curtido", curtido);
    btnCurtir.append(iconeCurtir, numeroCurtidas);

    btnCurtir.addEventListener("click", () => {
        const publicacoes = obterPublicacoes();
        const atual = publicacoes.find(item => item.id === dados.id);

        if (!atual) return;

        const novoEstado = !Boolean(atual.curtido);
        const novoTotal = Math.max(
            0,
            (Number(atual.curtidas) || 0) + (novoEstado ? 1 : -1)
        );

        atualizarPublicacao(dados.id, {
            curtido: novoEstado,
            curtidas: novoTotal
        });

        btnCurtir.classList.toggle("curtido", novoEstado);
        numeroCurtidas.textContent = String(novoTotal);
    });

    const btnComentarios = document.createElement("button");
    btnComentarios.type = "button";
    btnComentarios.className = "btn-comentarios";

    const iconeComentario = document.createElement("span");
    iconeComentario.className = "material-symbols-outlined";
    iconeComentario.textContent = "comment";

    const textoComentario = document.createElement("span");
    textoComentario.textContent = `Comentários (${(dados.comentarios || []).length})`;

    btnComentarios.append(iconeComentario, textoComentario);

    btnComentarios.addEventListener("click", () => {
        publicacaoSelecionadaId = dados.id;
        renderizarComentarios();
        abrirDialog(comentariosDialog);
    });

    const btnCompartilhar = document.createElement("button");
    btnCompartilhar.type = "button";
    btnCompartilhar.className = "btn-compartilhar";

    const iconeCompartilhar = document.createElement("span");
    iconeCompartilhar.className = "material-symbols-outlined";
    iconeCompartilhar.textContent = "share";

    const textoCompartilhar = document.createElement("span");
    textoCompartilhar.textContent = "Compartilhar";

    btnCompartilhar.append(iconeCompartilhar, textoCompartilhar);

    btnCompartilhar.addEventListener("click", async () => {
        const texto = `${dados.clubeNome || clube.nome} publicou no Club Flow: ${dados.texto || "Confira esta publicação!"}`;
        const compartilhamento = {
            title: "Club Flow",
            text: texto,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(compartilhamento);
            } else if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(`${texto}\n${window.location.href}`);
                alert("Texto e link copiados para compartilhar.");
            } else {
                prompt("Copie o texto e o link:", `${texto}\n${window.location.href}`);
            }
        } catch (erro) {
            if (erro.name !== "AbortError") {
                console.error("Erro ao compartilhar:", erro);
            }
        }
    });

    acoes.append(btnCurtir, btnComentarios, btnCompartilhar);
    artigo.appendChild(acoes);

    return artigo;
}

function carregarPublicacoes() {
    if (!timeline) return;

    const clube = obterPerfilClube();

    const publicacoes = obterPublicacoes()
        .filter(item =>
            item.tipoAutor === "clube" &&
            String(item.clubeId) === String(clube.id)
        )
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    timeline.replaceChildren();

    publicacoes.forEach(item => {
        timeline.appendChild(criarPublicacao(item));
    });

    if (publicacoes.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "feed-vazio";
        vazio.textContent = "O clube ainda não publicou nada. Compartilhe a primeira novidade!";
        timeline.appendChild(vazio);
    }
}

formFeed?.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (arquivosSelecionados.length === 0) {
        alert("Selecione pelo menos uma foto ou um vídeo.");
        return;
    }

    const clube = obterPerfilClube();

    try {
        const arquivos = await Promise.all(arquivosSelecionados.map(converterArquivo));

        const dados = {
            id: crypto.randomUUID ? crypto.randomUUID() : `clube-${Date.now()}`,
            tipoAutor: "clube",
            clubeId: clube.id,
            clubeUsuario: clube.usuario,
            clubeNome: clube.nome,
            fotoPerfil: clube.foto,
            texto: legendaFeed.value.trim(),
            data: new Date().toISOString(),
            arquivos,
            curtidas: 0,
            curtido: false,
            comentarios: []
        };

        const publicacoes = obterPublicacoes();
        publicacoes.unshift(dados);

        if (!salvarPublicacoes(publicacoes)) return;

        fecharDialog(feedDialog);
        formFeed.reset();
        arquivosSelecionados = [];
        renderizarPreviewFeed();
        carregarPublicacoes();
    } catch (erro) {
        console.error("Erro ao publicar:", erro);
        alert("Não foi possível criar a publicação. Verifique o tamanho dos arquivos e tente novamente.");
    }
});

feedDialog?.addEventListener("close", () => {
    arquivosSelecionados = [];
    if (formFeed) formFeed.reset();
    renderizarPreviewFeed();
});

function renderizarComentarios() {
    const sessao = elemento("sessaoComentarios");
    if (!sessao) return;

    sessao.replaceChildren();

    const publicacao = obterPublicacoes().find(item => item.id === publicacaoSelecionadaId);

    if (!publicacao) return;

    const comentarios = publicacao.comentarios || [];

    if (comentarios.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Ainda não há comentários.";
        sessao.appendChild(vazio);
    }

    comentarios.forEach(comentario => {
        const item = document.createElement("div");
        item.className = "comentario";

        const autor = document.createElement("strong");
        autor.textContent = comentario.autor || "Visitante";

        const texto = document.createElement("p");
        texto.className = "texto-comentario";
        texto.textContent = comentario.texto;

        item.append(autor, texto);

        if (comentario.clubeId === obterPerfilClube().id) {
            const excluir = document.createElement("button");
            excluir.type = "button";
            excluir.className = "btn-apagar-comentario";
            excluir.textContent = "Excluir";

            excluir.addEventListener("click", () => {
                const atualizadas = obterPublicacoes();
                const indice = atualizadas.findIndex(item => item.id === publicacaoSelecionadaId);

                if (indice === -1) return;

                atualizadas[indice].comentarios = (atualizadas[indice].comentarios || [])
                    .filter(item => item.id !== comentario.id);

                salvarPublicacoes(atualizadas);
                renderizarComentarios();
                carregarPublicacoes();
            });

            item.appendChild(excluir);
        }

        sessao.appendChild(item);
    });
}

elemento("btnEnviarComentarios")?.addEventListener("click", () => {
    const input = elemento("inputComentarios");
    const texto = input?.value.trim();

    if (!texto || !publicacaoSelecionadaId) return;

    const clube = obterPerfilClube();
    const publicacoes = obterPublicacoes();
    const indice = publicacoes.findIndex(item => item.id === publicacaoSelecionadaId);

    if (indice === -1) return;

    publicacoes[indice].comentarios = publicacoes[indice].comentarios || [];

    publicacoes[indice].comentarios.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `comentario-${Date.now()}`,
        clubeId: clube.id,
        autor: clube.nome,
        texto,
        data: new Date().toISOString()
    });

    if (salvarPublicacoes(publicacoes)) {
        input.value = "";
        renderizarComentarios();
        carregarPublicacoes();
    }
});

elemento("voltarComentarios")?.addEventListener("click", evento => {
    evento.preventDefault();
    fecharDialog(comentariosDialog);
});

elemento("inputComentarios")?.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        elemento("btnEnviarComentarios")?.click();
    }
});

function renderizarPreviewStory() {
    if (!previewStory) return;

    previewStory.replaceChildren();

    arquivosStory.forEach((arquivo, indice) => {
        const item = document.createElement("div");
        item.className = "preview-story-item";

        const url = URL.createObjectURL(arquivo);
        const midia = document.createElement(
            arquivo.type.startsWith("image/") ? "img" : "video"
        );

        midia.src = url;

        if (midia.tagName === "IMG") {
            midia.alt = `Prévia do Story ${indice + 1}`;
        } else {
            midia.controls = true;
            midia.muted = true;
        }

        const remover = document.createElement("button");
        remover.type = "button";
        remover.textContent = "×";

        remover.addEventListener("click", () => {
            arquivosStory.splice(indice, 1);
            URL.revokeObjectURL(url);
            renderizarPreviewStory();
        });

        item.append(midia, remover);
        previewStory.appendChild(item);
    });

    if (btnPublicarStory) {
        btnPublicarStory.disabled = arquivosStory.length === 0;
    }
}

arquivoStory?.addEventListener("change", () => {
    const novosArquivos = Array.from(arquivoStory.files || []);

    novosArquivos.forEach(arquivo => {
        if (!arquivo.type.startsWith("image/") && !arquivo.type.startsWith("video/")) {
            alert("Selecione apenas imagens ou vídeos.");
            return;
        }

        if (arquivo.size > tamanhoMaximoArquivo) {
            alert(`${arquivo.name} ultrapassa o limite de 2 MB.`);
            return;
        }

        arquivosStory.push(arquivo);
    });

    arquivoStory.value = "";
    renderizarPreviewStory();
});

function carregarStories() {
    storiesPublicados = obterStories().filter(story =>
        String(story.clubeId) === String(obterPerfilClube().id)
    );

    renderizarStories();
}

function renderizarStories() {
    if (!listaStories) return;

    const meuStory = elemento("meuStory");
    listaStories.replaceChildren();

    const botaoAdicionar = document.createElement("button");
    botaoAdicionar.type = "button";
    botaoAdicionar.className = "avatar";
    botaoAdicionar.id = "abrirCriacaoStory";

    const iconeAdicionar = document.createElement("span");
    iconeAdicionar.className = "material-symbols-outlined";
    iconeAdicionar.textContent = "add";
    botaoAdicionar.appendChild(iconeAdicionar);

    const rotuloAdicionar = document.createElement("div");
    rotuloAdicionar.textContent = "Story do clube";

    const itemAdicionar = document.createElement("div");
    itemAdicionar.className = "story";
    itemAdicionar.id = "meuStory";
    itemAdicionar.append(botaoAdicionar, rotuloAdicionar);
    listaStories.appendChild(itemAdicionar);

    botaoAdicionar.addEventListener("click", () => abrirDialog(storyDialog));

    const agrupados = new Map();

    storiesPublicados.forEach(story => {
        if (!agrupados.has(story.id)) agrupados.set(story.id, []);
        agrupados.get(story.id).push(story);
    });

    agrupados.forEach((midias, id) => {
        const item = document.createElement("div");
        item.className = "story story-publicado";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "avatar avatar-story";

        const miniatura = document.createElement(
            midias[0].tipo.startsWith("image/") ? "img" : "video"
        );

        miniatura.src = midias[0].dados;

        if (miniatura.tagName === "IMG") {
            miniatura.alt = "Story do clube";
        } else {
            miniatura.muted = true;
        }

        botao.appendChild(miniatura);

        const nome = document.createElement("div");
        nome.textContent = "Story do clube";

        botao.addEventListener("click", () => {
            indiceStoryAtual = 0;
            storiesDoGrupo = midias;
            storySelecionadoId = id;
            visualizarMidiaStory();
            abrirDialog(visualizarStoryDialog);
        });

        item.append(botao, nome);
        listaStories.appendChild(item);
    });
}

let storiesDoGrupo = [];
let storySelecionadoId = null;

function visualizarMidiaStory() {
    const conteudo = elemento("conteudoVisualizarStory");
    if (!conteudo || !storiesDoGrupo[indiceStoryAtual]) return;

    conteudo.replaceChildren();

    const story = storiesDoGrupo[indiceStoryAtual];
    const midia = document.createElement(
        story.tipo.startsWith("image/") ? "img" : "video"
    );

    midia.src = story.dados;

    if (midia.tagName === "IMG") {
        midia.alt = "Story do clube";
    } else {
        midia.controls = true;
        midia.autoplay = true;
        midia.playsInline = true;
    }

    conteudo.appendChild(midia);

    const contador = elemento("contadorStory");
    if (contador) contador.textContent = `${indiceStoryAtual + 1} / ${storiesDoGrupo.length}`;

    if (elemento("storyAnterior")) {
        elemento("storyAnterior").disabled = indiceStoryAtual === 0;
    }

    if (elemento("storyProximo")) {
        elemento("storyProximo").disabled = indiceStoryAtual === storiesDoGrupo.length - 1;
    }
}

elemento("storyAnterior")?.addEventListener("click", () => {
    if (indiceStoryAtual > 0) {
        indiceStoryAtual--;
        visualizarMidiaStory();
    }
});

elemento("storyProximo")?.addEventListener("click", () => {
    if (indiceStoryAtual < storiesDoGrupo.length - 1) {
        indiceStoryAtual++;
        visualizarMidiaStory();
    }
});

btnPublicarStory?.addEventListener("click", async () => {
    if (arquivosStory.length === 0) return;

    try {
        const clube = obterPerfilClube();
        const arquivos = await Promise.all(arquivosStory.map(converterArquivo));
        const id = crypto.randomUUID ? crypto.randomUUID() : `story-${Date.now()}`;

        const novosStories = arquivos.map(arquivo => ({
            id,
            tipoAutor: "clube",
            clubeId: clube.id,
            clubeNome: clube.nome,
            ...arquivo,
            data: new Date().toISOString()
        }));

        const salvos = obterStories();
        salvos.push(...novosStories);

        if (!salvarStories(salvos)) return;

        arquivosStory = [];
        if (previewStory) previewStory.replaceChildren();
        fecharDialog(storyDialog);
        carregarStories();
    } catch (erro) {
        console.error("Erro ao publicar Story:", erro);
        alert("Não foi possível publicar o Story.");
    }
});

elemento("fecharStory")?.addEventListener("click", () => {
    arquivosStory = [];
    if (previewStory) previewStory.replaceChildren();
    fecharDialog(storyDialog);
});

elemento("fecharVisualizacaoStory")?.addEventListener("click", () => {
    const conteudo = elemento("conteudoVisualizarStory");
    conteudo?.querySelectorAll("video").forEach(video => video.pause());
    fecharDialog(visualizarStoryDialog);
});

visualizarStoryDialog?.addEventListener("close", () => {
    elemento("conteudoVisualizarStory")?.replaceChildren();
});

elemento("excluirStory")?.addEventListener("click", () => {
    if (!storySelecionadoId) return;

    if (!confirm("Deseja excluir este Story do clube?")) return;

    const restantes = obterStories().filter(story =>
        !(story.id === storySelecionadoId &&
            String(story.clubeId) === String(obterPerfilClube().id))
    );

    if (salvarStories(restantes)) {
        fecharDialog(visualizarStoryDialog);
        storySelecionadoId = null;
        storiesDoGrupo = [];
        carregarStories();
    }
});

elemento("fecharStoryModal")?.addEventListener("click", () => {
    elemento("storyModal")?.classList.remove("ativo");
});

document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
        elemento("storyModal")?.classList.remove("ativo");
    }
});

atualizarCabecalhoClube();
carregarPublicacoes();
carregarStories();

window.addEventListener("storage", evento => {
    if (evento.key === publicacoesStorageKey) carregarPublicacoes();
    if (evento.key === storiesStorageKey) carregarStories();
    if (evento.key === perfilStorageKey || evento.key === fotoStorageKey) {
        atualizarCabecalhoClube();
        carregarPublicacoes();
        carregarStories();
    }
});