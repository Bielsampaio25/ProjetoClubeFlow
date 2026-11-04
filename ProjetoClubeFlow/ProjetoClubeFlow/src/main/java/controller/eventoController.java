
package controller;

import com.google.gson.Gson;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;
import models.eventoModel;
import service.SporTicketsService;

@WebServlet("/eventos")
public class eventoController extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null
                || !"atleta".equals(session.getAttribute("tipoUsuario"))) {

            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String email = (String) session.getAttribute("email");

        try {
            SporTicketsService service = new SporTicketsService();

            List<eventoModel> eventos = service.buscarEventos(email);

            response.getWriter().write(new Gson().toJson(eventos));

        } catch (Exception e) {

            getServletContext().log("Erro ao buscar eventos.", e);

            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Não foi possível buscar os eventos."
            );
        }
    }
}
