
const perfilStorageKey = "perfilClube";
const fotoStorageKey = "fotoPerfilClube";
const publicacoesStorageKey = "publicacoesClube";

const parametros = new URLSearchParams(window.location.search);
const idClube = parametros.get("id");

const perfilPadrao = {
    id: "clube-padrao",
    nome: "Meu Clube",
    usuario: "meuclube",
    cidade: "Salvador - BA",
    modalidade: "Futebol",
    categoria: "Clube esportivo",
    bio: "Conheça nosso clube, nossa história e acompanhe nossas atividades.",
    sobre: "Um clube dedicado ao desenvolvimento de atletas e à paixão pelo futebol."
};

function obterPerfilClube() {
    let perfilSalvo = {};

    try {
        perfilSalvo = JSON.parse(
            localStorage.getItem(perfilStorageKey) || "{}"
        );
    } catch {
        perfilSalvo = {};
    }

    const identificador = idClube;

    if (
        !identificador ||
        String(identificador) === String(perfilSalvo.id) ||
        String(identificador) === String(perfilSalvo.usuario)
    ) {
        return {
            ...perfilPadrao,
            ...perfilSalvo
        };
    }

    const publicacaoClube = obterPublicacoesSalvas().find((publicacao) =>
        String(publicacao.clubeId) === String(identificador) ||
        String(publicacao.usuarioId) === String(identificador) ||
        String(publicacao.usuario) === String(identificador)
    );

    if (publicacaoClube) {
        return {
            ...perfilPadrao,
            id: publicacaoClube.clubeId ||
                publicacaoClube.usuarioId ||
                identificador,
            nome: publicacaoClube.clubeNome ||
                publicacaoClube.usuarioNome ||
                perfilPadrao.nome,
            usuario: publicacaoClube.clubeUsuario ||
                publicacaoClube.usuario ||
                perfilPadrao.usuario
        };
    }

    return {
        ...perfilPadrao,
        id: identificador
    };
}

function obterFotoClube(publicacao) {
    let perfilSalvo = {};

    try {
        perfilSalvo = JSON.parse(
            localStorage.getItem(perfilStorageKey) || "{}"
        );
    } catch {
        perfilSalvo = {};
    }

    if (
        !idClube ||
        String(idClube) === String(perfilSalvo.id) ||
        String(idClube) === String(perfilSalvo.usuario)
    ) {
        return localStorage.getItem(fotoStorageKey) ||
            perfilSalvo.fotoPerfil ||
            publicacao?.fotoPerfil ||
            "";
    }

    return publicacao?.fotoPerfilClube ||
        publicacao?.fotoPerfil ||
        "";
}

function aplicarFoto(elemento, foto) {
    if (!elemento) {
        return;
    }

    if (!foto) {
        elemento.hidden = true;
        return;
    }

    elemento.src = foto;
    elemento.hidden = false;

    elemento.onerror = () => {
        elemento.onerror = null;
        elemento.hidden = true;
    };
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento && valor !== undefined && valor !== null) {
        elemento.textContent = valor;
    }
}

function carregarPerfilClube() {
    const perfil = obterPerfilClube();

    definirTexto("nomeClube", perfil.nome);
    definirTexto("nomeCabecalho", perfil.nome);
    definirTexto("usuarioClube", `@${perfil.usuario}`);
    definirTexto("bioClube", perfil.bio);
    definirTexto("sobreClube", perfil.sobre || perfil.bio);
    definirTexto("cidadeClube", perfil.cidade);
    definirTexto("modalidadeClube", perfil.modalidade);
    definirTexto("categoriaClube", perfil.categoria);

    const foto = obterFotoClube();

    aplicarFoto(document.getElementById("fotoClube"), foto);
    aplicarFoto(document.getElementById("fotoCabecalho"), foto);
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
        alert("Não foi possível atualizar a publicação.");
        return false;
    }
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

    if (!Array.isArray(arquivos)) {
        return midias;
    }

    arquivos.forEach((arquivo) => {
        const tipo = arquivo.tipo || arquivo.type || "";
        const origem = arquivo.dados || arquivo.url || "";

        if (!origem) {
            return;
        }

        let midia;

        if (tipo.startsWith("image/")) {
            midia = document.createElement("img");
            midia.alt = arquivo.nome || "Imagem da publicação";
            midia.loading = "lazy";
        } else if (tipo.startsWith("video/")) {
            midia = document.createElement("video");
            midia.controls = true;
            midia.playsInline = true;
            midia.preload = "metadata";
        } else {
            return;
        }

        midia.className = "post-image";
        midia.src = origem;
        midias.appendChild(midia);
    });

    return midias;
}

