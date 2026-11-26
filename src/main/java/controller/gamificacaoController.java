package controller;

import dao.gamificacaoDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.*;

@WebServlet("/api/gamificacao")
public class gamificacaoController extends HttpServlet {

    private final gamificacaoDAO dao = new gamificacaoDAO();

    private void responder(
            HttpServletResponse response,
            int status,
            Object dados
    ) throws IOException {

        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(toJson(dados));
    }

    private String toJson(Object objeto) {

        if (objeto == null) return "null";

        if (objeto instanceof String) {
            return "\"" + escapar((String) objeto) + "\"";
        }

        if (objeto instanceof Number || objeto instanceof Boolean) {
            return String.valueOf(objeto);
        }

        if (objeto instanceof Map) {

            StringBuilder json = new StringBuilder("{");
            Map<?, ?> mapa = (Map<?, ?>) objeto;
            boolean primeiro = true;

            for (Map.Entry<?, ?> entrada : mapa.entrySet()) {
                if (!primeiro) json.append(",");
                primeiro = false;

                json.append(toJson(String.valueOf(entrada.getKey())))
                    .append(":")
                    .append(toJson(entrada.getValue()));
            }

            return json.append("}").toString();
        }

        if (objeto instanceof Iterable) {

            StringBuilder json = new StringBuilder("[");
            boolean primeiro = true;

            for (Object item : (Iterable<?>) objeto) {
                if (!primeiro) json.append(",");
                primeiro = false;
                json.append(toJson(item));
            }

            return json.append("]").toString();
        }

        return toJson(String.valueOf(objeto));
    }

    private String escapar(String texto) {

        return texto
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String obterEmail(HttpServletRequest request) {

        HttpSession sessao = request.getSession(false);

        if (sessao == null) return null;

        Object email = sessao.getAttribute("email");

        return email == null ? null : email.toString();
    }

    private boolean atletaAutenticado(HttpServletRequest request) {

        HttpSession sessao = request.getSession(false);

        if (sessao == null) return false;

        Object tipo = sessao.getAttribute("tipoUsuario");

        return tipo != null && tipo.toString().equalsIgnoreCase("atleta");
    }

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws ServletException, IOException {

        String email = obterEmail(request);

        if (email == null || !atletaAutenticado(request)) {
            responder(response, 401, Collections.singletonMap(
                    "mensagem", "Sessão de atleta inválida."
            ));
            return;
        }

        try {

            String acao = request.getParameter("acao");

            if ("ranking".equalsIgnoreCase(acao)) {
                responder(response, 200, dao.buscarRanking());
                return;
            }

            responder(response, 200, dao.buscarDashboard(email));

        } catch (Exception e) {

            e.printStackTrace();

            responder(response, 500, Collections.singletonMap(
                    "mensagem", "Erro ao carregar gamificação."
            ));
        }
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String email = obterEmail(request);

        if (email == null || !atletaAutenticado(request)) {
            responder(response, 401, Collections.singletonMap(
                    "mensagem", "Sessão de atleta inválida."
            ));
            return;
        }

        String acao = request.getParameter("acao");
        String eventoId = request.getParameter("eventoId");

        if (!"registrar".equalsIgnoreCase(acao)) {
            responder(response, 400, Collections.singletonMap(
                    "mensagem", "Ação inválida."
            ));
            return;
        }

        String tipo = request.getParameter("tipo");

        if (tipo == null || eventoId == null
                || tipo.trim().isEmpty()
                || eventoId.trim().isEmpty()) {

            responder(response, 400, Collections.singletonMap(
                    "mensagem", "Tipo de ação e identificador do evento são obrigatórios."
            ));
            return;
        }

        tipo = tipo.toUpperCase(Locale.ROOT);

        List<String> tiposPermitidos = Arrays.asList(
                "VIDEO",
                "FOTO",
                "COMENTARIO"
        );

        if (!tiposPermitidos.contains(tipo)) {
            responder(response, 400, Collections.singletonMap(
                    "mensagem", "Tipo de ação não permitido."
            ));
            return;
        }

        try {

            responder(response, 200, dao.registrarEvento(
                    email,
                    tipo,
                    eventoId
            ));

        } catch (Exception e) {

            e.printStackTrace();

            responder(response, 500, Collections.singletonMap(
                    "mensagem", "Erro ao registrar progresso."
            ));
        }
    }
}