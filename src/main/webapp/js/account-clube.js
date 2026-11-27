
(() => {
    const contexto = window.location.pathname.split("/").filter(Boolean)[0] || "";
    const URL_PERFIL = `/${contexto}/perfilClube`;

    function atualizarTextoPreservandoFilhos(elemento, valor) {
        if (!elemento) return;

        const texto = String(valor || "").trim() || "Não informado";
        const noTexto = Array.from(elemento.childNodes)
            .find(no => no.nodeType === Node.TEXT_NODE);

        if (noTexto) {
            noTexto.nodeValue = texto + " ";
        } else {
            elemento.insertBefore(
                document.createTextNode(texto + " "),
                elemento.firstChild
            );
        }
    }

    function iniciais(nome) {
        return String(nome || "Clube")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte.charAt(0).toUpperCase())
            .join("") || "CL";
    }

    function atualizarAvatar(clube) {
        const nome = clube.nomeClube || "Clube";

        const alvos = [
            document.getElementById("avatarClube"),
            document.getElementById("perfilClube"),
            document.getElementById("perfil")
        ].filter(Boolean);

        alvos.forEach(avatar => {
            avatar.textContent = iniciais(nome);
            avatar.style.backgroundImage = "";
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.style.backgroundRepeat = "no-repeat";
            avatar.style.color = "";
            avatar.setAttribute("aria-label", `Avatar de ${nome}`);
        });
    }

    async function carregarContaClube() {
        try {
            const resposta = await fetch(URL_PERFIL, {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!resposta.ok) {
                throw new Error(
                    `Não foi possível carregar a conta do clube (HTTP ${resposta.status}).`
                );
            }

            const clube = await resposta.json();

            const nome = clube.nomeClube || "Clube";
            const divisao = clube.divisao || "Divisão não informada";
            const cidade = clube.cidade || "Cidade não informada";
            const estado = clube.estado || "Estado não informado";
            const localizacao = cidade && estado
                ? `${cidade} - ${estado}`
                : cidade || estado;

            [
                "nomeClube",
                "nomeClubeAccount",
                "nomeCabecalhoClube"
            ].forEach(id => atualizarTextoPreservandoFilhos(
                document.getElementById(id), nome
            ));

            [
                "divisao",
                "divisaoClube",
                "divisaoClubeAccount"
            ].forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = divisao;
            });

            [
                "cidadeClube",
                "localizacaoClube",
                "localClube"
            ].forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = localizacao;
            });

            atualizarAvatar(clube);

        } catch (erro) {
            console.error("Erro ao carregar os dados da conta do clube:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            carregarContaClube,
            { once: true }
        );
    } else {
        carregarContaClube();
    }
})();

