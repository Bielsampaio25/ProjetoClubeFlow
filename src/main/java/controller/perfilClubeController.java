package controller;

import dao.clubeDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;

@WebServlet("/perfilClube")
public class perfilClubeController extends HttpServlet {

    private final clubeDAO clubeDAO = new clubeDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"erro\":\"Sessão não encontrada.\"}");
            return;
        }

        String email = (String) session.getAttribute("email");
        String tipoUsuario = (String) session.getAttribute("tipoUsuario");

        if (email == null || tipoUsuario == null
                || !tipoUsuario.equalsIgnoreCase("clube")) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"erro\":\"Acesso restrito a clubes.\"}");
            return;
        }

        try {
            Map<String, Object> clube = clubeDAO.buscarDadosClubePorEmail(email);

            if (clube.isEmpty()) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.getWriter().write("{\"erro\":\"Clube não encontrado.\"}");
                return;
            }

            response.getWriter().write(gerarJSON(clube));

        } catch (SQLException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("{\"erro\":\"Erro ao buscar dados do clube.\"}");
            e.printStackTrace();
        }
    }

    private String gerarJSON(Map<String, Object> dados) {

        StringBuilder json = new StringBuilder("{");
        boolean primeiro = true;

        for (Map.Entry<String, Object> entrada : dados.entrySet()) {

            if (!primeiro) {
                json.append(",");
            }

            primeiro = false;

            json.append("\"")
                    .append(entrada.getKey())
                    .append("\":\"")
                    .append(escaparJSON(String.valueOf(entrada.getValue())))
                    .append("\"");
        }

        json.append("}");

        return json.toString();
    }

    private String escaparJSON(String texto) {
        return texto.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
