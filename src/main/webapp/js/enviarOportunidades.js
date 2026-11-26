
const API_URL = "../api/oportunidades";

const enviarOportunidades = {
    atletas: [],
    atletaSelecionado: null,
    buscaAtual: "",
    enviando: false,

    iniciar() {
        this.configurarEventos();
        this.carregarAtletas();
    },

    configurarEventos() {
        const btnBuscar = document.getElementById("btnBuscarAtleta");
        const campoBusca = document.getElementById("campoBuscaAtleta");
        const btnLimpar = document.getElementById("btnLimparFiltros");
        const btnTentarNovamente = document.getElementById("btnTentarNovamente");
        const modal = document.getElementById("modalOportunidade");
        const btnFechar = document.getElementById("btnFecharModal");
        const btnCancelar = document.getElementById("btnCancelarOportunidade");
        const form = document.getElementById("formOportunidade");

        if (btnBuscar) {
            btnBuscar.addEventListener("click", () => {
                this.buscarAtletas();
            });
        }

        if (campoBusca) {
            campoBusca.addEventListener("keydown", (evento) => {
                if (evento.key === "Enter") {
                    evento.preventDefault();
                    this.buscarAtletas();
                }
            });
        }

        const filtros = [
            "filtroPosicao",
            "filtroCategoria",
            "filtroEstado",
            "filtroCidade"
        ];

        filtros.forEach((id) => {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.addEventListener("change", () => {
                    this.aplicarFiltros();
                });

                if (id === "filtroCidade") {
                    elemento.addEventListener("input", () => {
                        this.aplicarFiltros();
                    });
                }
            }
        });

        if (btnLimpar) {
            btnLimpar.addEventListener("click", () => {
                this.limparFiltros();
            });
        }

        if (btnTentarNovamente) {
            btnTentarNovamente.addEventListener("click", () => {
                this.carregarAtletas();
            });
        }

        if (btnFechar) {
            btnFechar.addEventListener("click", () => {
                this.fecharModal();
            });
        }

        if (btnCancelar) {
            btnCancelar.addEventListener("click", () => {
                this.fecharModal();
            });
        }

        if (modal) {
            modal.addEventListener("click", (evento) => {
                if (evento.target === modal) {
                    this.fecharModal();
                }
            });
        }

        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && modal && !modal.hidden) {
                this.fecharModal();
            }
        });

        if (form) {
            form.addEventListener("submit", (evento) => {
                evento.preventDefault();
                this.enviarProposta();
            });
        }
    },

    async carregarAtletas() {
        this.exibirCarregando();

        const campoBusca = document.getElementById("campoBuscaAtleta");
        const busca = campoBusca ? campoBusca.value.trim() : "";

        this.buscaAtual = busca;

        const params = new URLSearchParams({
            acao: "buscarAtletas",
            busca: busca
        });

        try {
            const resposta = await fetch(`${API_URL}?${params.toString()}`);

            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            const dados = await this.lerResposta(resposta);

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Erro ao buscar atletas."
                );
            }

            if (!Array.isArray(dados)) {
                throw new Error("Formato de resposta inválido.");
            }

            this.atletas = dados;
            this.aplicarFiltros();

        } catch (erro) {
            console.error("Erro ao carregar atletas:", erro);
            this.exibirErro();
        }
    },

    buscarAtletas() {
        this.carregarAtletas();
    },

    aplicarFiltros() {
        const posicao = this.valorCampo("filtroPosicao").toLowerCase();
        const categoria = this.valorCampo("filtroCategoria").toLowerCase();
        const estado = this.valorCampo("filtroEstado").toLowerCase();
        const cidade = this.valorCampo("filtroCidade").toLowerCase();

        const atletasFiltrados = this.atletas.filter((atleta) => {
            const posicaoAtleta = String(
                atleta.posicaoPrincipal || atleta.posicao || ""
            ).toLowerCase();

            const categoriaAtleta = String(
                atleta.categoria || atleta.nivel || ""
            ).toLowerCase();

            const estadoAtleta = String(
                atleta.estado || ""
            ).toLowerCase();

            const cidadeAtleta = String(
                atleta.cidade || ""
            ).toLowerCase();

            const correspondePosicao =
                !posicao || posicaoAtleta.includes(posicao);

            const correspondeCategoria =
                !categoria || categoriaAtleta.includes(categoria);

            const correspondeEstado =
                !estado || estadoAtleta === estado;

            const correspondeCidade =
                !cidade || cidadeAtleta.includes(cidade);

            return correspondePosicao &&
                correspondeCategoria &&
                correspondeEstado &&
                correspondeCidade;
        });

        this.renderizarAtletas(atletasFiltrados);
    },

    valorCampo(id) {
        const elemento = document.getElementById(id);
        return elemento ? elemento.value.trim() : "";
    },

    limparFiltros() {
        const ids = [
            "campoBuscaAtleta",
            "filtroPosicao",
            "filtroCategoria",
            "filtroEstado",
            "filtroCidade"
        ];

        ids.forEach((id) => {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.value = "";
            }
        });

        this.carregarAtletas();
    },

    renderizarAtletas(atletas) {
        const container = document.getElementById("listaAtletas");
        const quantidade = document.getElementById("quantidadeAtletas");
        const textoQuantidade = document.getElementById("textoQuantidadeAtletas");

        const carregando = document.getElementById("atletasCarregando");
        const vazio = document.getElementById("atletasVazios");
        const erro = document.getElementById("atletasErro");

        if (!container) return;

        if (carregando) carregando.hidden = true;
        if (erro) erro.hidden = true;

        container.innerHTML = "";

        if (quantidade) {
            quantidade.textContent = `${atletas.length} ${
                atletas.length === 1 ? "atleta" : "atletas"
            }`;
        }

        if (textoQuantidade) {
            textoQuantidade.textContent =
                `${atletas.length} atletas encontrados na plataforma`;
        }

        if (atletas.length === 0) {
            if (vazio) vazio.hidden = false;
            return;
        }

        if (vazio) vazio.hidden = true;

        container.innerHTML = atletas
            .map((atleta) => this.renderizarCard(atleta))
            .join("");
    },

    renderizarCard(atleta) {
        const id = atleta.id;
        const nome = atleta.nome || "Atleta sem nome";

        const posicao = atleta.posicaoPrincipal ||
            atleta.posicao ||
            "Posição não informada";

        const categoria = atleta.categoria ||
            atleta.nivelAtual ||
            "Categoria não informada";

        const cidade = atleta.cidade || "Cidade não informada";
        const estado = atleta.estado || "";

        const idade = atleta.idade ??
            this.calcularIdade(atleta.dataNascimento || atleta.data_nascimento);

        const altura = atleta.altura
            ? `${atleta.altura} m`
            : "Não informada";

        const foto = atleta.fotoPerfil ||
            atleta.foto ||
            atleta.imagem ||
            "";

        const fotoHTML = foto
            ? `<img src="${this.escapeHtml(foto)}"
                    alt="Foto de ${this.escapeHtml(nome)}"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <span class="material-symbols-outlined" style="display:none">person</span>`
            : `<span class="material-symbols-outlined">person</span>`;

        return `
            <article class="athlete-card">

                <div class="athlete-card-header">

                    <div class="athlete-photo">
                        ${fotoHTML}
                    </div>

                    <div class="athlete-name-container">
                        <h3>${this.escapeHtml(nome)}</h3>
                        <p>${this.escapeHtml(categoria)}</p>
                    </div>

                </div>

                <div class="athlete-card-body">

                    <span class="athlete-position">
                        ${this.escapeHtml(posicao)}
                    </span>

                    <div class="athlete-info-row">
                        <span class="material-symbols-outlined">location_on</span>
                        <span>
                            ${this.escapeHtml(cidade)}
                            ${estado ? ` - ${this.escapeHtml(estado)}` : ""}
                        </span>
                    </div>

                    <div class="athlete-info-row">
                        <span class="material-symbols-outlined">cake</span>
                        <span>
                            ${idade !== null && idade !== undefined
                                ? `${this.escapeHtml(idade)} anos`
                                : "Idade não informada"}
                        </span>
                    </div>

                    <div class="athlete-info-row">
                        <span class="material-symbols-outlined">height</span>
                        <span>Altura: ${this.escapeHtml(altura)}</span>
                    </div>

                </div>

                <div class="athlete-card-footer">

                    <button
                        type="button"
                        class="btn-perfil-atleta"
                        onclick="enviarOportunidades.verPerfil(${Number(id)})"
                    >
                        <span class="material-symbols-outlined">person</span>
                        Perfil
                    </button>

                    <button
                        type="button"
                        class="btn-propor-oportunidade"
                        onclick="enviarOportunidades.abrirModal(${Number(id)})"
                    >
                        <span class="material-symbols-outlined">send</span>
                        Enviar convite
                    </button>

                </div>

            </article>
        `;
    },

    calcularIdade(dataNascimento) {
        if (!dataNascimento) return null;

        const data = new Date(`${dataNascimento}T00:00:00`);

        if (isNaN(data.getTime())) return null;

        const hoje = new Date();

        let idade = hoje.getFullYear() - data.getFullYear();

        const mes = hoje.getMonth() - data.getMonth();

        if (
            mes < 0 ||
            (mes === 0 && hoje.getDate() < data.getDate())
        ) {
            idade--;
        }

        return idade;
    },

    verPerfil(atletaId) {
        window.location.href =
            `perfil-atleta-clube.html?id=${encodeURIComponent(atletaId)}`;
    },

    abrirModal(atletaId) {
        const atleta = this.atletas.find(
            (item) => Number(item.id) === Number(atletaId)
        );

        if (!atleta) {
            this.mostrarToast("Atleta não encontrado.", "erro");
            return;
        }

        this.atletaSelecionado = atleta;

        const modal = document.getElementById("modalOportunidade");
        const nomeAtleta = document.getElementById("nomeAtletaSelecionado");
        const idAtleta = document.getElementById("idAtletaSelecionado");
        const form = document.getElementById("formOportunidade");

        if (nomeAtleta) {
            nomeAtleta.textContent = atleta.nome || "Atleta";
        }

        if (idAtleta) {
            idAtleta.value = atleta.id;
        }

        if (form) {
            form.reset();

            if (idAtleta) {
                idAtleta.value = atleta.id;
            }
        }

        if (modal) {
            modal.hidden = false;
            document.body.style.overflow = "hidden";
        }
    },

    fecharModal() {
        const modal = document.getElementById("modalOportunidade");
        const form = document.getElementById("formOportunidade");

        if (modal) modal.hidden = true;

        document.body.style.overflow = "";

        if (form) form.reset();

        this.atletaSelecionado = null;
    },

    async enviarProposta() {
        if (this.enviando) return;

        const form = document.getElementById("formOportunidade");
        const btnEnviar = document.getElementById("btnEnviarOportunidade");

        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            return;
        }

        const atletaId = document.getElementById("idAtletaSelecionado").value;

        const titulo = this.valorCampo("tituloOportunidade");
        const descricao = this.valorCampo("descricaoOportunidade");
        const objetivo = this.valorCampo("objetivoOportunidade");
        const posicoes = this.valorCampo("posicoesOportunidade");
        const idadeMinima = this.valorCampo("idadeMinima");
        const idadeMaxima = this.valorCampo("idadeMaxima");
        const local = this.valorCampo("localOportunidade");
        const prazo = this.valorCampo("prazoInscricao");
        const dataAvaliacao = this.valorCampo("dataAvaliacao");
        const requisitos = this.valorCampo("requisitosOportunidade");

        if (idadeMinima && idadeMaxima && Number(idadeMinima) > Number(idadeMaxima)) {
            this.mostrarToast(
                "A idade mínima não pode ser maior que a idade máxima.",
                "erro"
            );
            return;
        }

        const params = new URLSearchParams();

        params.set("acao", "enviarProposta");
        params.set("atletaDestinatarioId", atletaId);
        params.set("titulo", titulo);
        params.set("descricao", descricao);
        params.set("objetivo", objetivo);
        params.set("posicoesProcuradas", posicoes);
        params.set("idadeMinima", idadeMinima);
        params.set("idadeMaxima", idadeMaxima);
        params.set("localRealizacao", local);
        params.set("prazoInscricao", prazo);
        params.set("dataHoraAvaliacao", dataAvaliacao);
        params.set("requisitos", requisitos);

        this.enviando = true;

        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = `
                <span class="material-symbols-outlined">hourglass_top</span>
                Enviando...
            `;
        }

        try {
            const resposta = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                },
                body: params.toString()
            });

            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            const dados = await this.lerResposta(resposta);

            if (!resposta.ok || dados.sucesso === false) {
                throw new Error(
                    dados.mensagem || "Não foi possível enviar o convite."
                );
            }

            this.fecharModal();

            this.mostrarToast(
                dados.mensagem || "Convite enviado com sucesso!",
                "sucesso"
            );

        } catch (erro) {
            console.error("Erro ao enviar proposta:", erro);

            this.mostrarToast(
                erro.message || "Erro ao enviar convite.",
                "erro"
            );

        } finally {
            this.enviando = false;

            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = `
                    <span class="material-symbols-outlined">send</span>
                    Enviar convite
                `;
            }
        }
    },

    exibirCarregando() {
        const carregando = document.getElementById("atletasCarregando");
        const vazio = document.getElementById("atletasVazios");
        const erro = document.getElementById("atletasErro");
        const container = document.getElementById("listaAtletas");

        if (carregando) carregando.hidden = false;
        if (vazio) vazio.hidden = true;
        if (erro) erro.hidden = true;
        if (container) container.innerHTML = "";
    },

    exibirErro() {
        const carregando = document.getElementById("atletasCarregando");
        const vazio = document.getElementById("atletasVazios");
        const erro = document.getElementById("atletasErro");
        const container = document.getElementById("listaAtletas");

        if (carregando) carregando.hidden = true;
        if (vazio) vazio.hidden = true;
        if (erro) erro.hidden = false;
        if (container) container.innerHTML = "";
    },

    mostrarToast(mensagem, tipo = "sucesso") {
        const toast = document.getElementById("toast");
        const texto = document.getElementById("toastMensagem");
        const icone = document.getElementById("toastIcone");

        if (!toast || !texto) {
            alert(mensagem);
            return;
        }

        texto.textContent = mensagem;

        if (icone) {
            icone.textContent = tipo === "erro"
                ? "error"
                : "check_circle";
        }

        toast.hidden = false;

        toast.dataset.tipo = tipo;

        clearTimeout(this.toastTimer);

        this.toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 4000);
    },

    async lerResposta(resposta) {
        const texto = await resposta.text();

        if (!texto) return {};

        try {
            return JSON.parse(texto);
        } catch {
            return {
                mensagem: texto
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
    enviarOportunidades.iniciar();
});
