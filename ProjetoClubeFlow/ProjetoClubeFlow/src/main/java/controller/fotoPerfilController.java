
package controller;

import dao.atletaDAO;
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

@WebServlet("/fotoPerfilAtleta")
@MultipartConfig(
    maxFileSize = 5 * 1024 * 1024,
    maxRequestSize = 6 * 1024 * 1024
)
public class fotoPerfilController extends HttpServlet {

    private final atletaDAO dao = new atletaDAO();

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        HttpSession sessao = request.getSession(false);

        if (sessao == null || sessao.getAttribute("idAtleta") == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        int idAtleta = Integer.parseInt(
            sessao.getAttribute("idAtleta").toString()
        );

        Part parte = request.getPart("foto");

        if (parte == null || parte.getSize() == 0) {
            response.sendError(
                HttpServletResponse.SC_BAD_REQUEST,
                "Nenhuma foto foi enviada."
            );
            return;
        }

        String tipo = parte.getContentType();

        if (tipo == null ||
            !(tipo.equals("image/jpeg")
              || tipo.equals("image/png")
              || tipo.equals("image/webp"))) {
            response.sendError(
                HttpServletResponse.SC_UNSUPPORTED_MEDIA_TYPE,
                "Envie uma imagem JPG, PNG ou WEBP."
            );
            return;
        }

        if (parte.getSize() > 5 * 1024 * 1024) {
            response.sendError(
                HttpServletResponse.SC_BAD_REQUEST,
                "A imagem deve ter no máximo 5 MB."
            );
            return;
        }

        try (InputStream entrada = parte.getInputStream()) {
            byte[] foto = entrada.readAllBytes();

            boolean atualizado = dao.atualizarFoto(idAtleta, foto);

            if (atualizado) {
                response.setStatus(HttpServletResponse.SC_OK);
                response.getWriter().write(
                    "{\"mensagem\":\"Foto salva com sucesso!\"}"
                );
            } else {
                response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Não foi possível salvar a foto."
                );
            }
        }
    }

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession sessao = request.getSession(false);

        if (sessao == null || sessao.getAttribute("idAtleta") == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        int idAtleta = Integer.parseInt(
            sessao.getAttribute("idAtleta").toString()
        );

        byte[] foto = dao.buscarFoto(idAtleta);

        if (foto == null || foto.length == 0) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        response.setContentType("image/jpeg");
        response.setContentLength(foto.length);
        response.setHeader("Cache-Control", "no-store");

        response.getOutputStream().write(foto);
    }
}