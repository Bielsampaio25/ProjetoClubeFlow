(() => {
    const contexto = window.location.pathname.split("/").filter(Boolean)[0] || "";
    const URL_PERFIL = `/${contexto}/perfilAtleta`;

    function atualizarTextoPreservandoFilhos(elemento, valor) {
        if (!elemento) return;

        const texto = String(valor || "").trim() || "Não informado";
        const noTexto = Array.from(elemento.childNodes)
            .find(no => no.nodeType === Node.TEXT_NODE);

        if (noTexto) {
            noTexto.nodeValue = texto + " ";
        } else {
            elemento.insertBefore(document.createTextNode(texto + " "), elemento.firstChild);
        }
    }

    function iniciais(nome) {
        return String(nome || "Atleta")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte.charAt(0).toUpperCase())
            .join("") || "AT";
    }

    function atualizarAvatar(atleta) {
        const foto = atleta.fotoPerfil || "";
        const alvos = [
            document.getElementById("perfil"),
            document.getElementById("perfilAtleta")
        ].filter(Boolean);

        alvos.forEach(avatar => {
            avatar.textContent = iniciais(atleta.nome);
            avatar.style.backgroundImage = foto ? `url("${foto}")` : "";
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.style.backgroundRepeat = "no-repeat";
            avatar.style.color = foto ? "transparent" : "";
            avatar.setAttribute("aria-label", `Foto de ${atleta.nome || "atleta"}`);
        });

        const imagem = document.getElementById("fotoCabecalho");
        const semFoto = document.getElementById("fotoCabecalhoSemCadastro");

        if (imagem) {
            if (foto) {
                imagem.src = foto;
                imagem.hidden = false;
                if (semFoto) semFoto.hidden = true;
            } else {
                imagem.removeAttribute("src");
                imagem.hidden = true;
                if (semFoto) semFoto.hidden = false;
            }
        }
    }

    async function carregarContaAtleta() {
        try {
            const resposta = await fetch(URL_PERFIL, {
                method: "GET",
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!resposta.ok) {
                throw new Error(`Não foi possível carregar a conta do atleta (HTTP ${resposta.status}).`);
            }

            const atleta = await resposta.json();

            const nome = atleta.nome || "Atleta";
            const posicao = atleta.posicaoPrincipal || "Posição não informada";
            const categoria = atleta.categoria || "Categoria não informada";

            [
                "nome", "nomeAtleta", "nomeCabecalho"
            ].forEach(id => atualizarTextoPreservandoFilhos(
                document.getElementById(id), nome
            ));

            [
                "posicao", "posicaoAtleta", "posicaoCabecalho"
            ].forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = posicao;
            });

            [
                "categoria", "categoriaAtleta", "categoriaCabecalho"
            ].forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = categoria;
            });

            atualizarAvatar(atleta);
        } catch (erro) {
            console.error("Erro ao carregar os dados da conta do atleta:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", carregarContaAtleta, { once: true });
    } else {
        carregarContaAtleta();
    }
})();
