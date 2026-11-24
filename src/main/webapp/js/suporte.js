const formulario = document.getElementById("formChat");
const campoMensagem = document.getElementById("mensagem");
const areaMensagens = document.getElementById("mensagens");
const botaoEnviar = document.getElementById("enviarMensagem");

function adicionarMensagem(conteudo, tipo) {
    const mensagem = document.createElement("div");

    mensagem.classList.add("mensagem", tipo);
    mensagem.textContent = conteudo;

    areaMensagens.appendChild(mensagem);

    areaMensagens.scrollTop = areaMensagens.scrollHeight;

    return mensagem;
}

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mensagem = campoMensagem.value.trim();

    if (!mensagem) {
        return;
    }

    adicionarMensagem(mensagem, "usuario");

    campoMensagem.value = "";
    botaoEnviar.disabled = true;

    const carregamento = adicionarMensagem(
        "Consultando o assistente...",
        "assistente"
    );

    try {
        const resposta = await fetch(
            "/ProjetoClubeFlow/api/suporte",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mensagem: mensagem
                })
            }
        );
        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.resposta || "Erro ao consultar o suporte.");
        }

        carregamento.textContent = dados.resposta;

    } catch (erro) {
        carregamento.textContent =
            "Não foi possível obter uma resposta. Tente novamente.";

        console.error("Erro no suporte:", erro);

    } finally {
        botaoEnviar.disabled = false;
        campoMensagem.focus();
    }
});

