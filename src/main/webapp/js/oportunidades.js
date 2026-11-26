const API_URL = "../api/oportunidades";

const ROTULO_STATUS = {
  ABERTA: "Aberta",
  INSCRICAO_REALIZADA: "Inscrição realizada",
  EM_ANALISE: "Em análise",
  CONVOCADO: "Convocado",
  NAO_SELECIONADO: "Não selecionado",
  ENCERRADA: "Encerrada",
  INDISPONIVEL: "Encerrada"
};

document.addEventListener("DOMContentLoaded", () => {
  const btnFiltrar = document.getElementById("btnFiltrar");
  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", () => {
      carregarOportunidades();
    });
  }

  carregarOportunidades();
  carregarHistoricoInscricoes();
});

async function carregarOportunidades() {
  const container = document.getElementById("listaOportunidades");
  container.innerHTML = "<p>Carregando oportunidades...</p>";

  const params = new URLSearchParams({ acao: "listar" });
  const posicao = document.getElementById("filtroPosicao").value.trim();
  const idade = document.getElementById("filtroIdade").value.trim();
  const local = document.getElementById("filtroLocal").value.trim();
  const compativeis = document.getElementById("filtroCompativeis").checked;

  if (posicao) params.set("posicao", posicao);
  if (idade) params.set("idade", idade);
  if (local) params.set("local", local);
  params.set("compativeis", String(compativeis));

  try {
    const resp = await fetch(`${API_URL}?${params.toString()}`);
    if (resp.status === 401) {
      window.location.href = "login.html";
      return;
    }

    const dados = await resp.json();
    if (!resp.ok) {
      container.innerHTML = `<p>${dados.mensagem || "Erro ao carregar oportunidades."}</p>`;
      return;
    }

    if (!Array.isArray(dados) || dados.length === 0) {
      container.innerHTML = "<p>Nenhuma oportunidade encontrada com os critérios selecionados.</p>";
      return;
    }

    container.innerHTML = dados.map((op) => renderCardOportunidade(op)).join("");
  } catch (err) {
    container.innerHTML = "<p>Falha de comunicação com o servidor.</p>";
  }
}

function renderCardOportunidade(op) {
  const statusLabel = ROTULO_STATUS[op.statusCandidaturaAtleta] || ROTULO_STATUS[op.statusOportunidade] || "Aberta";
  const compBadge = op.compativelPerfil
    ? `<span class="badge-status badge-compativel">Compatível com seu perfil</span>`
    : "";

  return `
    <article class="card-oportunidade">
      <div>
        <span class="badge-status">${statusLabel}</span>
        ${compBadge}
      </div>
      <h3>${escapeHtml(op.titulo)}</h3>
      <p><strong>Clube:</strong> ${escapeHtml(op.nomeClube || "")}</p>
      <p><strong>Posições:</strong> ${escapeHtml(op.posicoesProcuradas)}</p>
      <p><strong>Faixa etária:</strong> ${op.idadeMinima} a ${op.idadeMaxima} anos</p>
      <p><strong>Local:</strong> ${escapeHtml(op.localRealizacao)}</p>
      <p><strong>Prazo de inscrição:</strong> ${escapeHtml(op.prazoInscricao || "")}</p>
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <button type="button" onclick="verDetalhes(${op.id})">Ver detalhes</button>
        <button type="button" onclick="inscrever(${op.id})">Candidatar-se</button>
      </div>
    </article>
  `;
}

async function verDetalhes(oportunidadeId) {
  const painel = document.getElementById("detalheOportunidade");
  painel.innerHTML = "<p>Carregando detalhes...</p>";

  try {
    const resp = await fetch(`${API_URL}?acao=detalhe&id=${encodeURIComponent(oportunidadeId)}`);
    if (resp.status === 401) {
      window.location.href = "login.html";
      return;
    }

    const op = await resp.json();
    if (!resp.ok) {
      painel.innerHTML = `<p>${op.mensagem || "Não foi possível carregar os detalhes."}</p>`;
      return;
    }

    const statusLabel = ROTULO_STATUS[op.statusCandidaturaAtleta] || ROTULO_STATUS[op.statusOportunidade] || "Aberta";

    painel.innerHTML = `
      <h3>${escapeHtml(op.titulo)}</h3>
      <p><strong>Status atual:</strong> ${escapeHtml(statusLabel)}</p>
      <p><strong>Clube responsável:</strong> ${escapeHtml(op.nomeClube || "")}</p>
      <p><strong>Informações do clube:</strong> ${escapeHtml(op.informacoesClube || "Não informado")}</p>
      <p><strong>Descrição:</strong> ${escapeHtml(op.descricao)}</p>
      <p><strong>Objetivo:</strong> ${escapeHtml(op.objetivo)}</p>
      <p><strong>Posições procuradas:</strong> ${escapeHtml(op.posicoesProcuradas)}</p>
      <p><strong>Faixa etária permitida:</strong> ${op.idadeMinima} a ${op.idadeMaxima} anos</p>
      <p><strong>Local de realização:</strong> ${escapeHtml(op.localRealizacao)}</p>
      <p><strong>Data de publicação:</strong> ${escapeHtml(op.dataPublicacao || "")}</p>
      <p><strong>Prazo para inscrição:</strong> ${escapeHtml(op.prazoInscricao || "")}</p>
      <p><strong>Data e horário da avaliação:</strong> ${escapeHtml(op.dataHoraAvaliacao || "A definir pelo clube")}</p>
      <p><strong>Requisitos:</strong> ${escapeHtml(op.requisitos)}</p>
      <button type="button" onclick="inscrever(${op.id})">Realizar Inscrição</button>
    `;
  } catch (err) {
    painel.innerHTML = "<p>Erro ao buscar detalhes da oportunidade.</p>";
  }
}

async function inscrever(oportunidadeId) {
  try {
    const params = new URLSearchParams({ oportunidadeId: String(oportunidadeId) });
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString()
    });

    if (resp.status === 401) {
      window.location.href = "login.html";
      return;
    }

    const resJson = await resp.json();
    alert(resJson.mensagem || "Operação concluída.");

    if (resp.ok) {
      carregarOportunidades();
      carregarHistoricoInscricoes();
      verDetalhes(oportunidadeId);
    }
  } catch (err) {
    alert("Erro ao enviar inscrição.");
  }
}

async function carregarHistoricoInscricoes() {
  const container = document.getElementById("historicoInscricoes");
  try {
    const resp = await fetch(`${API_URL}?acao=inscricoes`);
    if (resp.status === 401) {
      return;
    }

    const itens = await resp.json();
    if (!Array.isArray(itens) || itens.length === 0) {
      container.innerHTML = "<p>Você ainda não realizou inscrições em oportunidades.</p>";
      return;
    }

    container.innerHTML = itens.map((item) => {
      const statusCand = ROTULO_STATUS[item.statusCandidatura] || item.statusCandidatura;
      const statusOp = ROTULO_STATUS[item.statusOportunidade] || item.statusOportunidade;
      return `
        <div class="card-oportunidade">
          <strong>${escapeHtml(item.tituloOportunidade)}</strong> — ${escapeHtml(item.nomeClube || "")}
          <p><strong>Situação da candidatura:</strong> <span class="badge-status">${escapeHtml(statusCand)}</span></p>
          <p><strong>Situação da oportunidade:</strong> ${escapeHtml(statusOp)}</p>
          ${item.observacaoClube ? `<p><strong>Observação do clube:</strong> ${escapeHtml(item.observacaoClube)}</p>` : ""}
        </div>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = "<p>Não foi possível carregar o histórico de inscrições.</p>";
  }
}

function escapeHtml(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


