const contextoProjeto = "/" + window.location.pathname.split("/").filter(Boolean)[0];
const API_GAMIFICACAO = contextoProjeto + "/api/gamificacao";

const gamificacao = {
    dashboard: null,

    async carregar() {
        try {
            const resposta = await fetch(API_GAMIFICACAO, {
                method: "GET",
                credentials: "include"
            });

            if (!resposta.ok) {
                if (resposta.status === 401) {
                    throw new Error("Faça login como atleta para acessar a gamificação.");
                }
                throw new Error("Não foi possível carregar a gamificação.");
            }

            this.dashboard = await resposta.json();

            if (!this.dashboard.sucesso) {
                throw new Error(this.dashboard.mensagem || "Erro ao carregar dados.");
            }

            this.renderizarDashboard();
            await this.carregarRanking();

        } catch (erro) {
            console.error(erro);
            this.mostrarMensagem(erro.message, true);
        }
    },

    renderizarDashboard() {
        const dados = this.dashboard;

        const nivel = document.getElementById("nivelAtletaGamificacao");
        const xpTotal = document.getElementById("XPAtletaGamificacao");
        const barra = document.getElementById("barraXP");
        const xpFalta = document.getElementById("XPFalta");
        const proximoNivel = document.getElementById("proximoNivel");
        const nomeAtleta = document.getElementById("nomeAtleta");
        const perfilAtleta = document.getElementById("perfilAtleta");

        if (nivel) nivel.textContent = dados.nivel ?? 1;
        if (xpTotal) xpTotal.textContent = `${dados.xpTotal ?? 0} XP`;
        if (barra) barra.style.width = `${dados.porcentagem ?? 0}%`;
        if (xpFalta) xpFalta.textContent = dados.xpRestante ?? 0;
        if (proximoNivel) proximoNivel.textContent = dados.nivelProximo ?? ((dados.nivel ?? 1) + 1);

        if (nomeAtleta && dados.nome) {
            const textoNome = Array.from(nomeAtleta.childNodes).find(no => no.nodeType === Node.TEXT_NODE);
            if (textoNome) textoNome.textContent = dados.nome;
        }

        if (perfilAtleta) {
            if (dados.fotoPerfil) {
                perfilAtleta.innerHTML = `<img src="${this.escaparHTML(dados.fotoPerfil)}" alt="Foto do atleta">`;
            } else if (dados.nome) {
                perfilAtleta.textContent = dados.nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(nome => nome[0])
                    .join("")
                    .toUpperCase();
            }
        }

        this.renderizarDesafios(dados.desafios || []);
    },

    renderizarDesafios(desafios) {
        const container = document.getElementById("listaDesafios");
        if (!container) return;

        container.innerHTML = "";

        if (!desafios.length) {
            container.innerHTML = `<p class="vazio">Nenhum desafio disponível no momento.</p>`;
            return;
        }

        desafios.forEach(desafio => {
            const card = document.createElement("article");
            card.className = "desafio-card";

            const concluido = desafio.concluido;
            const porcentagem = Math.min(100, Math.max(0, desafio.porcentagem || 0));

            card.innerHTML = `
                <div class="desafio-topo">
                    <span class="desafio-frequencia">${this.formatarFrequencia(desafio.frequencia)}</span>
                    <span class="desafio-xp">+${desafio.xp || 0} XP</span>
                </div>
                <h3>${this.escaparHTML(desafio.titulo)}</h3>
                <p>${this.escaparHTML(desafio.descricao)}</p>
                <div class="desafio-progresso-texto">
                    <span>Progresso</span>
                    <span>${desafio.progresso || 0}/${desafio.objetivo || 0}</span>
                </div>
                <div class="barra-progresso">
                    <div class="barra-progresso-preenchida" style="width:${porcentagem}%"></div>
                </div>
                <div class="desafio-rodape">
                    <span>${porcentagem}% concluído</span>
                    ${concluido
                        ? `<span class="status-concluido">Concluído</span>`
                        : `<button type="button" class="btn-teste" data-tipo="${this.escaparHTML(desafio.tipoAcao || "")}">Testar ação</button>`
                    }
                </div>
            `;

            const botao = card.querySelector(".btn-teste");

            if (botao) {
                botao.addEventListener("click", async () => {
                    await this.registrarEvento(desafio.tipoAcao);
                });
            }

            container.appendChild(card);
        });
    },

    formatarFrequencia(frequencia) {
        const formatos = {
            DIARIO: "Desafio diário",
            SEMANAL: "Desafio semanal",
            PERMANENTE: "Desafio permanente"
        };

        return formatos[frequencia] || frequencia || "Desafio";
    },

    escaparHTML(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[caractere]));
    },

    async registrarEvento(tipo, eventoId = crypto.randomUUID()) {
        try {
            const parametros = new URLSearchParams({
                acao: "registrar",
                tipo: tipo,
                eventoId: eventoId
            });

            const resposta = await fetch(`${API_GAMIFICACAO}?${parametros}`, {
                method: "POST",
                credentials: "include"
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(dados.mensagem || "Não foi possível registrar a ação.");
            }

            this.mostrarMensagem(dados.mensagem);
            await this.carregar();

            return dados;

        } catch (erro) {
            console.error(erro);
            this.mostrarMensagem(erro.message, true);
            return null;
        }
    },

    async carregarRanking() {
        const container = document.getElementById("rankingBody");
        if (!container) return;

        try {
            const resposta = await fetch(`${API_GAMIFICACAO}?acao=ranking`, {
                credentials: "include"
            });

            if (!resposta.ok) {
                throw new Error("Erro ao carregar ranking.");
            }

            const ranking = await resposta.json();
            container.innerHTML = "";

            if (!Array.isArray(ranking) || ranking.length === 0) {
                container.innerHTML = `<tr><td colspan="8">Ranking ainda sem atletas.</td></tr>`;
                return;
            }

            ranking.forEach(atleta => {
                const linha = document.createElement("tr");

                const nome = atleta.nome || "Atleta";
                const iniciais = nome.split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(palavra => palavra[0])
                    .join("")
                    .toUpperCase();

                linha.innerHTML = `
                    <td>${atleta.posicao ?? "-"}</td>
                    <td>
                        <div class="ranking-atleta">
                            <span class="ranking-avatar">
                                ${atleta.fotoPerfil
                                    ? `<img src="${this.escaparHTML(atleta.fotoPerfil)}" alt="">`
                                    : this.escaparHTML(iniciais)
                                }
                            </span>
                            <span>${this.escaparHTML(nome)}</span>
                        </div>
                    </td>
                    <td>${this.escaparHTML(atleta.categoria || "-")}</td>
                    <td>${this.escaparHTML(atleta.posicaoAtleta || atleta.posicaoPrincipal || "-")}</td>
                    <td>${atleta.xp ?? 0} XP</td>
                    <td>${atleta.nivel ?? 1}</td>
                    <td>${this.escaparHTML(atleta.desempenho || "-")}</td>
                    <td>${atleta.engajamento ?? 0}</td>
                `;

                container.appendChild(linha);
            });

        } catch (erro) {
            console.error(erro);
            container.innerHTML = `<tr><td colspan="8">Não foi possível carregar o ranking.</td></tr>`;
        }
    },

    mostrarMensagem(texto, erro = false) {
        const mensagem = document.getElementById("mensagemGamificacao");
        if (!mensagem) return;

        mensagem.textContent = texto;
        mensagem.className = erro ? "mensagem erro" : "mensagem sucesso";

        setTimeout(() => {
            mensagem.textContent = "";
            mensagem.className = "";
        }, 4000);
    }
};

window.ClubFlowGamificacao = {
    registrarVideo(eventoId) {
        return gamificacao.registrarEvento("VIDEO", eventoId);
    },

    registrarFoto(eventoId) {
        return gamificacao.registrarEvento("FOTO", eventoId);
    },

    registrarComentario(eventoId) {
        return gamificacao.registrarEvento("COMENTARIO", eventoId);
    },

    registrarEvento(tipo, eventoId) {
        return gamificacao.registrarEvento(tipo, eventoId);
    },

    atualizar() {
        return gamificacao.carregar();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    gamificacao.carregar();
});