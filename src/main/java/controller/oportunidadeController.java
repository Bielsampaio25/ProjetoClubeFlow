package controller;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSerializer;
import dao.atletaDAO;
import dao.clubeDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import models.inscricaoModel;
import models.oportunidadeModel;
import service.oportunidadeService;
import service.inscricaoService;

@WebServlet(name = "oportunidadeController", urlPatterns = {"/api/oportunidades"})
public class oportunidadeController extends HttpServlet {

    private final oportunidadeService oportunidadeService = new oportunidadeService();
    private final inscricaoService inscricaoService = new inscricaoService();
    private final atletaDAO atletaDAO = new atletaDAO();
    private final clubeDAO clubeDAO = new clubeDAO();

    private final Gson gson = new GsonBuilder()
            .registerTypeAdapter(LocalDate.class,
                    (JsonSerializer<LocalDate>) (src, typeOfSrc, context)
                    -> context.serialize(src.toString()))
            .registerTypeAdapter(LocalDateTime.class,
                    (JsonSerializer<LocalDateTime>) (src, typeOfSrc, context)
                    -> context.serialize(src.toString()))
            .create();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        resp.setContentType("application/json;charset=UTF-8");
        String acao = parametro(req, "acao", "listar");

        try {
            // Busca usada pela tela do clube. Não redireciona para login.
            if ("buscarAtletas".equalsIgnoreCase(acao)) {
                List<Map<String, Object>> atletas =
                        oportunidadeService.listarAtletasParaClube(req.getParameter("busca"));
                escreverJson(resp, atletas);
                return;
            }

            Long atletaId = obterAtletaId(req.getSession(false));
            if (atletaId == null) {
                resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                escreverJson(resp, erro("Atleta não identificado para esta operação."));
                return;
            }

            switch (acao.toLowerCase()) {
                case "propostasrecebidas" -> {
                    List<Map<String, Object>> propostas =
                            inscricaoService.listarPropostasRecebidas(atletaId);
                    escreverJson(resp, propostas);
                }
                case "listar" -> {
                    String posicao = req.getParameter("posicao");
                    Integer idade = parseInt(req.getParameter("idade"));
                    String local = req.getParameter("local");
                    boolean apenasCompativeis = "true".equalsIgnoreCase(req.getParameter("compativeis"));

                    List<oportunidadeModel> lista = oportunidadeService.listarOportunidadesParaAtleta(
                            atletaId, posicao, idade, local, apenasCompativeis);
                    escreverJson(resp, lista);
                }
                case "detalhe" -> {
                    Long oportunidadeId = parseLong(req.getParameter("id"));
                    if (oportunidadeId == null) {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        escreverJson(resp, erro("ID da oportunidade inválido."));
                        return;
                    }

                    oportunidadeModel detalhe = oportunidadeService.detalharOportunidade(
                            oportunidadeId, atletaId);
                    if (detalhe == null) {
                        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        escreverJson(resp, erro("Oportunidade não encontrada ou indisponível."));
                        return;
                    }
                    escreverJson(resp, detalhe);
                }
                case "inscricoes" -> {
                    List<inscricaoModel> historico =
                            oportunidadeService.listarHistoricoInscricoes(atletaId);
                    escreverJson(resp, historico);
                }
                default -> {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    escreverJson(resp, erro("Ação inválida."));
                }
            }
        } catch (SQLException ex) {
            getServletContext().log("Erro GET api/oportunidades", ex);
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            escreverJson(resp, erro("Erro ao consultar oportunidades no banco de dados."));
        } catch (IllegalArgumentException ex) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro(ex.getMessage()));
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json;charset=UTF-8");
        String acao = parametro(req, "acao", "inscrever");

        try {
            if ("responderProposta".equalsIgnoreCase(acao)) {
                Long atletaId = obterAtletaId(req.getSession(false));
                if (atletaId == null) {
                    resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    escreverJson(resp, erro("Atleta não identificado para responder à proposta."));
                    return;
                }

                Long inscricaoId = parseLong(req.getParameter("inscricaoId"));
                String resposta = parametro(req, "resposta", "").toUpperCase();

                if (inscricaoId == null || inscricaoId <= 0) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    escreverJson(resp, erro("Proposta inválida."));
                    return;
                }

                if (!"ACEITA".equals(resposta) && !"RECUSADA".equals(resposta)) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    escreverJson(resp, erro("Resposta inválida. Escolha aceitar ou recusar."));
                    return;
                }

                boolean atualizado = "ACEITA".equals(resposta)
                        ? inscricaoService.aceitarProposta(inscricaoId, atletaId)
                        : inscricaoService.recusarProposta(inscricaoId, atletaId);

                if (!atualizado) {
                    resp.setStatus(HttpServletResponse.SC_CONFLICT);
                    escreverJson(resp, erro("Esta proposta não está mais pendente ou não pertence à sua conta."));
                    return;
                }

                Map<String, Object> respostaJson = new HashMap<>();
                respostaJson.put("sucesso", true);
                respostaJson.put("statusResposta", resposta);
                respostaJson.put("mensagem", "Proposta " + ("ACEITA".equals(resposta) ? "aceita" : "recusada") + " com sucesso.");
                escreverJson(resp, respostaJson);
                return;
            }

            if ("enviarProposta".equalsIgnoreCase(acao)) {
                Long clubeId = obterClubeId(req.getSession(false));
                if (clubeId == null) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    escreverJson(resp, erro("Não foi possível identificar o clube da sessão. Entre novamente na conta do clube."));
                    return;
                }

                Long atletaDestinatarioId = parseLong(req.getParameter("atletaDestinatarioId"));
                if (atletaDestinatarioId == null || atletaDestinatarioId <= 0) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    escreverJson(resp, erro("Selecione um atleta válido."));
                    return;
                }

                oportunidadeModel oportunidade = montarOportunidade(req, clubeId);
                oportunidadeService.enviarPropostaParaAtleta(oportunidade, atletaDestinatarioId);

                Map<String, Object> resposta = new HashMap<>();
                resposta.put("sucesso", true);
                resposta.put("mensagem", "Convite enviado com sucesso!");
                resposta.put("oportunidadeId", oportunidade.getId());
                resposta.put("atletaDestinatarioId", atletaDestinatarioId);
                resp.setStatus(HttpServletResponse.SC_CREATED);
                escreverJson(resp, resposta);
                return;
            }

            // Inscrição aberta feita pelo atleta
            Long atletaId = obterAtletaId(req.getSession(false));
            if (atletaId == null) {
                resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                escreverJson(resp, erro("Atleta não identificado para realizar inscrição."));
                return;
            }

            Long oportunidadeId = parseLong(req.getParameter("oportunidadeId"));
            if (oportunidadeId == null || oportunidadeId <= 0) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                escreverJson(resp, erro("Oportunidade não informada."));
                return;
            }

            oportunidadeService.inscreverEmOportunidade(oportunidadeId, atletaId);
            Map<String, Object> resposta = new HashMap<>();
            resposta.put("sucesso", true);
            resposta.put("statusCandidatura", "INSCRICAO_REALIZADA");
            resposta.put("mensagem", "Inscrição realizada com sucesso.");
            escreverJson(resp, resposta);

        } catch (IllegalStateException ex) {
            resp.setStatus(HttpServletResponse.SC_CONFLICT);
            escreverJson(resp, erro(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro(ex.getMessage()));
        } catch (SQLException ex) {
            getServletContext().log("Erro POST api/oportunidades", ex);
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            escreverJson(resp, erro("Erro ao salvar a operação no banco de dados."));
        }
    }

    private oportunidadeModel montarOportunidade(HttpServletRequest req, Long clubeId) {
        oportunidadeModel op = new oportunidadeModel();
        op.setClubeId(clubeId);
        op.setTitulo(req.getParameter("titulo"));
        op.setDescricao(req.getParameter("descricao"));
        op.setObjetivo(req.getParameter("objetivo"));
        op.setPosicoesProcuradas(req.getParameter("posicoesProcuradas"));
        op.setIdadeMinima(parseInt(req.getParameter("idadeMinima")));
        op.setIdadeMaxima(parseInt(req.getParameter("idadeMaxima")));
        op.setLocalRealizacao(req.getParameter("localRealizacao"));
        op.setPrazoInscricao(parseLocalDate(req.getParameter("prazoInscricao")));
        op.setDataHoraAvaliacao(parseLocalDateTime(req.getParameter("dataHoraAvaliacao")));
        op.setRequisitos(req.getParameter("requisitos"));
        op.setDataPublicacao(LocalDateTime.now());
        op.setStatusOportunidade("ABERTA");
        return op;
    }

    private Long obterAtletaId(HttpSession session) throws SQLException {
        if (session == null) return null;
        Long id = converterId(session.getAttribute("atletaId"));
        if (id == null) id = converterId(session.getAttribute("usuarioId"));
        if (id != null && id > 0) return id;

        Object tipo = session.getAttribute("tipoUsuario");
        Object email = session.getAttribute("email");
        if (tipo != null && "atleta".equalsIgnoreCase(tipo.toString())
                && email != null && !email.toString().isBlank()) {
            int idEncontrado = atletaDAO.buscarIdPorEmail(email.toString());
            return idEncontrado > 0 ? (long) idEncontrado : null;
        }
        return null;
    }

    private Long obterClubeId(HttpSession session) throws SQLException {
        if (session == null) return null;
        Long id = converterId(session.getAttribute("clubeId"));
        if (id == null) id = converterId(session.getAttribute("clubeUsuarioId"));
        if (id != null && id > 0) return id;

        Object email = session.getAttribute("email");
        if (email == null || email.toString().isBlank()) return null;
        return clubeDAO.buscarIdPorEmail(email.toString());
    }

    private Long converterId(Object valor) {
        if (valor instanceof Long l) return l;
        if (valor instanceof Integer i) return i.longValue();
        if (valor instanceof String s) return parseLong(s);
        return null;
    }

    private String parametro(HttpServletRequest req, String nome, String padrao) {
        String valor = req.getParameter(nome);
        return valor == null || valor.isBlank() ? padrao : valor.trim();
    }

    private Long parseLong(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return Long.valueOf(valor.trim()); }
        catch (NumberFormatException ex) { return null; }
    }

    private Integer parseInt(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return Integer.valueOf(valor.trim()); }
        catch (NumberFormatException ex) { return null; }
    }

    private LocalDate parseLocalDate(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return LocalDate.parse(valor.trim()); }
        catch (RuntimeException ex) { throw new IllegalArgumentException("Data de prazo inválida."); }
    }

    private LocalDateTime parseLocalDateTime(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return LocalDateTime.parse(valor.trim()); }
        catch (RuntimeException ex) { throw new IllegalArgumentException("Data/hora de avaliação inválida."); }
    }

    private Map<String, Object> erro(String mensagem) {
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("sucesso", false);
        resposta.put("mensagem", mensagem == null ? "Erro na operação." : mensagem);
        return resposta;
    }

    private void escreverJson(HttpServletResponse resp, Object payload) throws IOException {
        try (PrintWriter out = resp.getWriter()) {
            out.print(gson.toJson(payload));
            out.flush();
        }
    }
}
