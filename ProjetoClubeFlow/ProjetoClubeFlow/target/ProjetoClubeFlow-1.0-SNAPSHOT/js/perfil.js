console.log("perfil.js foi carregado");

const URL_PERFIL = "../perfilAtleta";
const URL_FOTO = "../fotoPerfilAtleta";

const preview = document.getElementById("preview");
const fotoSemCadastro = document.getElementById("fotoSemCadastro");
const avatar = document.getElementById("perfil");

let urlFotoTemporaria = null;

async function carregarPerfil() {
    try {
        const resposta = await fetch(URL_PERFIL, {
            method: "GET",
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin",
            cache: "no-store"
        });

        const tipoConteudo = resposta.headers.get("content-type") || "";

        if (!tipoConteudo.includes("application/json")) {
            const texto = await resposta.text();

            throw new Error(
                "O servidor não retornou JSON. Resposta: " +
                texto.substring(0, 200)
            );
        }

        const atleta = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                atleta.mensagem || "Não foi possível carregar o perfil."
            );
        }

        atualizarTexto("nomePerfil", atleta.nome, "Atleta");
        atualizarNomeCabecalho(atleta.nome);

        atualizarTexto(
            "posicao",
            atleta.posicaoPrincipal,
            "Não informada"
        );

        atualizarTexto(
            "posicaoCabecalho",
            atleta.posicaoPrincipal,
            "Não informada"
        );

        atualizarTexto(
            "categoria",
            atleta.categoria,
            "Não informada"
        );

        atualizarTexto(
            "categoriaCabecalho",
            atleta.categoria,
            "Não informada"
        );

        atualizarTexto(
            "peDominante",
            atleta.peDominante,
            "Não informado"
        );

        atualizarTexto(
            "altura",
            formatarMedida(atleta.altura, "m"),
            "Não informada"
        );

        atualizarTexto(
            "peso",
            formatarMedida(atleta.peso, "kg"),
            "Não informado"
        );

        atualizarTexto(
            "nivel",
            formatarNivel(atleta.nivel),
            "Não informado"
        );

        atualizarTexto(
            "ranking",
            atleta.numeroCamisa,
            "--"
        );

        const cidade = String(atleta.cidade || "").trim();
        const estado = String(atleta.estado || "").trim();

        const localizacao = [cidade, estado]
            .filter(valor => valor !== "")
            .join(" - ");

        atualizarTexto(
            "cidadeEstado",
            localizacao,
            "Localização não informada"
        );

        atualizarTexto(
            "bio",
            atleta.bio,
            "Nenhuma biografia cadastrada."
        );

        atualizarAvatar(atleta.nome);

        await carregarFotoSalva();

        console.log("Perfil carregado com sucesso.");

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);

        atualizarTexto("nomePerfil", "Erro ao carregar perfil");
        atualizarNomeCabecalho("Erro ao carregar perfil");
        atualizarTexto(
            "bio",
            erro.message,
            "Não foi possível carregar os dados."
        );
    }
}

function atualizarTexto(id, valor, padrao = "Não informado") {
    const elemento = document.getElementById(id);

    if (!elemento) {
        console.warn("Elemento HTML não encontrado:", id);
        return;
    }

    const texto = valor === null || valor === undefined
        ? ""
        : String(valor).trim();

    elemento.textContent = texto || padrao;
}

function atualizarNomeCabecalho(nome) {
    const elemento = document.getElementById("nomeCabecalho");

    if (!elemento) {
        return;
    }

    const texto = String(nome || "").trim() || "Atleta";

    if (elemento.firstChild && elemento.firstChild.nodeType === Node.TEXT_NODE) {
        elemento.firstChild.nodeValue = texto + "\n";
    } else {
        elemento.insertBefore(
            document.createTextNode(texto + "\n"),
            elemento.firstChild
        );
    }
}

function formatarMedida(valor, unidade) {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return "";
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return String(valor);
    }

    return `${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })} ${unidade}`;
}

function formatarNivel(valor) {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return "";
    }

    return `Nível ${valor}`;
}

function atualizarAvatar(nome) {
    if (!avatar) {
        return;
    }

    const partes = String(nome || "Atleta")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    avatar.textContent = partes
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join("") || "AT";

    avatar.style.backgroundImage = "";
    avatar.style.backgroundSize = "";
    avatar.style.backgroundPosition = "";
    avatar.style.backgroundRepeat = "";
    avatar.style.color = "";
}

async function carregarFotoSalva() {
    try {
        const resposta = await fetch(URL_FOTO, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (resposta.status === 404) {
            mostrarFotoIndisponivel();
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                `Não foi possível carregar a foto. HTTP ${resposta.status}.`
            );
        }

        const tipo = resposta.headers.get("content-type") || "";

        if (!tipo.startsWith("image/")) {
            throw new Error("O servidor não retornou um arquivo de imagem.");
        }

        const imagem = await resposta.blob();

        if (urlFotoTemporaria) {
            URL.revokeObjectURL(urlFotoTemporaria);
        }

        urlFotoTemporaria = URL.createObjectURL(imagem);

        preview.src = urlFotoTemporaria;
        preview.hidden = false;

        if (fotoSemCadastro) {
            fotoSemCadastro.hidden = true;
        }

        if (avatar) {
            avatar.style.backgroundImage = `url("${urlFotoTemporaria}")`;
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.style.backgroundRepeat = "no-repeat";
            avatar.style.color = "transparent";
        }

    } catch (erro) {
        console.error("Erro ao carregar foto salva:", erro);
        mostrarFotoIndisponivel();
    }
}

function mostrarFotoIndisponivel() {
    if (preview) {
        preview.removeAttribute("src");
        preview.hidden = true;
    }

    if (fotoSemCadastro) {
        fotoSemCadastro.hidden = false;
    }

    if (avatar) {
        avatar.style.backgroundImage = "";
        avatar.style.backgroundSize = "";
        avatar.style.backgroundPosition = "";
        avatar.style.backgroundRepeat = "";
        avatar.style.color = "";
    }
}

carregarPerfil();