console.log("perfil.js foi carregado");

const inputFoto = document.getElementById("foto");
const preview = document.getElementById("preview");
const textoUpload = document.getElementById("textoUpload");
const btnMudarFoto = document.getElementById("btnMudarFoto");
const mensagemFoto = document.getElementById("mensagemFoto");

let fotoTemporaria = null;

async function carregarPerfil() {
    console.log("Iniciando carregamento do perfil...");

    try {
        const resposta = await fetch("../perfilAtleta", {
            method: "GET",
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin",
            cache: "no-store"
        });

        console.log("Status da requisição:", resposta.status);

        const tipoConteudo = resposta.headers.get("content-type");

        if (!tipoConteudo || !tipoConteudo.includes("application/json")) {
            const texto = await resposta.text();

            throw new Error(
                "O servidor não retornou JSON. Resposta: " +
                texto.substring(0, 200)
            );
        }

        const atleta = await resposta.json();

        console.log("Dados recebidos do servidor:", atleta);

        if (!resposta.ok) {
            throw new Error(
                atleta.mensagem || "Não foi possível carregar o perfil."
            );
        }

        atualizarTexto("nomePerfil", atleta.nome, "Atleta");
        atualizarTexto("nomeCabecalho", atleta.nome, "Atleta");

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

        if (!fotoTemporaria) {
            mostrarFoto(atleta.fotoPerfil || "");
        }

        console.log("Perfil atualizado com sucesso.");

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);

        atualizarTexto(
            "nomePerfil",
            "Erro ao carregar perfil"
        );

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

    const texto =
        valor === null || valor === undefined
            ? ""
            : String(valor).trim();

    elemento.textContent = texto || padrao;
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
    const avatar = document.getElementById("perfil");

    if (!avatar) {
        console.warn("Elemento do avatar não encontrado.");
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
}

function mostrarFoto(origem) {
    if (!preview || !textoUpload || !btnMudarFoto) {
        return;
    }

    if (origem) {
        preview.src = origem;
        preview.hidden = false;
        textoUpload.hidden = true;
        btnMudarFoto.hidden = false;
    } else {
        preview.removeAttribute("src");
        preview.hidden = true;
        textoUpload.hidden = false;
        btnMudarFoto.hidden = true;
    }
}

if (inputFoto) {
    inputFoto.addEventListener("change", function () {
        const arquivo = this.files[0];

        if (!arquivo) {
            return;
        }

        if (!["image/png", "image/jpeg"].includes(arquivo.type)) {
            if (mensagemFoto) {
                mensagemFoto.textContent =
                    "Selecione uma imagem PNG ou JPG.";
            }

            this.value = "";
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            if (mensagemFoto) {
                mensagemFoto.textContent =
                    "A imagem deve ter no máximo 5 MB.";
            }

            this.value = "";
            return;
        }

        const leitor = new FileReader();

        leitor.onload = function (evento) {
            fotoTemporaria = evento.target.result;

            mostrarFoto(fotoTemporaria);

            if (mensagemFoto) {
                mensagemFoto.textContent =
                    "Foto visualizada. Para salvá-la permanentemente, é necessário implementar o envio ao servidor.";
            }
        };

        leitor.onerror = function () {
            if (mensagemFoto) {
                mensagemFoto.textContent =
                    "Não foi possível visualizar a imagem.";
            }
        };

        leitor.readAsDataURL(arquivo);
    });
}

carregarPerfil();