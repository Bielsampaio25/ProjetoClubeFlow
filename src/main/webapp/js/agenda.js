document.addEventListener("DOMContentLoaded", carregarEventos);

    async function carregarEventos() {
        const lista = document.getElementById("listaEventos");

        try {
            const resposta = await fetch("../eventos");

            if (resposta.status === 401) {
                lista.innerHTML = `
                    <tr>
                        <td colspan="5">Sessão expirada. Faça login novamente.</td>
                    </tr>
                `;
                return;
            }

            if (!resposta.ok) {
                throw new Error("Erro ao buscar eventos.");
            }

            const eventos = await resposta.json();

            if (eventos.length === 0) {
                lista.innerHTML = `
                    <tr>
                        <td colspan="5">Nenhum evento encontrado na sua região.</td>
                    </tr>
                `;
                return;
            }

            lista.innerHTML = eventos.map(evento => `
                <tr>
                    <td>${formatarData(evento.dataInicio)}</td>
                    <td>${evento.nome ?? "Evento sem nome"}</td>
                    <td>${evento.estado ?? "-"}</td>
                    <td>${evento.cidade ?? "-"}</td>
                    <td>${evento.endereco ?? "-"}</td>
                </tr>
            `).join("");

        } catch (erro) {
            console.error("Erro ao carregar eventos:", erro);

            lista.innerHTML = `
                <tr>
                    <td colspan="5">Não foi possível carregar os eventos.</td>
                </tr>
            `;
        }
    }

    function formatarData(data) {
        if (!data) return "-";

        const dataEvento = new Date(data);

        if (isNaN(dataEvento.getTime())) return data;

        return dataEvento.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short"
        }).toUpperCase();
    }

