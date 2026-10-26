const inputFoto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");
const uploadArea = document.getElementById("uploadArea");
const removerFoto = document.getElementById("removerFoto");

const formPerfil = document.getElementById("formPerfil");
const mensagem = document.getElementById("mensagem");
const nomeAtleta = document.getElementById("nomeAtleta");

const campos = {
    nome: "nome",
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

async function carregarPerfil() {
    mensagem.textContent = "Carregando perfil...";

    try {
        const resposta = await fetch("../perfilAtleta", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!resposta.ok) {
            if (resposta.status === 401 || resposta.status === 403) {
                throw new Error("Sua sessão expirou ou você não tem permissão para acessar este perfil.");
            }

            throw new Error(
                `Erro ao carregar o perfil. Código: ${resposta.status}`
            );
        }

        const atleta = await resposta.json();

        console.log("Dados recebidos do servlet:", atleta);

        Object.entries(campos).forEach(([propriedade, id]) => {
            const campo = document.getElementById(id);

            if (!campo) {
                console.warn(`Campo HTML não encontrado: ${id}`);
                return;
            }

            const valor = atleta[propriedade];

            if (valor !== null && valor !== undefined) {
                if (campo.type === "date" && valor) {
                    campo.value = String(valor).substring(0, 10);
                } else {
                    campo.value = valor;
                }
            } else {
                campo.value = "";
            }
        });

        nomeAtleta.textContent = atleta.nome || "Perfil do atleta";

        fotoAtual = atleta.fotoPerfil || "";
        mostrarFoto(fotoAtual);

        document.getElementById("senha").value = "";

        document.querySelectorAll(".form-grid textarea").forEach(textarea => {
            textarea.style.height = "44px";
            textarea.style.height = `${textarea.scrollHeight}px`;
        });

        mensagem.textContent = "";

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

removerFoto.addEventListener("click", function () {
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
        dados[propriedade] = campo.value.trim();
    });

    dados.senha = document.getElementById("senha").value;
    dados.removerFoto = removerFotoAtual;

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

        if (!resposta.ok) {
            throw new Error(
                resultado.mensagem || "Não foi possível salvar o perfil."
            );
        }

        mensagem.textContent =
            resultado.mensagem || "Perfil atualizado com sucesso!";

        nomeAtleta.textContent = dados.nome || "Perfil do atleta";

        if (resultado.fotoPerfil !== undefined) {
            fotoAtual = resultado.fotoPerfil || "";
            mostrarFoto(fotoAtual);
        } else if (arquivoFoto) {
            mostrarFoto(previewFoto.src);
        } else if (removerFotoAtual) {
            mostrarFoto("");
        }

        inputFoto.value = "";
        document.getElementById("senha").value = "";
        removerFotoAtual = false;

    } catch (erro) {
        console.error("Erro ao salvar perfil:", erro);
        mensagem.textContent = erro.message;
    }
});

carregarPerfil();