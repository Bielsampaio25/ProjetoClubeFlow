
const API_ANALISE = `${window.location.origin}/ProjetoClubeFlow/api/desempenho`;

const inputDocumento = document.getElementById("documentoDesempenho");
const arquivoSelecionado = document.getElementById("arquivoSelecionado");
const nomeArquivo = document.getElementById("nomeArquivo");
const tamanhoArquivo = document.getElementById("tamanhoArquivo");
const btnAnalisar = document.getElementById("btnAnalisar");
const btnRemover = document.getElementById("removerArquivo");
const statusAnalise = document.getElementById("statusAnalise");
const resultadoAnalise = document.getElementById("resultadoAnalise");
const atributosPadrao = document.getElementById("atributosPadrao");

let arquivoAtual = null;

const atributos = {
    velocidade: {
        nome: "Velocidade",
        idNota: "velocidade",
        idBarra: "barraVelocidade"
    },
    finalizacao: {
        nome: "Finalização",
        idNota: "finalizacao",
        idBarra: "barraFinalizacao"
    },
    drible: {
        nome: "Drible",
        idNota: "dribles",
        idBarra: "barraDribles"
    },
    passe: {
        nome: "Passe",
        idNota: "passes",
        idBarra: "barraPasses"
    },
    resistencia: {
        nome: "Resistência",
        idNota: "resistencia",
        idBarra: "barraResistencia"
    }
};

