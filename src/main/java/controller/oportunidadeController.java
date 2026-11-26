package controller;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSerializer;
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

@WebServlet(name = "oportunidadeController", urlPatterns = {"/api/oportunidades"})
public class oportunidadeController extends HttpServlet {

    private final oportunidadeService oportunidadeService =
            new oportunidadeService();

    private final Gson gson = new GsonBuilder()
            .registerTypeAdapter(
                    LocalDate.class,
                    (JsonSerializer<LocalDate>) (src, typeOfSrc, context)
                    -> context.serialize(src.toString())
            )
            .registerTypeAdapter(
                    LocalDateTime.class,
                    (JsonSerializer<LocalDateTime>) (src, typeOfSrc, context)
                    -> context.serialize(src.toString())
            )
            .create();

    // ==========================================
    // GET
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
            acao = "listar";
        }

        try {

            switch (acao) {

                // LISTAR OPORTUNIDADES
                case "listar" -> {

                    String posicao = req.getParameter("posicao");
                    Integer idade = parseInt(req.getParameter("idade"));
                    String local = req.getParameter("local");

                    boolean apenasCompativeis =
                            "true".equalsIgnoreCase(
                                    req.getParameter("compativeis")
                            );

                    List<oportunidadeModel> lista =
                            oportunidadeService.listarOportunidadesParaAtleta(
                                    atletaId,
                                    posicao,
                                    idade,
                                    local,
                                    apenasCompativeis
                            );

                    escreverJson(resp, lista);
                }

                // DETALHAR OPORTUNIDADE
                case "detalhe" -> {

                    Long oportunidadeId =
                            parseLong(req.getParameter("id"));

                    if (oportunidadeId == null) {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        escreverJson(resp, erro("ID da oportunidade inválido."));
                        return;
                    }

                    oportunidadeModel detalhe =
                            oportunidadeService.detalharOportunidade(
                                    oportunidadeId,
                                    atletaId
                            );

                    if (detalhe == null) {
                        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        escreverJson(
                                resp,
                                erro("Oportunidade não encontrada ou indisponível.")
                        );
                        return;
                    }

                    escreverJson(resp, detalhe);
                }

                // HISTÓRICO DE INSCRIÇÕES
                case "inscricoes" -> {

                    List<inscricaoModel> historico =
                            oportunidadeService.listarHistoricoInscricoes(
                                    atletaId
                            );

                    escreverJson(resp, historico);
                }

                default -> {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    escreverJson(resp, erro("Ação inválida."));
                }
            }

        } catch (SQLException ex) {

            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            escreverJson(
                    resp,
                    erro("Erro ao consultar oportunidades no banco de dados.")
            );
        }
    }

    // ==========================================
    // POST - REALIZAR INSCRIÇÃO
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

        Long oportunidadeId =
                parseLong(req.getParameter("oportunidadeId"));

        if (oportunidadeId == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            escreverJson(resp, erro("Oportunidade não informada."));
            return;
        }

        try {

            oportunidadeService.inscreverEmOportunidade(
                    oportunidadeId,
                    atletaId
            );

            Map<String, Object> resposta = new HashMap<>();

            resposta.put("sucesso", true);
            resposta.put("statusCandidatura", "INSCRICAO_REALIZADA");
            resposta.put("mensagem", "Inscrição realizada com sucesso.");

            escreverJson(resp, resposta);

        } catch (IllegalStateException ex) {

            resp.setStatus(HttpServletResponse.SC_CONFLICT);
            escreverJson(resp, erro(ex.getMessage()));

        } catch (SQLException ex) {

            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            escreverJson(
                    resp,
                    erro("Erro ao registrar inscrição no banco de dados.")
            );
        }
    }

    // ==========================================
    // AUTENTICAÇÃO DO ATLETA
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
    // CONVERSÕES
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

    private Integer parseInt(String valor) {

        if (valor == null || valor.isBlank()) {
            return null;
        }

        try {
            return Integer.valueOf(valor.trim());
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
