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
            document.getElementById("mensagemGamificacao").textContent = erro.message;
        }
    },

    renderizarDashboard() {
        const dados = this.dashboard;

        document.getElementById("nomeAtleta").textContent = dados.nome || "Atleta";
        document.getElementById("nivelAtleta").textContent = dados.nivel;
        document.getElementById("xpTotal").textContent = dados.xpTotal;
        document.getElementById("xpAtual").textContent = dados.xpNivel;
        document.getElementById("xpNecessario").textContent = dados.xpProximoNivel;
        document.getElementById("xpRestante").textContent = dados.xpRestante;
        document.getElementById("desafiosConcluidos").textContent = dados.desafiosConcluidos;

        const barra = document.getElementById("barraXP");
        barra.style.width = dados.porcentagem + "%";

        document.getElementById("porcentagemXP").textContent = dados.porcentagem + "%";

        const foto = document.getElementById("fotoAtleta");

        if (dados.fotoPerfil) {
            foto.src = dados.fotoPerfil;
        }

        this.renderizarDesafios(dados.desafios || []);
    },

    renderizarDesafios(desafios) {
        const container = document.getElementById("listaDesafios");
        container.innerHTML = "";

        if (desafios.length === 0) {
            container.innerHTML = `<p class="vazio">Nenhum desafio disponível no momento.</p>`;
            return;
        }

        desafios.forEach(desafio => {
            const card = document.createElement("article");
            card.className = "desafio-card";

            const concluido = desafio.concluido;
            const porcentagem = desafio.porcentagem;

            card.innerHTML = `
                <div class="desafio-topo">
                    <span class="desafio-frequencia">${this.formatarFrequencia(desafio.frequencia)}</span>
                    <span class="desafio-xp">+${desafio.xp} XP</span>
                </div>

                <h3>${this.escaparHTML(desafio.titulo)}</h3>
                <p>${this.escaparHTML(desafio.descricao)}</p>

                <div class="desafio-progresso-texto">
                    <span>Progresso</span>
                    <span>${desafio.progresso}/${desafio.objetivo}</span>
                </div>

                <div class="barra-progresso">
                    <div class="barra-progresso-preenchida" style="width:${porcentagem}%"></div>
                </div>

                <div class="desafio-rodape">
                    <span>${porcentagem}% concluído</span>
                    ${concluido
                        ? `<span class="status-concluido">Concluído</span>`
                        : `<button class="btn-teste" data-tipo="${desafio.tipoAcao}">
                                Testar ação
                           </button>`
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

        return formatos[frequencia] || frequencia;
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
        const container = document.getElementById("listaRanking");

        try {
            const resposta = await fetch(`${API_GAMIFICACAO}?acao=ranking`, {
                credentials: "include"
            });

            if (!resposta.ok) throw new Error("Erro ao carregar ranking.");

            const ranking = await resposta.json();

            container.innerHTML = "";

            if (ranking.length === 0) {
                container.innerHTML = `<p class="vazio">Ranking ainda sem atletas.</p>`;
                return;
            }

            ranking.forEach(atleta => {
                const item = document.createElement("div");
                item.className = "ranking-item";

                item.innerHTML = `
                    <span class="ranking-posicao">${atleta.posicao}</span>
                    <div class="ranking-avatar">
                        ${atleta.fotoPerfil
                            ? `<img src="${this.escaparHTML(atleta.fotoPerfil)}" alt="">`
                            : `<span>${this.escaparHTML(atleta.nome.charAt(0))}</span>`
                        }
                    </div>
                    <div class="ranking-info">
                        <strong>${this.escaparHTML(atleta.nome)}</strong>
                        <small>Nível ${atleta.nivel}</small>
                    </div>
                    <span class="ranking-xp">${atleta.xp} XP</span>
                `;

                container.appendChild(item);
            });

        } catch (erro) {
            console.error(erro);
            container.innerHTML = `<p class="vazio">Não foi possível carregar o ranking.</p>`;
        }
    },

    mostrarMensagem(texto, erro = false) {
        const mensagem = document.getElementById("mensagemGamificacao");

        mensagem.textContent = texto;
        mensagem.className = erro ? "mensagem erro" : "mensagem sucesso";

        setTimeout(() => {
            mensagem.textContent = "";
            mensagem.className = "mensagem";
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

