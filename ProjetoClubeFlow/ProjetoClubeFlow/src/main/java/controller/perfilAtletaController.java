
package controller;

import com.google.gson.Gson;
import dao.perfilAtletaDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;

@WebServlet("/perfilAtleta")
public class perfilAtletaController extends HttpServlet {

    private final perfilAtletaDAO dao = new perfilAtletaDAO();
    private final Gson gson = new Gson();

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null
                || session.getAttribute("email") == null
                || !"atleta".equals(session.getAttribute("tipoUsuario"))) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(
                    "{\"mensagem\":\"Sessão de atleta não encontrada.\"}");
            return;
        }

        try {
            String email = session.getAttribute("email").toString();

            Map<String, Object> dados = dao.buscarPorEmail(email);

            if (dados == null) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.getWriter().write(
                        "{\"mensagem\":\"Atleta não encontrado.\"}");
                return;
            }

            response.getWriter().write(gson.toJson(dados));

        } catch (SQLException e) {
            getServletContext().log("Erro ao buscar perfil.", e);
            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(
                    "{\"mensagem\":\"Erro ao carregar perfil.\"}");
        }
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null
                || session.getAttribute("email") == null
                || !"atleta".equals(session.getAttribute("tipoUsuario"))) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(
                    "{\"mensagem\":\"Faça login como atleta.\"}");
            return;
        }

        String emailOriginal = session.getAttribute("email").toString();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> dados = gson.fromJson(
                    request.getReader(), Map.class);

            if (dados == null) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(
                        "{\"mensagem\":\"Dados inválidos.\"}");
                return;
            }

            String nome = valor(dados, "nome");
            String emailNovo = valor(dados, "email");

            if (nome.isBlank() || emailNovo.isBlank()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(
                        "{\"mensagem\":\"Nome e e-mail são obrigatórios.\"}");
                return;
            }

            boolean atualizado = dao.atualizar(emailOriginal, dados);

            if (atualizado) {
                session.setAttribute("email", emailNovo);

                response.getWriter().write(
                        "{\"sucesso\":true,"
                        + "\"mensagem\":\"Perfil atualizado com sucesso!\"}");
            } else {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.getWriter().write(
                        "{\"mensagem\":\"Atleta não encontrado.\"}");
            }

        } catch (SQLException e) {
            getServletContext().log("Erro ao atualizar perfil.", e);

            response.setStatus(HttpServletResponse.SC_CONFLICT);
            response.getWriter().write(
                    "{\"mensagem\":\"Não foi possível atualizar os dados. "
                    + "Verifique se o CPF ou e-mail já está cadastrado.\"}");

        } catch (RuntimeException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write(
                    "{\"mensagem\":\"Dados enviados inválidos.\"}");
        }
    }

    private String valor(Map<String, Object> dados, String chave) {
        Object valor = dados.get(chave);
        return valor == null ? "" : valor.toString().trim();
    }
}
