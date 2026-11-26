package controller;

import dao.gamificacaoDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.lang.reflect.Array;
import java.util.*;

import java.util.Collection;

@WebServlet("/api/gamificacao")
public class gamificacaoController extends HttpServlet {

    private final gamificacaoDAO dao = new gamificacaoDAO();

    private void responder(
            HttpServletResponse response,
            int status,
            Object dados
    ) throws IOException {

        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");

        response.getWriter().write(toJson(dados));
    }

    private String toJson(Object objeto) {

        if (objeto == null) {
            return "null";
        }

        if (objeto instanceof String || objeto instanceof Character) {
            return "\"" + escapar(String.valueOf(objeto)) + "\"";
        }

        if (objeto instanceof Number || objeto instanceof Boolean) {
            return String.valueOf(objeto);
        }

        if (objeto instanceof Enum<?>) {
            return toJson(((Enum<?>) objeto).name());
        }

        if (objeto instanceof Map<?, ?>) {

            StringBuilder json = new StringBuilder("{");
            Map<?, ?> mapa = (Map<?, ?>) objeto;
            boolean primeiro = true;

            for (Map.Entry<?, ?> entrada : mapa.entrySet()) {

                if (!primeiro) {
                    json.append(",");
                }

                primeiro = false;

                json.append(toJson(String.valueOf(entrada.getKey())))
                    .append(":")
                    .append(toJson(entrada.getValue()));
            }

            return json.append("}").toString();
        }

        if (objeto instanceof Iterable<?>) {

            StringBuilder json = new StringBuilder("[");
            boolean primeiro = true;

            for (Object item : (Iterable<?>) objeto) {

                if (!primeiro) {
                    json.append(",");
                }

                primeiro = false;
                json.append(toJson(item));
            }

            return json.append("]").toString();
        }

        if (objeto.getClass().isArray()) {

            StringBuilder json = new StringBuilder("[");
            int tamanho = Array.getLength(objeto);

            for (int i = 0; i < tamanho; i++) {

                if (i > 0) {
                    json.append(",");
                }

                json.append(toJson(Array.get(objeto, i)));
            }

            return json.append("]").toString();
        }

        return toJson(String.valueOf(objeto));
    }

    private String escapar(String texto) {

        StringBuilder resultado = new StringBuilder();

        for (int i = 0; i < texto.length(); i++) {

            char caractere = texto.charAt(i);

            switch (caractere) {

                case '"':
                    resultado.append("\\\"");
                    break;

                case '\\':
                    resultado.append("\\\\");
                    break;

                case '\b':
                    resultado.append("\\b");
                    break;

                case '\f':
                    resultado.append("\\f");
                    break;

                case '\n':
                    resultado.append("\\n");
                    break;

                case '\r':
                    resultado.append("\\r");
                    break;

                case '\t':
                    resultado.append("\\t");
                    break;

                default:

                    if (caractere < 0x20) {

                        resultado.append(String.format(
                                "\\u%04x",
                                (int) caractere
                        ));

                    } else {

                        resultado.append(caractere);
                    }

                    break;
            }
        }

        return resultado.toString();
    }

    private String obterEmail(HttpServletRequest request) {

        HttpSession sessao = request.getSession(false);

        if (sessao == null) {
            return null;
        }

        Object email = sessao.getAttribute("email");

        return email == null ? null : email.toString();
    }

    private boolean atletaAutenticado(HttpServletRequest request) {

        HttpSession sessao = request.getSession(false);

        if (sessao == null) {
            return false;
        }

        Object tipo = sessao.getAttribute("tipoUsuario");

        return tipo != null
                && tipo.toString().equalsIgnoreCase("atleta");
    }

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws ServletException, IOException {

        String email = obterEmail(request);

        if (email == null || !atletaAutenticado(request)) {

            responder(
                    response,
                    401,
                    Collections.singletonMap(
                            "mensagem",
                            "Sessão de atleta inválida."
                    )
            );

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

            if (!response.isCommitted()) {

                responder(
                        response,
                        500,
                        Collections.singletonMap(
                                "mensagem",
                                "Erro ao carregar gamificação."
                        )
                );
            }
        }
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws ServletException, IOException {

        responder(
                response,
                405,
                Collections.singletonMap(
                        "mensagem",
                        "O progresso dos desafios é contabilizado automaticamente ao realizar ações na plataforma."
                )
        );
    }
}