function formatarNumero(valor, casas = 0) {
    if (valor === null || valor === undefined || valor === "") {
        return "--";
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return valor;
    }

    return numero.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function formatarTamanho(bytes) {
    if (bytes < 1024) {
        return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function mostrarStatus(mensagem, tipo = "info") {
    statusAnalise.textContent = mensagem;
    statusAnalise.className = `analysis-status ${tipo}`;
    statusAnalise.classList.remove("hidden");
}

function limparStatus() {
    statusAnalise.textContent = "";
    statusAnalise.className = "analysis-status hidden";
}

function selecionarArquivo(arquivo) {
    if (!arquivo) {
        return;
    }

    limparStatus();

    const extensao = arquivo.name
        .split(".")
        .pop()
        .toLowerCase();

    if (extensao !== "pdf" || arquivo.type !== "application/pdf") {
        mostrarStatus(
            "Selecione um documento PDF válido.",
            "error"
        );

        inputDocumento.value = "";
        return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        mostrarStatus(
            "O arquivo ultrapassa o limite de 10 MB.",
            "error"
        );

        inputDocumento.value = "";
        return;
    }

    arquivoAtual = arquivo;

    nomeArquivo.textContent = arquivo.name;
    tamanhoArquivo.textContent = formatarTamanho(arquivo.size);

    arquivoSelecionado.classList.remove("hidden");

    btnAnalisar.disabled = false;

    resultadoAnalise.classList.add("hidden");
    atributosPadrao.classList.remove("hidden");
}

function removerArquivo() {
    arquivoAtual = null;

    inputDocumento.value = "";

    arquivoSelecionado.classList.add("hidden");

    btnAnalisar.disabled = true;

    limparStatus();
}

inputDocumento.addEventListener("change", () => {
    const arquivo = inputDocumento.files[0];

    selecionarArquivo(arquivo);
});

btnRemover.addEventListener("click", removerArquivo);

function atualizarIndicador(id, valor) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.textContent = formatarNumero(valor);
}

function atualizarNotaAtributo(chave, avaliacao) {
    const atributo = atributos[chave];

    if (!atributo || !avaliacao) {
        return;
    }

    const nota = Number(avaliacao.nota);

    if (!Number.isFinite(nota)) {
        return;
    }

    const notaEscala10 = Math.max(0, Math.min(10, nota));

    const notaEscala100 = notaEscala10 * 10;

    const elementoNota = document.getElementById(atributo.idNota);
    const elementoBarra = document.getElementById(atributo.idBarra);

    if (elementoNota) {
        elementoNota.textContent = formatarNumero(notaEscala100);
    }

    if (elementoBarra) {
        elementoBarra.style.width = `${notaEscala100}%`;
    }
}

function renderizarAtributos(avaliacao) {
    const lista = document.getElementById("listaAtributos");

    lista.innerHTML = "";

    Object.entries(atributos).forEach(([chave, atributo]) => {
        const dados = avaliacao[chave];

        if (!dados) {
            return;
        }

        const nota = Number(dados.nota);

        if (!Number.isFinite(nota)) {
            return;
        }

        const notaLimitada = Math.max(0, Math.min(10, nota));
        const percentual = notaLimitada * 10;

        const item = document.createElement("div");
        item.className = "attribute-item";

        const topo = document.createElement("div");
        topo.className = "attribute-top";

        const titulo = document.createElement("h3");
        titulo.textContent = atributo.nome;

        const notaElemento = document.createElement("span");
        notaElemento.className = "attribute-score";
        notaElemento.textContent = `${formatarNumero(nota, 2)} / 10`;

        topo.appendChild(titulo);
        topo.appendChild(notaElemento);

        const progress = document.createElement("div");
        progress.className = "progress";

        const barra = document.createElement("i");
        barra.style.width = `${percentual}%`;

        progress.appendChild(barra);

        const justificativa = document.createElement("p");
        justificativa.className = "attribute-justification";
        justificativa.textContent =
            dados.justificativa || "Não foi fornecida uma justificativa.";

        item.appendChild(topo);
        item.appendChild(progress);
        item.appendChild(justificativa);

        lista.appendChild(item);

        atualizarNotaAtributo(chave, dados);
    });
}

function renderizarRecomendacoes(recomendacoes) {
    const lista = document.getElementById("listaRecomendacoes");

    lista.innerHTML = "";

    if (!Array.isArray(recomendacoes) || recomendacoes.length === 0) {
        const mensagem = document.createElement("p");

        mensagem.textContent =
            "Não foram geradas recomendações para este relatório.";

        mensagem.className = "attribute-justification";

        lista.appendChild(mensagem);

        return;
    }

    recomendacoes.forEach((recomendacao, indice) => {
        const item = document.createElement("div");
        item.className = "recommendation-item";

        const topo = document.createElement("div");
        topo.className = "recommendation-top";

        const numero = document.createElement("span");
        numero.className = "recommendation-number";
        numero.textContent = indice + 1;

        const titulo = document.createElement("strong");
        titulo.textContent = formatarAtributo(
            recomendacao.atributo
        );

        topo.appendChild(numero);
        topo.appendChild(titulo);

        const texto = document.createElement("p");
        texto.textContent =
            recomendacao.recomendacao ||
            "Recomendação não informada.";

        const objetivo = document.createElement("p");
        objetivo.className = "recommendation-objective";

        const objetivoLabel = document.createElement("span");
        objetivoLabel.textContent = "Objetivo: ";

        const objetivoTexto = document.createTextNode(
            recomendacao.objetivo || "Não informado."
        );

        objetivo.appendChild(objetivoLabel);
        objetivo.appendChild(objetivoTexto);

        item.appendChild(topo);
        item.appendChild(texto);
        item.appendChild(objetivo);

        lista.appendChild(item);
    });
}

function formatarAtributo(valor) {
    if (!valor) {
        return "Desenvolvimento geral";
    }

    const nomes = {
        velocidade: "Velocidade",
        finalizacao: "Finalização",
        drible: "Drible",
        passe: "Passe",
        resistencia: "Resistência"
    };

    const chave = valor.toLowerCase();

    return nomes[chave] || valor;
}

function renderizarDadosAtleta(atleta) {
    if (!atleta) {
        return;
    }

    document.getElementById("resultadoAtleta").textContent =
        atleta.nome || "--";

    document.getElementById("resultadoClube").textContent =
        atleta.clube || "--";

    document.getElementById("resultadoCategoria").textContent =
        atleta.categoria || "--";

    document.getElementById("resultadoPosicao").textContent =
        atleta.posicao || "--";
}

function renderizarPeriodo(periodo) {
    const elemento = document.getElementById("resultadoPeriodo");

    if (!periodo) {
        elemento.textContent = "--";
        return;
    }

    const inicio = periodo.inicio || "";
    const fim = periodo.fim || "";

    if (inicio && fim) {
        elemento.textContent = `${inicio} a ${fim}`;
    } else if (inicio || fim) {
        elemento.textContent = inicio || fim;
    } else {
        elemento.textContent = "--";
    }
}

function renderizarEstatisticas(estatisticas) {
    if (!estatisticas) {
        return;
    }

    atualizarIndicador("jogos", estatisticas.jogos);
    atualizarIndicador("gols", estatisticas.gols);
    atualizarIndicador("assistencias", estatisticas.assistencias);
    atualizarIndicador(
        "totalFinalizacoes",
        estatisticas.finalizacoes
    );

    atualizarIndicador(
        "minutos",
        estatisticas.minutos_jogados
    );
}

function renderizarResultado(resposta) {
    const dados = resposta.dados;

    if (!dados) {
        throw new Error(
            "A API não retornou os dados da análise."
        );
    }

    const atleta = dados.atleta || {};
    const periodo = dados.periodo || {};
    const estatisticas = dados.estatisticas || {};
    const avaliacao = dados.avaliacao_ia || {};

    renderizarDadosAtleta(atleta);
    renderizarPeriodo(periodo);
    renderizarEstatisticas(estatisticas);

    const notaMedia = Number(avaliacao.nota_media);

    if (Number.isFinite(notaMedia)) {
        document.getElementById("notaMedia").textContent =
            formatarNumero(notaMedia, 2);

        document.getElementById("notaMediaResultado").textContent =
            formatarNumero(notaMedia, 2);
    }

    renderizarAtributos(avaliacao);
    renderizarRecomendacoes(avaliacao.recomendacoes);

    document.getElementById("metodologia").textContent =
        avaliacao.metodologia ||
        "A avaliação foi calculada a partir dos indicadores extraídos do relatório e dos critérios experimentais definidos pelo Club Flow.";

    resultadoAnalise.classList.remove("hidden");
    atributosPadrao.classList.add("hidden");

    resultadoAnalise.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function analisarDocumento() {
    if (!arquivoAtual) {
        mostrarStatus(
            "Selecione um documento antes de iniciar a análise.",
            "error"
        );

        return;
    }

    const formData = new FormData();

    formData.append("arquivo", arquivoAtual);

    btnAnalisar.disabled = true;
    btnAnalisar.classList.add("loading");
    btnAnalisar.textContent = "⏳ Analisando documento...";

    mostrarStatus(
        "O documento está sendo enviado. A IA está extraindo e analisando os indicadores. Isso pode levar alguns instantes.",
        "info"
    );

    try {
        const respostaHTTP = await fetch(API_ANALISE, {
            method: "POST",
            body: formData
        });

        let resposta;

        try {
            resposta = await respostaHTTP.json();
        } catch {
            throw new Error(
                "A API retornou uma resposta que não é JSON válido."
            );
        }

        if (!respostaHTTP.ok) {
            throw new Error(
                resposta.detail ||
                resposta.mensagem ||
                `Erro HTTP ${respostaHTTP.status}`
            );
        }

        if (!resposta.sucesso) {
            if (resposta.necessita_ocr) {
                throw new Error(
                    "Não foi possível extrair texto suficiente do PDF. " +
                    "O documento pode ser escaneado e precisar de OCR."
                );
            }

            throw new Error(
                resposta.mensagem ||
                "A API não conseguiu realizar a análise."
            );
        }

        renderizarResultado(resposta);

        mostrarStatus(
            "Documento analisado com sucesso! Os resultados foram atualizados.",
            "success"
        );

    } catch (erro) {
        console.error("Erro na análise:", erro);

        let mensagem = erro.message;

        if (
            erro instanceof TypeError &&
            erro.message.toLowerCase().includes("fetch")
        ) {
            mensagem =
                "Não foi possível conectar à IA. " +
                "Verifique se a API Python está rodando na porta 8001 " +
                "e se o CORS está configurado.";
        }

        mostrarStatus(mensagem, "error");

    } finally {
        btnAnalisar.disabled = !arquivoAtual;
        btnAnalisar.classList.remove("loading");
        btnAnalisar.textContent = "✦ Analisar documento com IA";
    }
}

btnAnalisar.addEventListener("click", analisarDocumento);


