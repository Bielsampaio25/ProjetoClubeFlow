
console.log("perfil.js foi carregado");

const inputFoto = document.getElementById("foto");
const preview = document.getElementById("preview");
const textoUpload = document.getElementById("textoUpload");
const btnMudarFoto = document.getElementById("btnMudarFoto");
const mensagemFoto = document.getElementById("mensagemFoto");

const URL_PERFIL = "../perfilAtleta";
const URL_FOTO = "../fotoPerfilAtleta";
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

let fotoTemporaria = null;
let carregamentoFoto = 0;

async function carregarPerfil() {
    console.log("Iniciando carregamento do perfil...");

    try {
        const resposta = await fetch(URL_PERFIL, {
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

    await carregarFotoSalva();
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

function mostrarMensagem(mensagem) {
    if (mensagemFoto) {
        mensagemFoto.textContent = mensagem;
    }
}

function validarArquivo(arquivo) {
    const tiposPermitidos = ["image/png", "image/jpeg"];

    if (!tiposPermitidos.includes(arquivo.type)) {
        mostrarMensagem("Selecione uma imagem PNG ou JPG.");
        return false;
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
        mostrarMensagem("A imagem deve ter no máximo 5 MB.");
        return false;
    }

    if (arquivo.size === 0) {
        mostrarMensagem("O arquivo selecionado está vazio.");
        return false;
    }

    return true;
}

async function enviarFoto(arquivo) {
    const formulario = new FormData();
    formulario.append("foto", arquivo);

    try {
        mostrarMensagem("Salvando foto...");

        if (btnMudarFoto) {
            btnMudarFoto.disabled = true;
        }

        const resposta = await fetch(URL_FOTO, {
            method: "POST",
            body: formulario,
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!resposta.ok) {
            if (resposta.status === 401) {
                throw new Error(
                    "Sua sessão expirou ou o ID do atleta não foi encontrado na sessão."
                );
            }

            if (resposta.status === 413) {
                throw new Error("A imagem excede o tamanho permitido pelo servidor.");
            }

            const detalhe = await resposta.text();

            throw new Error(
                detalhe || `Falha ao salvar a foto. HTTP ${resposta.status}.`
            );
        }

        mostrarMensagem("Foto salva com sucesso!");

        fotoTemporaria = null;

        await carregarFotoSalva();

    } catch (erro) {
        console.error("Erro ao enviar foto:", erro);

        mostrarMensagem(erro.message || "Não foi possível salvar a foto.");

    } finally {
        if (btnMudarFoto) {
            btnMudarFoto.disabled = false;
        }

        if (inputFoto) {
            inputFoto.value = "";
        }
    }
}

async function carregarFotoSalva() {
    const chamadaAtual = ++carregamentoFoto;

    try {
        const resposta = await fetch(URL_FOTO, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (chamadaAtual !== carregamentoFoto) {
            return;
        }

        if (resposta.status === 404) {
            fotoTemporaria = null;
            mostrarFoto("");
            return;
        }

        if (!resposta.ok) {
            if (resposta.status === 401) {
                console.warn("Sessão não autenticada para carregar a foto.");
                return;
            }

            throw new Error(
                `Não foi possível carregar a foto. HTTP ${resposta.status}.`
            );
        }

        const tipo = resposta.headers.get("content-type") || "";

        if (!tipo.startsWith("image/")) {
            throw new Error("O servidor não retornou um arquivo de imagem.");
        }

        const imagem = await resposta.blob();

        if (chamadaAtual !== carregamentoFoto) {
            return;
        }

        if (fotoTemporaria) {
            return;
        }

        const urlNova = URL.createObjectURL(imagem);
        const urlAnterior = preview?.dataset.urlTemporaria;

        if (preview) {
            preview.dataset.urlTemporaria = urlNova;
        }

        mostrarFoto(urlNova);

        if (urlAnterior) {
            URL.revokeObjectURL(urlAnterior);
        }

    } catch (erro) {
        console.error("Erro ao carregar foto salva:", erro);
    }
}

if (btnMudarFoto && inputFoto) {
    btnMudarFoto.addEventListener("click", () => {
        inputFoto.click();
    });
}

if (inputFoto) {
    inputFoto.addEventListener("change", async function () {
        const arquivo = this.files[0];

        if (!arquivo) {
            return;
        }

        if (!validarArquivo(arquivo)) {
            this.value = "";
            return;
        }

        const leitor = new FileReader();

        leitor.onload = async function (evento) {
            fotoTemporaria = evento.target.result;

            mostrarFoto(fotoTemporaria);

            await enviarFoto(arquivo);
        };

        leitor.onerror = function () {
            mostrarMensagem("Não foi possível ler a imagem selecionada.");
        };

        leitor.readAsDataURL(arquivo);
    });
}

carregarPerfil();