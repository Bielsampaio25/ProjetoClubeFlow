
package controller;

import com.google.gson.Gson;
import dao.perfilAtletaDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Part;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.Map;

@WebServlet("/perfilAtleta")
@MultipartConfig(
    maxFileSize = 5 * 1024 * 1024,
    maxRequestSize = 6 * 1024 * 1024
)
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

        if (!sessaoAtletaValida(session)) {
            enviarErro(response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Sessão de atleta não encontrada.");
            return;
        }

        try {
            String email = session.getAttribute("email").toString();

            Map<String, Object> dados = dao.buscarPorEmail(email);

            if (dados == null) {
                enviarErro(response,
                        HttpServletResponse.SC_NOT_FOUND,
                        "Atleta não encontrado.");
                return;
            }

            response.getWriter().write(gson.toJson(dados));

        } catch (SQLException e) {
            getServletContext().log(
                    "Erro ao buscar perfil do atleta.", e);

            enviarErro(response,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Erro ao consultar o perfil no banco de dados.");
        }
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (!sessaoAtletaValida(session)) {
            enviarErro(response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Faça login como atleta.");
            return;
        }

        String emailOriginal =
                session.getAttribute("email").toString();

        try {
            Part parteDados = request.getPart("dados");

            if (parteDados == null) {
                enviarErro(response,
                        HttpServletResponse.SC_BAD_REQUEST,
                        "Os dados do formulário não foram recebidos.");
                return;
            }

            String json;

            try (InputStream entrada = parteDados.getInputStream()) {
                json = new String(
                        entrada.readAllBytes(),
                        StandardCharsets.UTF_8);
            }

            Map<String, Object> dados = gson.fromJson(json, Map.class);

            if (dados == null) {
                enviarErro(response,
                        HttpServletResponse.SC_BAD_REQUEST,
                        "Os dados enviados estão vazios.");
                return;
            }

            String nome = valor(dados, "nome");
            String emailNovo = valor(dados, "email");

            System.out.println(
                    "===== DADOS RECEBIDOS PELO CONTROLLER =====");
            System.out.println("E-mail da sessão: [" + emailOriginal + "]");
            System.out.println("Nome recebido: [" + nome + "]");
            System.out.println("E-mail recebido: [" + emailNovo + "]");
            System.out.println("============================================");

            if (nome.isBlank() || emailNovo.isBlank()) {
                enviarErro(response,
                        HttpServletResponse.SC_BAD_REQUEST,
                        "Nome e e-mail são obrigatórios.");
                return;
            }

            Part parteFoto = request.getPart("foto");

            if (parteFoto != null && parteFoto.getSize() > 0) {
                String tipo = parteFoto.getContentType();

                if (tipo == null
                        || !(tipo.equalsIgnoreCase("image/png")
                        || tipo.equalsIgnoreCase("image/jpeg"))) {

                    enviarErro(response,
                            HttpServletResponse.SC_BAD_REQUEST,
                            "A foto deve estar no formato PNG ou JPEG.");
                    return;
                }

                enviarErro(response,
                        HttpServletResponse.SC_NOT_IMPLEMENTED,
                        "O armazenamento da foto ainda não foi implementado.");
                return;
            }

            boolean atualizado = dao.atualizar(emailOriginal, dados);

            if (!atualizado) {
                enviarErro(response,
                        HttpServletResponse.SC_NOT_FOUND,
                        "Nenhum atleta foi encontrado para atualizar.");
                return;
            }

            session.setAttribute("email", emailNovo);

            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().write(gson.toJson(
                    Map.of(
                            "sucesso", true,
                            "mensagem", "Perfil atualizado com sucesso!"
                    )
            ));

        } catch (SQLException e) {
            getServletContext().log(
                    "Erro SQL ao atualizar perfil do atleta.", e);

            enviarErro(response,
                    HttpServletResponse.SC_CONFLICT,
                    "Não foi possível atualizar o perfil. Verifique os dados únicos, como CPF e e-mail.");

        } catch (IllegalStateException e) {
            getServletContext().log(
                    "Limite de envio excedido.", e);

            enviarErro(response,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "O arquivo enviado ultrapassa o limite permitido.");

        } catch (ServletException e) {
            getServletContext().log(
                    "Erro ao processar o formulário multipart.", e);

            enviarErro(response,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Não foi possível processar os dados enviados.");

        } catch (RuntimeException e) {
            getServletContext().log(
                    "Erro ao interpretar os dados do perfil.", e);

            enviarErro(response,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Os dados enviados possuem um formato inválido.");
        }
    }

    private boolean sessaoAtletaValida(HttpSession session) {
        return session != null
                && session.getAttribute("email") != null
                && "atleta".equals(
                        session.getAttribute("tipoUsuario"));
    }

    private String valor(Map<String, Object> dados, String chave) {
        Object valor = dados.get(chave);
        return valor == null ? "" : valor.toString().trim();
    }

    private void enviarErro(
            HttpServletResponse response,
            int status,
            String mensagem) throws IOException {

        response.setStatus(status);
        response.getWriter().write(
                gson.toJson(Map.of("mensagem", mensagem)));
    }
}