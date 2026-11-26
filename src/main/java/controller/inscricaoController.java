package controller;

import com.google.gson.Gson;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import service.inscricaoService;

@WebServlet(name = "inscricaoController", urlPatterns = {"/api/propostas"})
public class inscricaoController extends HttpServlet {

    private final inscricaoService inscricaoService =
            new inscricaoService();

    private final Gson gson = new Gson();

    // ==========================================
    // GET - LISTAR PROPOSTAS RECEBIDAS
    // ==========================================

    @Override
    protected void doGet(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {

        resp.setContentType("application/json;charset=UTF-8");

        HttpSession session = req.getSession(false);

        Long atletaId = extrairAtletaIdAutenticado(session);

        if (atletaId == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            escreverJson(resp, erro("Acesso restrito a atletas autenticados."));
            return;
        }

        String acao = req.getParameter("acao");

        if (acao == null || acao.isBlank()) {
            acao = "recebidas";
        }

        if (!"recebidas".equalsIgnoreCase(acao)) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro("Ação inválida."));
            return;
        }

        try {

            List<Map<String, Object>> propostas =
                    inscricaoService.listarPropostasRecebidas(atletaId);

            escreverJson(resp, propostas);

        } catch (SQLException ex) {

            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            escreverJson(
                    resp,
                    erro("Erro ao consultar propostas recebidas.")
            );
        }
    }

    // ==========================================
    // POST - ACEITAR OU RECUSAR PROPOSTA
    // ==========================================

    @Override
    protected void doPost(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {

        resp.setContentType("application/json;charset=UTF-8");

        HttpSession session = req.getSession(false);

        Long atletaId = extrairAtletaIdAutenticado(session);

        if (atletaId == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            escreverJson(resp, erro("Acesso restrito a atletas autenticados."));
            return;
        }

        String acao = req.getParameter("acao");

        Long inscricaoId = parseLong(req.getParameter("inscricaoId"));

        if (acao == null || acao.isBlank()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro("Ação não informada."));
            return;
        }

        if (inscricaoId == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro("Identificador da proposta inválido."));
            return;
        }

        try {

            boolean atualizado;

            switch (acao.toLowerCase()) {

                case "aceitar" -> {

                    atualizado = inscricaoService.aceitarProposta(
                            inscricaoId,
                            atletaId
                    );

                    if (!atualizado) {
                        resp.setStatus(HttpServletResponse.SC_CONFLICT);

                        escreverJson(
                                resp,
                                erro("A proposta não está mais disponível para aceite.")
                        );
                        return;
                    }

                    Map<String, Object> resposta = new HashMap<>();

                    resposta.put("sucesso", true);
                    resposta.put("statusRespostaProposta", "ACEITA");
                    resposta.put("mensagem", "Proposta aceita com sucesso.");

                    escreverJson(resp, resposta);
                }

                case "recusar" -> {

                    atualizado = inscricaoService.recusarProposta(
                            inscricaoId,
                            atletaId
                    );

                    if (!atualizado) {
                        resp.setStatus(HttpServletResponse.SC_CONFLICT);

                        escreverJson(
                                resp,
                                erro("A proposta não está mais disponível para resposta.")
                        );
                        return;
                    }

                    Map<String, Object> resposta = new HashMap<>();

                    resposta.put("sucesso", true);
                    resposta.put("statusRespostaProposta", "RECUSADA");
                    resposta.put("mensagem", "Proposta recusada.");

                    escreverJson(resp, resposta);
                }

                default -> {

                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);

                    escreverJson(
                            resp,
                            erro("Ação inválida. Utilize aceitar ou recusar.")
                    );
                }
            }

        } catch (IllegalArgumentException ex) {

            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro(ex.getMessage()));

        } catch (SQLException ex) {

            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            escreverJson(
                    resp,
                    erro("Erro ao atualizar a resposta da proposta.")
            );
        }
    }

    // ==========================================
    // AUTENTICAÇÃO
    // ==========================================

    private Long extrairAtletaIdAutenticado(HttpSession session) {

        if (session == null) {
            return null;
        }

        Object tipoUsuarioObj = session.getAttribute("tipoUsuario");

        if (tipoUsuarioObj == null
                || !"ATLETA".equalsIgnoreCase(
                        tipoUsuarioObj.toString()
                )) {

            return null;
        }

        Object idObj = session.getAttribute("atletaId");

        if (idObj == null) {
            idObj = session.getAttribute("usuarioId");
        }

        if (idObj instanceof Long l) {
            return l;
        }

        if (idObj instanceof Integer i) {
            return i.longValue();
        }

        if (idObj instanceof String s) {
            return parseLong(s);
        }

        return null;
    }

    // ==========================================
    // CONVERSÃO
    // ==========================================

    private Long parseLong(String valor) {

        if (valor == null || valor.isBlank()) {
            return null;
        }

        try {
            return Long.valueOf(valor.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // ==========================================
    // JSON
    // ==========================================

    private Map<String, Object> erro(String mensagem) {

        Map<String, Object> map = new HashMap<>();

        map.put("sucesso", false);
        map.put("mensagem", mensagem);

        return map;
    }

    private void escreverJson(
            HttpServletResponse resp,
            Object payload
    ) throws IOException {

        try (PrintWriter out = resp.getWriter()) {
            out.print(gson.toJson(payload));
            out.flush();
        }
    }
}
