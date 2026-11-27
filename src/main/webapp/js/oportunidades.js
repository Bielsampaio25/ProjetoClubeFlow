const API_URL = "../api/oportunidades";

const STATUS_PROPOSTA = {
    PENDENTE: "Aguardando sua resposta",
    ACEITA: "Proposta aceita",
    RECUSADA: "Proposta recusada"
};

const oportunidadesAtleta = {
    propostas: [],
    filtroAtual: "TODAS",
    propostaSelecionada: null,
    respostaSelecionada: null,
    enviandoResposta: false,

    iniciar() {
        this.configurarEventos();
        this.carregarPropostas();
    },

    configurarEventos() {
        const btnAtualizar = document.getElementById("btnAtualizar");
        const btnRetry = document.getElementById("btnTentarNovamente");
        const filtros = document.querySelectorAll(".filtro-proposta");
        const modal = document.getElementById("modalProposta");
        const fechar = document.getElementById("fecharModal");
        const cancelar = document.getElementById("btnCancelarModal");
        const confirmar = document.getElementById("btnConfirmarModal");

        if (btnAtualizar) {
            btnAtualizar.addEventListener("click", () => this.carregarPropostas());
        }

        if (btnRetry) {
            btnRetry.addEventListener("click", () => this.carregarPropostas());
        }

        filtros.forEach((botao) => {
            botao.addEventListener("click", () => {
                this.filtroAtual = botao.dataset.filtro || "TODAS";

                filtros.forEach((item) => item.classList.remove("ativo"));
                botao.classList.add("ativo");

                this.renderizarPropostas();
            });
        });

        if (fechar) fechar.addEventListener("click", () => this.fecharModal());
        if (cancelar) cancelar.addEventListener("click", () => this.fecharModal());

        if (confirmar) {
            confirmar.addEventListener("click", () => this.confirmarResposta());
        }

        if (modal) {
            modal.addEventListener("click", (evento) => {
                if (evento.target === modal) this.fecharModal();
            });
        }

        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && modal && !modal.hidden) {
                this.fecharModal();
            }
        });
    },

    async carregarPropostas() {
        this.exibirCarregando();

        try {
            const resposta = await fetch(`${API_URL}?acao=propostasRecebidas`);

            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            const dados = await this.lerResposta(resposta);

            if (!resposta.ok) {
                throw new Error(dados.mensagem || "Erro ao carregar convites.");
            }

            if (!Array.isArray(dados)) {
                throw new Error("A resposta do servidor não possui formato válido.");
            }

            this.propostas = dados;
            this.atualizarResumo();
            this.renderizarPropostas();
        } catch (erro) {
            console.error("Erro ao carregar propostas recebidas:", erro);
            this.exibirErro(erro.message);
        }
    },

    atualizarResumo() {
        const total = this.propostas.length;
        const pendentes = this.propostas.filter((p) => p.statusResposta === "PENDENTE").length;
        const aceitas = this.propostas.filter((p) => p.statusResposta === "ACEITA").length;

        const elTotal = document.getElementById("totalPropostas");
        const elPendentes = document.getElementById("totalPendentes");
        const elAceitas = document.getElementById("totalAceitas");

        if (elTotal) elTotal.textContent = total;
        if (elPendentes) elPendentes.textContent = pendentes;
        if (elAceitas) elAceitas.textContent = aceitas;
    },

    obterPropostasFiltradas() {
        if (this.filtroAtual === "TODAS") return this.propostas;

        return this.propostas.filter((proposta) =>
            proposta.statusResposta === this.filtroAtual
        );
    },

    renderizarPropostas() {
        const lista = document.getElementById("listaPropostas");
        const carregando = document.getElementById("propostasCarregando");
        const erro = document.getElementById("propostasErro");
        const vazio = document.getElementById("propostasVazias");
        const tituloVazio = document.getElementById("tituloVazio");
        const textoVazio = document.getElementById("textoVazio");

        if (!lista) return;

        if (carregando) carregando.hidden = true;
        if (erro) erro.hidden = true;

        const propostasFiltradas = this.obterPropostasFiltradas();

        if (propostasFiltradas.length === 0) {
            lista.innerHTML = "";
            lista.hidden = true;
            if (vazio) vazio.hidden = false;

            if (tituloVazio && textoVazio) {
                if (this.propostas.length === 0) {
                    tituloVazio.textContent = "Você ainda não recebeu propostas";
                    textoVazio.textContent = "Quando um clube enviar um convite direcionado ao seu perfil, ele aparecerá aqui.";
                } else {
                    tituloVazio.textContent = "Nenhuma proposta neste filtro";
                    textoVazio.textContent = "Não há convites com esse status no momento.";
                }
            }
            return;
        }

        if (vazio) vazio.hidden = true;
        lista.hidden = false;

        lista.innerHTML = propostasFiltradas
            .map((proposta) => this.renderizarCard(proposta))
            .join("");
    },

    renderizarCard(proposta) {
        const status = String(proposta.statusResposta || "PENDENTE").toUpperCase();
        const statusLabel = STATUS_PROPOSTA[status] || "Status não informado";
        const statusClasse = status.toLowerCase();
        const iniciais = this.iniciais(proposta.nomeClube);
        const localClube = [proposta.cidadeClube, proposta.estadoClube]
            .filter(Boolean)
            .join(" - ");

        const idade = this.formatarFaixaEtaria(proposta.idadeMinima, proposta.idadeMaxima);
        const dataEnvio = this.formatarData(proposta.dataInscricao);
        const prazo = this.formatarData(proposta.prazoInscricao);
        const avaliacao = this.formatarDataHora(proposta.dataHoraAvaliacao);

        const podeResponder =
            status === "PENDENTE" &&
            String(proposta.statusOportunidade || "").toUpperCase() === "ABERTA";

        return `
            <article class="proposta-card">
                <div class="proposta-topo">
                    <div class="proposta-clube">
                        <div class="proposta-logo">${this.escapeHtml(iniciais)}</div>
                        <div class="proposta-clube-info">
                            <h3>${this.escapeHtml(proposta.nomeClube || "Clube não identificado")}</h3>
                            <p>${this.escapeHtml(proposta.divisao || "Divisão não informada")}${localClube ? ` · ${this.escapeHtml(localClube)}` : ""}</p>
                        </div>
                    </div>
                    <span class="proposta-status status-${statusClasse}">${this.escapeHtml(statusLabel)}</span>
                </div>

                <div class="proposta-conteudo">
                    <h4>${this.escapeHtml(proposta.titulo || "Oportunidade sem título")}</h4>
                    <p class="proposta-descricao">${this.escapeHtml(proposta.descricao || "Descrição não informada.")}</p>

                    ${proposta.objetivo ? `
                        <div class="proposta-requisitos">
                            <h5>Objetivo da oportunidade</h5>
                            <p>${this.escapeHtml(proposta.objetivo)}</p>
                        </div>
                    ` : ""}

                    <div class="proposta-detalhes">
                        <div class="proposta-detalhe"><strong>Posições:</strong> ${this.escapeHtml(proposta.posicoesProcuradas || "Não informadas")}</div>
                        <div class="proposta-detalhe"><strong>Idade:</strong> ${this.escapeHtml(idade)}</div>
                        <div class="proposta-detalhe"><strong>Local:</strong> ${this.escapeHtml(proposta.localRealizacao || "Não informado")}</div>
                        ${prazo ? `<div class="proposta-detalhe"><strong>Prazo:</strong> ${this.escapeHtml(prazo)}</div>` : ""}
                        ${avaliacao ? `<div class="proposta-detalhe"><strong>Avaliação:</strong> ${this.escapeHtml(avaliacao)}</div>` : ""}
                    </div>

                    ${proposta.requisitos ? `
                        <div class="proposta-requisitos">
                            <h5>Requisitos</h5>
                            <p>${this.escapeHtml(proposta.requisitos)}</p>
                        </div>
                    ` : ""}

                    <p class="proposta-data">Convite recebido ${this.escapeHtml(dataEnvio || "em data não informada")}</p>
                </div>

                ${podeResponder ? `
                    <div class="proposta-acoes">
                        <button type="button" class="btn-aceitar" onclick="oportunidadesAtleta.abrirConfirmacao(${Number(proposta.inscricaoId)}, 'ACEITA')">Aceitar convite</button>
                        <button type="button" class="btn-recusar" onclick="oportunidadesAtleta.abrirConfirmacao(${Number(proposta.inscricaoId)}, 'RECUSADA')">Recusar convite</button>
                    </div>
                ` : `
                    <div class="proposta-resposta ${statusClasse}">
                        ${
                            status === "ACEITA"
                                ? "Você aceitou este convite."
                                : status === "RECUSADA"
                                    ? "Você recusou este convite."
                                    : "Esta oportunidade não está mais disponível para resposta."
                        }
                    </div>
                `}
            </article>
        `;
    },

    abrirConfirmacao(inscricaoId, resposta) {
        const proposta = this.propostas.find((item) =>
            Number(item.inscricaoId) === Number(inscricaoId)
        );

        if (!proposta || proposta.statusResposta !== "PENDENTE") {
            this.mostrarToast("Esta proposta já foi respondida ou não está disponível.", "erro");
            return;
        }

        this.propostaSelecionada = proposta;
        this.respostaSelecionada = resposta;

        const modal = document.getElementById("modalProposta");
        const icone = document.getElementById("modalIcone");
        const titulo = document.getElementById("modalTitulo");
        const mensagem = document.getElementById("modalMensagem");
        const confirmar = document.getElementById("btnConfirmarModal");

        const aceitar = resposta === "ACEITA";

        if (icone) icone.textContent = aceitar ? "✓" : "×";
        if (titulo) titulo.textContent = aceitar ? "Aceitar convite?" : "Recusar convite?";
        if (mensagem) {
            mensagem.textContent = aceitar
                ? `Confirma que deseja aceitar a oportunidade "${proposta.titulo}" do ${proposta.nomeClube}?`
                : `Confirma que deseja recusar a oportunidade "${proposta.titulo}" do ${proposta.nomeClube}?`;
        }
        if (confirmar) {
            confirmar.textContent = aceitar ? "Aceitar convite" : "Recusar convite";
            confirmar.disabled = false;
        }

        if (modal) modal.hidden = false;
        document.body.style.overflow = "hidden";
    },

    fecharModal() {
        const modal = document.getElementById("modalProposta");
        if (modal) modal.hidden = true;

        document.body.style.overflow = "";
        this.propostaSelecionada = null;
        this.respostaSelecionada = null;
    },

    async confirmarResposta() {
        if (this.enviandoResposta || !this.propostaSelecionada || !this.respostaSelecionada) return;

        const confirmar = document.getElementById("btnConfirmarModal");
        const inscricaoId = this.propostaSelecionada.inscricaoId;
        const resposta = this.respostaSelecionada;

        this.enviandoResposta = true;

        if (confirmar) {
            confirmar.disabled = true;
            confirmar.textContent = "Enviando...";
        }

        const params = new URLSearchParams();
        params.set("acao", "responderProposta");
        params.set("inscricaoId", String(inscricaoId));
        params.set("resposta", resposta);

        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                },
                body: params.toString()
            });

            if (resp.status === 401) {
                window.location.href = "login.html";
                return;
            }

            const dados = await this.lerResposta(resp);

            if (!resp.ok || dados.sucesso === false) {
                throw new Error(dados.mensagem || "Não foi possível responder à proposta.");
            }

            this.fecharModal();
            this.mostrarToast(dados.mensagem || "Resposta enviada.", "sucesso");
            await this.carregarPropostas();
        } catch (erro) {
            console.error("Erro ao responder proposta:", erro);
            this.mostrarToast(erro.message || "Erro ao enviar resposta.", "erro");
        } finally {
            this.enviandoResposta = false;
            if (confirmar) {
                confirmar.disabled = false;
                confirmar.textContent = resposta === "ACEITA" ? "Aceitar convite" : "Recusar convite";
            }
        }
    },

    exibirCarregando() {
        const carregando = document.getElementById("propostasCarregando");
        const erro = document.getElementById("propostasErro");
        const vazio = document.getElementById("propostasVazias");
        const lista = document.getElementById("listaPropostas");

        if (carregando) carregando.hidden = false;
        if (erro) erro.hidden = true;
        if (vazio) vazio.hidden = true;
        if (lista) {
            lista.innerHTML = "";
            lista.hidden = true;
        }
    },

    exibirErro(mensagem) {
        const carregando = document.getElementById("propostasCarregando");
        const erro = document.getElementById("propostasErro");
        const vazio = document.getElementById("propostasVazias");
        const lista = document.getElementById("listaPropostas");
        const mensagemErro = document.getElementById("mensagemErroPropostas");

        if (carregando) carregando.hidden = true;
        if (erro) erro.hidden = false;
        if (vazio) vazio.hidden = true;
        if (lista) {
            lista.innerHTML = "";
            lista.hidden = true;
        }
        if (mensagemErro) mensagemErro.textContent = mensagem || "Verifique sua conexão e tente novamente.";
    },

    mostrarToast(mensagem, tipo = "sucesso") {
        const toast = document.getElementById("toast");
        if (!toast) {
            alert(mensagem);
            return;
        }

        toast.textContent = mensagem;
        toast.dataset.tipo = tipo;
        toast.hidden = false;

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 4000);
    },

    formatarFaixaEtaria(min, max) {
        if (min != null && max != null) return `${min} a ${max} anos`;
        if (min != null) return `A partir de ${min} anos`;
        if (max != null) return `Até ${max} anos`;
        return "Não especificada";
    },

    formatarData(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return data.toLocaleDateString("pt-BR");
    },

    formatarDataHora(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return data.toLocaleString("pt-BR");
    },

    iniciais(nome) {
        const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return "CF";
        return partes.slice(0, 2).map((parte) => parte[0].toUpperCase()).join("");
    },

    async lerResposta(resposta) {
        const texto = await resposta.text();
        if (!texto) return {};

        try {
            return JSON.parse(texto);
        } catch {
            return {
                mensagem: /^\s*</.test(texto)
                    ? `O servidor retornou HTTP ${resposta.status}. Verifique a implantação da API.`
                    : texto
            };
        }
    },

    escapeHtml(texto) {
        if (texto === null || texto === undefined) return "";
        return String(texto)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    oportunidadesAtleta.iniciar();
});