function atualizarPublicacaoSalva(id, alteracoes) {
    const publicacoes = obterPublicacoesSalvas();

    const indice = publicacoes.findIndex(
        (publicacao) => String(publicacao.id) === String(id)
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

function criarPublicacaoClube(publicacao, perfil) {
    const artigo = document.createElement("article");
    artigo.className = "post card";
    artigo.dataset.id = publicacao.id || "";

    const cabecalho = document.createElement("div");
    cabecalho.className = "post-header";

    const foto = document.createElement("img");
    foto.className = "post-avatar";
    foto.alt = "Foto do clube";
    aplicarFoto(foto, obterFotoClube(publicacao));

    const autor = document.createElement("div");
    autor.className = "post-author";

    const nome = document.createElement("strong");
    nome.textContent = publicacao.clubeNome ||
        publicacao.usuarioNome ||
        perfil.nome;

    const usuario = document.createElement("span");
    usuario.textContent = `@${publicacao.clubeUsuario ||
        publicacao.usuario ||
        perfil.usuario} · ${formatarDataPublicacao(publicacao.data)}`;

    autor.append(nome, usuario);
    cabecalho.append(foto, autor);
    artigo.appendChild(cabecalho);

    const textoPublicacao = publicacao.texto ||
        publicacao.conteudo ||
        "";

    if (textoPublicacao) {
        const texto = document.createElement("p");
        texto.className = "post-text";
        texto.textContent = textoPublicacao;
        artigo.appendChild(texto);
    }

    if (Array.isArray(publicacao.arquivos) &&
        publicacao.arquivos.length > 0) {
        artigo.appendChild(
            criarMidiaPublicacao(publicacao.arquivos)
        );
    }

    const estatisticas = document.createElement("div");
    estatisticas.className = "post-stats";

    const totalCurtidas = document.createElement("span");
    totalCurtidas.textContent =
        `❤️ ${Number(publicacao.curtidas) || 0} curtidas`;

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
        const curtidasAtuais = Number(publicacao.curtidas) || 0;
        const curtido = !botaoCurtir.classList.contains("liked");
        const novoTotal = Math.max(
            0,
            curtidasAtuais + (curtido ? 1 : -1)
        );

        if (!atualizarPublicacaoSalva(publicacao.id, {
            curtidas: novoTotal
        })) {
            return;
        }

        publicacao.curtidas = novoTotal;
        botaoCurtir.classList.toggle("liked", curtido);
        botaoCurtir.textContent = curtido ? "♥ Curtido" : "♡ Curtir";
        totalCurtidas.textContent = `❤️ ${novoTotal} curtidas`;
    });

    botaoCompartilhar.addEventListener("click", async () => {
        const url = window.location.href;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: perfil.nome,
                    text: `Confira as publicações de ${perfil.nome} no Club Flow.`,
                    url
                });
            } else {
                await navigator.clipboard.writeText(url);
                alert("Link do perfil copiado!");
            }
        } catch (erro) {
            if (erro.name !== "AbortError") {
                prompt("Copie o link do perfil:", url);
            }
        }
    });

    botaoExcluir.addEventListener("click", () => {
        const perfilAtual = obterPerfilClube();

        const ehMeuPerfil =
            !idClube ||
            String(idClube) === String(perfilAtual.id) ||
            String(idClube) === String(perfilAtual.usuario);

        if (!ehMeuPerfil) {
            alert("Você só pode excluir publicações do seu próprio clube.");
            return;
        }

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
        carregarPublicacoesClube();
    });

    return artigo;
}

function carregarPublicacoesClube() {
    const feed = document.getElementById("feedClube");
    const vazio = document.getElementById("feedVazio");
    const totalElemento = document.getElementById("totalPublicacoes");

    if (!feed || !vazio) {
        console.error(
            "Adicione os elementos #feedClube e #feedVazio ao HTML."
        );
        return;
    }

    const perfil = obterPerfilClube();

   const identificador = String(
    idClube || perfil.id || perfil.usuario
);

const publicacoes = obterPublicacoesSalvas();

const publicacoesDoClube = publicacoes.filter((publicacao) => {
    if (publicacao.tipoAutor && publicacao.tipoAutor !== "clube") {
        return false;
    }

    const identificadores = [
        publicacao.clubeId,
        publicacao.clubeUsuario,
        publicacao.usuarioId,
        publicacao.usuario
    ];

    return identificadores.some((valor) =>
        valor != null && String(valor) === identificador
    );
});

    feed.replaceChildren();

    if (totalElemento) {
        totalElemento.textContent = String(publicacoesDoClube.length);
    }

    vazio.hidden = publicacoesDoClube.length > 0;

    publicacoesDoClube.forEach((publicacao) => {
        feed.appendChild(criarPublicacaoClube(publicacao, perfil));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    carregarPerfilClube();
    carregarPublicacoesClube();
});

window.addEventListener("storage", (evento) => {
    if (
        evento.key === publicacoesStorageKey ||
        evento.key === perfilStorageKey ||
        evento.key === fotoStorageKey
    ) {
        carregarPerfilClube();
        carregarPublicacoesClube();
    }
});

window.addEventListener("focus", () => {
    carregarPerfilClube();
    carregarPublicacoesClube();
});
