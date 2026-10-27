
package controller;

import dao.atletaDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet("/fotoPerfilAtleta")
public class fotoPerfilController extends HttpServlet {

    private final atletaDAO dao = new atletaDAO();

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setHeader("Cache-Control", "no-store");

        HttpSession sessao = request.getSession(false);

        if (sessao == null
                || sessao.getAttribute("email") == null
                || !"atleta".equals(sessao.getAttribute("tipoUsuario"))) {
            response.sendError(
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Sessão de atleta não encontrada."
            );
            return;
        }

        String email = sessao.getAttribute("email").toString();
        int idAtleta = dao.buscarIdPorEmail(email);

        if (idAtleta <= 0) {
            response.sendError(
                    HttpServletResponse.SC_NOT_FOUND,
                    "Atleta não encontrado."
            );
            return;
        }

        byte[] foto = dao.buscarFoto(idAtleta);

        if (foto == null || foto.length == 0) {
            response.sendError(
                    HttpServletResponse.SC_NOT_FOUND,
                    "Foto de perfil não encontrada."
            );
            return;
        }

        if (ehJpeg(foto)) {
            response.setContentType("image/jpeg");
        } else if (ehPng(foto)) {
            response.setContentType("image/png");
        } else {
            response.sendError(
                    HttpServletResponse.SC_UNSUPPORTED_MEDIA_TYPE,
                    "Formato de imagem inválido."
            );
            return;
        }

        response.setContentLength(foto.length);
        response.getOutputStream().write(foto);
    }

    private boolean ehJpeg(byte[] foto) {
        return foto.length >= 3
                && (foto[0] & 0xFF) == 0xFF
                && (foto[1] & 0xFF) == 0xD8
                && (foto[2] & 0xFF) == 0xFF;
    }

    private boolean ehPng(byte[] foto) {
        return foto.length >= 8
                && (foto[0] & 0xFF) == 0x89
                && foto[1] == 0x50
                && foto[2] == 0x4E
                && foto[3] == 0x47
                && foto[4] == 0x0D
                && foto[5] == 0x0A
                && foto[6] == 0x1A
                && foto[7] == 0x0A;
    }
}