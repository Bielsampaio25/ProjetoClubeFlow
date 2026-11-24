console.log("ARQUIVO editar-perfil.js EXECUTADO");
const inputFoto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");
const uploadArea = document.getElementById("uploadArea");
const removerFoto = document.getElementById("removerFoto");

const formPerfil = document.getElementById("formPerfil");
const mensagem = document.getElementById("mensagem");
const nomeAtleta = document.getElementById("nomeAtleta");
const campoSenha = document.getElementById("senha");

const campos = {
    nome: "nomeInput",
    cpf: "cpf",
    dataNascimento: "dtaNascimento",
    cidade: "cidade",
    estado: "estado",
    email: "email",
    telefone: "telefone",
    posicaoPrincipal: "posicaoPrincipal",
    posicaoSecundaria: "posicaoSecundaria",
    peDominante: "peDominante",
    altura: "altura",
    peso: "peso",
    categoria: "categoria",
    numeroCamisa: "numeroCamisa",
    nivel: "nivel",
    bio: "bio"
};

let fotoAtual = "";
let removerFotoAtual = false;

async function requisitarPerfil() {
    const resposta = await fetch("../perfilAtleta", {
        method: "GET",
        headers: {
            Accept: "application/json"
        },
        credentials: "same-origin",
        cache: "no-store"
    });

    const atleta = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
                atleta.mensagem || "Não foi possível carregar o perfil."
                );
    }

    return atleta;
}

async function carregarPerfil() {
    mensagem.textContent = "Carregando perfil...";

    try {
        const atleta = await requisitarPerfil();

        console.log("Perfil retornado pelo servidor:", atleta);
        console.table(
                Object.entries(atleta).map(([propriedade, valor]) => ({
                propriedade,
                valor: valor == null ? "" : String(valor)
            }))
                );

        Object.entries(campos).forEach(([propriedade, id]) => {
            const campo = document.getElementById(id);

            if (!campo) {
                console.warn(`Campo HTML não encontrado: ${id}`);
                return;
            }

            const valor = atleta[propriedade];

            campo.value =
                    valor === null || valor === undefined
                    ? ""
                    : String(valor);

            if (campo.type === "date" && campo.value) {
                campo.value = campo.value.substring(0, 10);
        }
        });

        nomeAtleta.textContent = atleta.nome || "Perfil do atleta";

        fotoAtual = atleta.fotoPerfil || "";
        mostrarFoto(fotoAtual);

        campoSenha.value = "";

        ajustarTextareas();

        mensagem.textContent = "";

        console.log(
                "Nome carregado no campo:",
                document.getElementById("nomeInput")?.value
                );
    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        mensagem.textContent = erro.message;
    }
}

function mostrarFoto(origem) {
    if (origem) {
        previewFoto.src = origem;
        previewFoto.hidden = false;
        uploadArea.hidden = true;
        removerFoto.hidden = false;
    } else {
        previewFoto.removeAttribute("src");
        previewFoto.hidden = true;
        uploadArea.hidden = false;
        removerFoto.hidden = true;
    }
}

function ajustarTextareas() {
    document.querySelectorAll(".form-grid textarea").forEach(textarea => {
        textarea.style.height = "44px";
        textarea.style.height = `${textarea.scrollHeight}px`;
    });
}

inputFoto.addEventListener("change", function () {
    const arquivo = this.files[0];

    if (!arquivo) {
        return;
    }

    if (!["image/png", "image/jpeg"].includes(arquivo.type)) {
        alert("Selecione uma imagem PNG ou JPG.");
        this.value = "";
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        this.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = function (evento) {
        previewFoto.src = evento.target.result;
        previewFoto.hidden = false;
        uploadArea.hidden = true;
        removerFoto.hidden = false;
        removerFotoAtual = false;
    };

    leitor.readAsDataURL(arquivo);
});

removerFoto.addEventListener("click", function (evento) {
    evento.preventDefault();

    inputFoto.value = "";
    mostrarFoto("");
    removerFotoAtual = true;
});

document.querySelectorAll(".form-grid textarea").forEach(textarea => {
    textarea.addEventListener("input", () => {
        textarea.style.height = "44px";
        textarea.style.height = `${textarea.scrollHeight}px`;
    });
});

formPerfil.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const dados = {};

    Object.entries(campos).forEach(([propriedade, id]) => {
        const campo = document.getElementById(id);

        if (!campo) {
            console.error(`Campo HTML não encontrado ao salvar: ${id}`);
            return;
        }

        dados[propriedade] = campo.value.trim();
    });

    dados.senha = campoSenha.value;
    dados.removerFoto = removerFotoAtual;

    console.log("Dados que serão enviados:", dados);

    if (!dados.nome || !dados.email) {
        mensagem.textContent = "Nome e e-mail são obrigatórios.";
        return;
    }

    const arquivoFoto = inputFoto.files[0];
    const corpo = new FormData();

    corpo.append("dados", JSON.stringify(dados));

    if (arquivoFoto) {
        corpo.append("foto", arquivoFoto);
    }

    mensagem.textContent = "Salvando alterações...";

    try {
        const resposta = await fetch("../perfilAtleta", {
            method: "POST",
            body: corpo,
            credentials: "same-origin"
        });

        const resultado = await resposta.json();

        console.log("Resposta ao salvar:", resultado);

        if (!resposta.ok) {
            throw new Error(
                    resultado.mensagem || "Não foi possível salvar o perfil."
                    );
        }

        if (!resultado.sucesso) {
            throw new Error(
                    resultado.mensagem || "O perfil não foi atualizado."
                    );
        }

        mensagem.textContent =
                resultado.mensagem || "Perfil atualizado com sucesso!";

        inputFoto.value = "";
        campoSenha.value = "";
        removerFotoAtual = false;

        const atletaAtualizado = await requisitarPerfil();

        Object.entries(campos).forEach(([propriedade, id]) => {
            const campo = document.getElementById(id);

            if (!campo) {
                return;
            }

            const valor = atletaAtualizado[propriedade];

            campo.value =
                    valor === null || valor === undefined
                    ? ""
                    : String(valor);

            if (campo.type === "date" && campo.value) {
                campo.value = campo.value.substring(0, 10);
        }
        });

        nomeAtleta.textContent =
                atletaAtualizado.nome || "Perfil do atleta";

        fotoAtual = atletaAtualizado.fotoPerfil || "";

        if (!arquivoFoto && !dados.removerFoto) {
            mostrarFoto(fotoAtual);
        } else if (dados.removerFoto) {
            mostrarFoto("");
        } else if (arquivoFoto) {
            mostrarFoto(previewFoto.src);
        }

        ajustarTextareas();

        console.log("Perfil consultado novamente:", atletaAtualizado);
        console.log(
                "Nome carregado no campo:",
                document.getElementById("nomeInput")?.value
                );
    } catch (erro) {
        console.error("Erro ao salvar ou confirmar perfil:", erro);
        mensagem.textContent = erro.message;
    }
});

carregarPerfil();