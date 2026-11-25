

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

    const extensao = arquivo.name.split(".").pop().toLowerCase();

    if (extensao !== "pdf" || arquivo.type !== "application/pdf") {
        mostrarStatus("Selecione um documento PDF válido.", "error");
        inputDocumento.value = "";
        return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        mostrarStatus("O arquivo ultrapassa o limite de 10 MB.", "error");
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
    selecionarArquivo(inputDocumento.files[0]);
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

    const notaLimitada = Math.max(0, Math.min(10, nota));
    const notaEscala100 = notaLimitada * 10;

    const elementoNota = document.getElementById(atributo.idNota);
    const elementoBarra = document.getElementById(atributo.idBarra);

    if (elementoNota) {
        elementoNota.textContent = formatarNumero(notaEscala100);
    }

    if (elementoBarra) {
        elementoBarra.style.width = `${notaEscala100}%`;
    }
}

function renderizarAtributos(avaliacao = {}) {
    const lista = document.getElementById("listaAtributos");

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    Object.entries(atributos).forEach(([chave, atributo]) => {
        const dados = avaliacao[chave];

        if (!dados) {
            return;
        }

        const nota = Number(
            typeof dados === "object" ? dados.nota : dados
        );

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
            dados.justificativa || "Justificativa não disponível.";

        item.appendChild(topo);
        item.appendChild(progress);
        item.appendChild(justificativa);

        lista.appendChild(item);

        atualizarNotaAtributo(chave, dados);
    });
}

function renderizarRecomendacoes(recomendacoes) {
    const lista = document.getElementById("listaRecomendacoes");

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (!Array.isArray(recomendacoes) || recomendacoes.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Não foram geradas recomendações para este relatório.";
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
            recomendacao.atributo || recomendacao.categoria
        );

        topo.appendChild(numero);
        topo.appendChild(titulo);

        const texto = document.createElement("p");
        texto.textContent =
            recomendacao.recomendacao ||
            recomendacao.sugestao ||
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
        finalização: "Finalização",
        drible: "Drible",
        passe: "Passe",
        resistencia: "Resistência",
        resistência: "Resistência"
    };

    const chave = valor.toLowerCase();

    return nomes[chave] || valor;
}

function renderizarDadosAtleta(atleta = {}) {
    const campos = {
        resultadoAtleta: atleta.nome,
        resultadoClube: atleta.clube,
        resultadoCategoria: atleta.categoria,
        resultadoPosicao: atleta.posicao
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor || "--";
        }
    });
}

function renderizarPeriodo(periodo = {}) {
    const elemento = document.getElementById("resultadoPeriodo");

    if (!elemento) {
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

function renderizarEstatisticas(estatisticas = {}) {
    atualizarIndicador("jogos", estatisticas.jogos);
    atualizarIndicador("gols", estatisticas.gols);
    atualizarIndicador("assistencias", estatisticas.assistencias);
    atualizarIndicador("totalFinalizacoes", estatisticas.finalizacoes);
    atualizarIndicador("minutos", estatisticas.minutos_jogados);
}

function renderizarResultado(resposta) {
    const dados = resposta.dados || resposta;

    const atleta = dados.atleta || {};
    const periodo = dados.periodo || {};
    const estatisticas = dados.estatisticas || {};

    const avaliacao =
        dados.avaliacao_ia ||
        dados.avaliacoes_ia ||
        dados.avaliacoes ||
        {};

    const recomendacoes =
        avaliacao.recomendacoes ||
        dados.sugestoes ||
        dados.recomendacoes ||
        [];

    renderizarDadosAtleta(atleta);
    renderizarPeriodo(periodo);
    renderizarEstatisticas(estatisticas);

    const notaMedia = Number(
        avaliacao.nota_media ??
        avaliacao.nota_geral ??
        dados.nota_media
    );

    if (Number.isFinite(notaMedia)) {
        const nota = formatarNumero(notaMedia, 2);

        const notaMediaElemento = document.getElementById("notaMedia");
        const notaResultadoElemento = document.getElementById("notaMediaResultado");

        if (notaMediaElemento) {
            notaMediaElemento.textContent = nota;
        }

        if (notaResultadoElemento) {
            notaResultadoElemento.textContent = nota;
        }
    }

    renderizarAtributos(avaliacao);
    renderizarRecomendacoes(recomendacoes);

    const metodologia = document.getElementById("metodologia");

    if (metodologia) {
        metodologia.textContent =
            avaliacao.metodologia ||
            dados.metodologia ||
            "A avaliação foi calculada a partir dos indicadores extraídos do relatório e dos critérios experimentais definidos pelo Club Flow.";
    }

    resultadoAnalise.classList.remove("hidden");
    atributosPadrao.classList.add("hidden");
}

async function carregarAnaliseSalva() {
    try {
        mostrarStatus("Carregando seu desempenho salvo...", "info");

        const respostaHTTP = await fetch(API_ANALISE, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "same-origin"
        });

        if (respostaHTTP.status === 404) {
            resultadoAnalise.classList.add("hidden");
            atributosPadrao.classList.remove("hidden");
            limparStatus();
            return;
        }

        if (respostaHTTP.status === 204) {
            resultadoAnalise.classList.add("hidden");
            atributosPadrao.classList.remove("hidden");
            limparStatus();
            return;
        }

        let resposta;

        try {
            resposta = await respostaHTTP.json();
        } catch {
            throw new Error("O servidor retornou uma resposta inválida.");
        }

        if (!respostaHTTP.ok) {
            throw new Error(
                resposta.mensagem ||
                resposta.detail ||
                `Erro HTTP ${respostaHTTP.status}`
            );
        }

        if (resposta.sucesso === false) {
            resultadoAnalise.classList.add("hidden");
            atributosPadrao.classList.remove("hidden");

            mostrarStatus(
                resposta.mensagem || "Nenhuma análise salva foi encontrada.",
                "info"
            );

            return;
        }

        if (!resposta.dados && !resposta.estatisticas) {
            resultadoAnalise.classList.add("hidden");
            atributosPadrao.classList.remove("hidden");
            limparStatus();
            return;
        }

        renderizarResultado(resposta);

        mostrarStatus(
            "Última análise carregada do banco de dados.",
            "success"
        );

    } catch (erro) {
        console.error("Erro ao carregar análise salva:", erro);

        resultadoAnalise.classList.add("hidden");
        atributosPadrao.classList.remove("hidden");

        mostrarStatus(
            "Não foi possível carregar os dados salvos. " + erro.message,
            "error"
        );
    }
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
            body: formData,
            credentials: "same-origin"
        });

        let resposta;

        try {
            resposta = await respostaHTTP.json();
        } catch {
            throw new Error("A API retornou uma resposta que não é JSON válido.");
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
                    "Não foi possível extrair texto suficiente do PDF. O documento pode ser escaneado e precisar de OCR."
                );
            }

            throw new Error(
                resposta.mensagem ||
                "A API não conseguiu realizar a análise."
            );
        }

        renderizarResultado(resposta);

        mostrarStatus(
            "Documento analisado e salvo com sucesso! Os resultados foram atualizados.",
            "success"
        );

    } catch (erro) {
        console.error("Erro na análise:", erro);

        mostrarStatus(erro.message, "error");

    } finally {
        btnAnalisar.disabled = !arquivoAtual;
        btnAnalisar.classList.remove("loading");
        btnAnalisar.textContent = "✦ Analisar documento com IA";
    }
}

btnAnalisar.addEventListener("click", analisarDocumento);

document.addEventListener("DOMContentLoaded", carregarAnaliseSalva);