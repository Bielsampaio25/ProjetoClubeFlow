console.log("ARQUIVO perfil-atleta-social.js FOI CARREGADO");

const API_REDE_SOCIAL = "../RedeSocialController";
const parametrosPerfil = new URLSearchParams(window.location.search);
const idPerfilAtleta = parametrosPerfil.get("id");
let perfilAtual = null;

async function apiPerfil(url, opcoes = {}) {
    const resposta = await fetch(url, {credentials: "same-origin", ...opcoes});
    const dados = await resposta.json();

    if (!resposta.ok || dados.sucesso === false) {
        throw new Error(dados.mensagem || "Não foi possível concluir a operação.");
    }

    return dados;
}

function definirTextoPerfil(id, valor) {
    const el = document.getElementById(id);

    if (el) {
        el.textContent = valor == null || valor === "" ? "—" : String(valor);
    }
}

function identificarMimeFoto(bytes) {
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


function converterFoto(foto, mime = "image/jpeg") {
    if (foto == null || foto === "") return null;


    if (typeof foto === "string") {
        if (
            foto.startsWith("data:") ||
            foto.startsWith("http://") ||
            foto.startsWith("https://") ||
            foto.startsWith("../") ||
            foto.startsWith("/")
        ) return foto;

        try {
            const binario = atob(foto);
            const bytes = new Uint8Array(binario.length);

            for (let i = 0; i < binario.length; i++) {
                bytes[i] = binario.charCodeAt(i);
            }

            const mimeDetectado = identificarMimeFoto(bytes);
            const tipoFinal = mimeDetectado !== "application/octet-stream"
                ? mimeDetectado
                : mime;

            return URL.createObjectURL(new Blob([bytes], { type: tipoFinal }));
        } catch (erro) {
            console.error("Erro ao converter foto Base64:", erro);
            return null;
        }
    }

    if (Array.isArray(foto) || foto instanceof Uint8Array) {
        const bytes = foto instanceof Uint8Array ? foto : Uint8Array.from(foto);
        const mimeDetectado = identificarMimeFoto(bytes);
        const tipoFinal = mimeDetectado !== "application/octet-stream"
            ? mimeDetectado
            : mime;

        return URL.createObjectURL(new Blob([bytes], { type: tipoFinal }));
    }

    console.error("Formato de foto não reconhecido:", foto);
    return null;
}

function aplicarFotoPerfil(el, foto, idPlaceholder) {
    if (!el) return;

    const placeholder = idPlaceholder
        ? document.getElementById(idPlaceholder)
        : null;

    const imagem = converterFoto(foto);

    if (!imagem) {
        el.removeAttribute("src");
        el.hidden = true;

        if (placeholder) {
            placeholder.hidden = false;
            placeholder.textContent = "Foto não cadastrada";
        }

        return;
    }

    el.onerror = () => {
        el.onerror = null;
        el.removeAttribute("src");
        el.hidden = true;

        if (placeholder) {
            placeholder.hidden = false;
            placeholder.textContent = "Foto não cadastrada";
        }
    };

    el.src = imagem;
    el.hidden = false;

    if (placeholder) {
        placeholder.hidden = true;
    }
}

function formatarDataPerfil(data) {
    if (!data) return "Agora mesmo";

    const dt = new Date(data);

    if (Number.isNaN(dt.getTime())) return "Agora mesmo";

    const seg = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));

    if (seg < 60) return "há poucos segundos";
    if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
    if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;

    return `há ${Math.floor(seg / 86400)} dias`;
}

function criarMidiasPerfil(midias = []) {
    if (!midias?.length) return null;

    const area = document.createElement("div");
    area.className = "post-media";

    midias.forEach(m => {
        const el = m.tipo === "VIDEO"
            ? document.createElement("video")
            : document.createElement("img");

        el.src = converterFoto(
            m.arquivo,
            m.mime || (m.tipo === "VIDEO" ? "video/mp4" : "image/jpeg")
        ) || "";

        if (el.tagName === "VIDEO") {
            el.controls = true;
            el.playsInline = true;
        } else {
            el.className = "post-image";
            el.alt = m.nome || "Mídia da publicação";
            el.loading = "lazy";
        }

        area.appendChild(el);
    });

    return area;
}

async function compartilharPublicacaoPerfil(post) {
    const link = new URL(window.location.href);
    link.hash = `publicacao-${post.id}`;
    const dados = {
        title: `Publicação de ${post.nome || perfilAtual.nome || "atleta"} · Club Flow`,
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

function criarPublicacaoPerfil(post) {
    const article = document.createElement("article");
    article.className = "post card";
    article.dataset.id = post.id;
    article.id = `publicacao-${post.id}`;

    const head = document.createElement("div");
    head.className = "post-header";

    const avatar = document.createElement("img");
    avatar.className = "post-avatar";
    avatar.alt = "Foto de perfil";
    aplicarFotoPerfil(avatar, post.fotoPerfil);

    const autor = document.createElement("div");
    autor.className = "post-author";

    const nome = document.createElement("strong");
    nome.textContent = post.nome || perfilAtual.nome;

    const user = document.createElement("span");
    user.textContent = `@${post.usuario || perfilAtual.usuario} · ${formatarDataPerfil(post.data)}`;

    autor.append(nome, user);
    head.append(avatar, autor);
    article.appendChild(head);

    if (post.texto) {
        const texto = document.createElement("p");
        texto.className = "post-text";
        texto.textContent = post.texto;
        article.appendChild(texto);
    }

    const media = criarMidiasPerfil(post.midias);

    if (media) {
        article.appendChild(media);
    }

    const stats = document.createElement("div");
    stats.className = "post-stats";
    stats.textContent = `♥ ${post.curtidas || 0} curtidas · 💬 ${post.comentarios || 0} comentários`;
    article.appendChild(stats);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const like = document.createElement("button");
    like.type = "button";
    like.className = "like-btn";
    like.textContent = post.curtido ? "♥ Curtido" : "♡ Curtir";
    like.classList.toggle("liked", !!post.curtido);
    like.setAttribute("aria-pressed", String(!!post.curtido));

    like.addEventListener("click", async () => {
        like.disabled = true;

        try {
            const result = await apiPerfil(API_REDE_SOCIAL, {
                method: "POST",
                body: new URLSearchParams({
                    acao: "curtir",
                    id: post.id
                })
            });

            post.curtido = result.curtido;
            post.curtidas = Math.max(
                0,
                Number(post.curtidas || 0) + (post.curtido ? 1 : -1)
            );

            like.textContent = post.curtido ? "♥ Curtido" : "♡ Curtir";
            like.classList.toggle("liked", post.curtido);
            like.setAttribute("aria-pressed", String(post.curtido));

            stats.textContent = `♥ ${post.curtidas} curtidas · 💬 ${post.comentarios || 0} comentários`;
        } catch (e) {
            alert(e.message);
        } finally {
            like.disabled = false;
        }
    });

    const comment = document.createElement("button");
    comment.type = "button";
    comment.className = "comment-btn";
    comment.textContent = "💬 Comentar";

    comment.addEventListener("click", async () => {
        try {
            const list = await apiPerfil(
                `${API_REDE_SOCIAL}?acao=comentarios&id=${post.id}`
            );

            const historico = list
                .map(c => `${c.nome}: ${c.texto}`)
                .join("\n") || "Ainda não há comentários.";

            const texto = prompt(`${historico}\n\nDigite seu comentário:`);

            if (!texto?.trim()) return;

            await apiPerfil(API_REDE_SOCIAL, {
                method: "POST",
                body: new URLSearchParams({
                    acao: "comentar",
                    id: post.id,
                    texto: texto.trim()
                })
            });

            await carregarPublicacoesPerfil();
        } catch (e) {
            alert(e.message);
        }
    });

    const share = document.createElement("button");
    share.type = "button";
    share.className = "share-btn";
    share.textContent = "Compartilhar";

    share.addEventListener("click", () => compartilharPublicacaoPerfil(post));

    actions.append(like, comment, share);

    if (perfilAtual.proprioPerfil) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn-apagar-publicacao";
        del.textContent = "Excluir publicação";

        del.addEventListener("click", async () => {
            if (!confirm("Deseja excluir esta publicação permanentemente?")) {
                return;
            }

            try {
                await apiPerfil(API_REDE_SOCIAL, {
                    method: "POST",
                    body: new URLSearchParams({
                        acao: "excluirPublicacao",
                        id: post.id
                    })
                });

                await carregarPublicacoesPerfil();
            } catch (e) {
                alert(e.message);
            }
        });

        actions.appendChild(del);
    }

    article.appendChild(actions);

    return article;
}

async function carregarDadosPerfil() {
    console.log("CARREGANDO DADOS DO PERFIL");

    const urlPerfil = idPerfilAtleta
        ? `${API_REDE_SOCIAL}?acao=perfil&id=${encodeURIComponent(idPerfilAtleta)}`
        : `${API_REDE_SOCIAL}?acao=perfil`;

    perfilAtual = await apiPerfil(urlPerfil);

    console.log("PERFIL RETORNADO PELA API:", perfilAtual);

    if (!perfilAtual || !perfilAtual.id) {
        throw new Error("Não foi possível localizar os dados do atleta.");
    }

    const nome = perfilAtual.nome || "Atleta";
    const posicao = perfilAtual.posicao || "Não informado";
    const categoria = perfilAtual.categoria || "Não informado";

    const cidadeEstado = [perfilAtual.cidade, perfilAtual.estado]
        .filter(Boolean)
        .join(" - ");

    const altura = perfilAtual.altura == null
        ? "Não informado"
        : `${perfilAtual.altura} m`;

    const peso = perfilAtual.peso == null
        ? "Não informado"
        : `${perfilAtual.peso} kg`;

    const nivel = perfilAtual.nivel || "Não informado";
    const ranking = perfilAtual.ranking || "—";
    const bio = perfilAtual.bio || "Este atleta ainda não adicionou uma biografia.";

    ["nomeAtleta", "nomeCabecalho"].forEach(id =>
        definirTextoPerfil(id, nome)
    );

    definirTextoPerfil(
        "usuarioAtleta",
        `@${perfilAtual.usuario || `atleta${perfilAtual.id}`}`
    );

    definirTextoPerfil("bioAtleta", bio);
    definirTextoPerfil("sobreAtleta", perfilAtual.sobre || bio);
    definirTextoPerfil("posicaoAtleta", posicao);
    definirTextoPerfil("posicaoCabecalho", `${posicao} · ${categoria}`);
    definirTextoPerfil("categoriaAtleta", categoria);
    definirTextoPerfil("cidadeAtleta", cidadeEstado || "Não informado");
    definirTextoPerfil("peAtleta", perfilAtual.peDominante || "Não informado");
    definirTextoPerfil("alturaAtleta", altura);
    definirTextoPerfil("pesoAtleta", peso);
    definirTextoPerfil("nivelAtleta", nivel);
    definirTextoPerfil("rankingAtleta", ranking);

    definirTextoPerfil("sobrePosicao", posicao);
    definirTextoPerfil("sobreCategoria", categoria);
    definirTextoPerfil("sobreAltura", altura);
    definirTextoPerfil("sobrePeso", peso);
    definirTextoPerfil("sobrePe", perfilAtual.peDominante || "Não informado");
    definirTextoPerfil("sobreRanking", ranking);

    definirTextoPerfil("totalPublicacoes", perfilAtual.publicacoes || 0);
    definirTextoPerfil("totalSeguidores", perfilAtual.seguidores || 0);
    definirTextoPerfil("totalSeguindo", perfilAtual.seguindo || 0);

    aplicarFotoPerfil(
        document.getElementById("fotoAtleta"),
        perfilAtual.fotoPerfil,
        "fotoAtletaSemCadastro"
    );

    aplicarFotoPerfil(
        document.getElementById("fotoCabecalho"),
        perfilAtual.fotoPerfil,
        "fotoCabecalhoSemCadastro"
    );

    const seguir = document.getElementById("btnSeguir");

    if (seguir) {
        seguir.hidden = !!perfilAtual.proprioPerfil;
        seguir.textContent = perfilAtual.seguindoVisualizador
            ? "✓ Seguindo"
            : "+ Seguir";

        seguir.classList.toggle(
            "following",
            !!perfilAtual.seguindoVisualizador
        );
    }
}

async function carregarPublicacoesPerfil() {
    console.log("CARREGAR PUBLICAÇÕES: FUNÇÃO INICIADA");

    const container = document.getElementById("feedAtleta");
    const mensagemVazia = document.getElementById("feedVazio");

    console.log("Container encontrado:", container);
    console.log("Mensagem de feed vazio:", mensagemVazia);

    if (!container) {
        console.error("ERRO: elemento feedAtleta não existe no HTML.");
        return;
    }

    container.innerHTML = "<p>Carregando publicações...</p>";

    if (mensagemVazia) {
        mensagemVazia.hidden = true;
    }

    try {
        if (!perfilAtual || !perfilAtual.id) {
            console.error("ERRO: perfilAtual ou ID do perfil não carregado.");
            container.innerHTML = "<p>Perfil não carregado.</p>";
            return;
        }

        const urlFeed = `${API_REDE_SOCIAL}?acao=feed`;

        console.log("URL requisitada:", urlFeed);
        console.log("ID do atleta do perfil:", perfilAtual.id);
        console.log("Iniciando requisição do feed...");

        const resposta = await apiPerfil(urlFeed);

        console.log("RESPOSTA COMPLETA DO FEED:", resposta);
        console.log("Tipo da resposta:", typeof resposta);
        console.log("É array?", Array.isArray(resposta));

        let publicacoes = [];

        if (Array.isArray(resposta)) {
            publicacoes = resposta;
        } else if (Array.isArray(resposta.publicacoes)) {
            publicacoes = resposta.publicacoes;
        } else if (Array.isArray(resposta.feed)) {
            publicacoes = resposta.feed;
        } else if (Array.isArray(resposta.dados)) {
            publicacoes = resposta.dados;
        } else if (Array.isArray(resposta.posts)) {
            publicacoes = resposta.posts;
        } else if (Array.isArray(resposta.resultados)) {
            publicacoes = resposta.resultados;
        }

        console.log("PUBLICAÇÕES EXTRAÍDAS:", publicacoes);
        console.log("QUANTIDADE RECEBIDA:", publicacoes.length);

        if (publicacoes.length > 0) {
            console.log("ESTRUTURA DA PRIMEIRA PUBLICAÇÃO:", publicacoes[0]);
            console.log("CHAVES DA PRIMEIRA PUBLICAÇÃO:", Object.keys(publicacoes[0]));
        }

        const publicacoesAtleta = publicacoes.filter(publicacao => {
            const idPublicacao = Number(
                publicacao.idAtleta ??
                publicacao.id_atleta ??
                publicacao.atletaId ??
                publicacao.atleta_id
            );

            console.log(
                "Comparando publicação:",
                publicacao.id,
                "| ID do autor:",
                idPublicacao,
                "| ID do perfil:",
                Number(perfilAtual.id)
            );

            return idPublicacao === Number(perfilAtual.id);
        });

        console.log("PUBLICAÇÕES FILTRADAS DO ATLETA:", publicacoesAtleta);
        console.log("TOTAL FILTRADO:", publicacoesAtleta.length);

        container.innerHTML = "";

        if (publicacoesAtleta.length === 0) {
            if (mensagemVazia) {
                mensagemVazia.hidden = false;
            } else {
                container.innerHTML = `
                    <p class="mensagem-sem-publicacoes">
                        Este atleta ainda não possui publicações.
                    </p>
                `;
            }

            return;
        }

        if (mensagemVazia) {
            mensagemVazia.hidden = true;
        }

        publicacoesAtleta.forEach(publicacao => {
            const elemento = criarPublicacaoPerfil(publicacao);
            container.appendChild(elemento);
        });

        console.log("PUBLICAÇÕES RENDERIZADAS COM SUCESSO!");

    } catch (erro) {
        console.error("ERRO AO CARREGAR PUBLICAÇÕES:", erro);
        console.error("Detalhes do erro:", erro.message);

        container.innerHTML = `
            <p>Não foi possível carregar as publicações.</p>
        `;

        if (mensagemVazia) {
            mensagemVazia.hidden = true;
        }
    }
}

function configurarBotaoSeguir() {
    const botao = document.getElementById("btnSeguir");

    if (!botao || botao.hidden) return;

    botao.addEventListener("click", async () => {
        botao.disabled = true;

        try {
            const resultado = await apiPerfil(API_REDE_SOCIAL, {
                method: "POST",
                body: new URLSearchParams({
                    acao: "seguir",
                    id: perfilAtual.id
                })
            });

            perfilAtual.seguindoVisualizador = resultado.seguindo;

            botao.textContent = resultado.seguindo
                ? "✓ Seguindo"
                : "+ Seguir";

            botao.classList.toggle("following", resultado.seguindo);

            const seguidores = Number(perfilAtual.seguidores || 0)
                + (resultado.seguindo ? 1 : -1);

            perfilAtual.seguidores = Math.max(0, seguidores);

            definirTextoPerfil("totalSeguidores", perfilAtual.seguidores);

        } catch (e) {
            alert(e.message);
        } finally {
            botao.disabled = false;
        }
    });
}

async function iniciarPerfilSocial() {
    console.log("INICIANDO PERFIL SOCIAL");

    try {
        await carregarDadosPerfil();

        console.log("PERFIL CARREGADO:", perfilAtual);

        await carregarPublicacoesPerfil();

        console.log("CARREGAMENTO DO FEED FINALIZADO");

        configurarBotaoSeguir();

    } catch (erro) {
        console.error("ERRO NA INICIALIZAÇÃO DO PERFIL:", erro);
    }
}

document.addEventListener("DOMContentLoaded", iniciarPerfilSocial);
