package controller;

import dao.loginDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import models.loginModel;

@WebServlet("/login")
public class loginController extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String email = request.getParameter("email");
        String senha = request.getParameter("senha");

        if (email == null || senha == null || email.trim().isEmpty() || senha.isEmpty()) {
            response.sendRedirect(request.getContextPath() + "/login.html?erro=campos");
            System.out.println("Campos vazios!");
            return;
        }

        loginModel login = new loginModel();

        login.setEmail(email.trim());
        login.setSenha(senha);

        loginDAO dao = new loginDAO();

        try {
            loginModel atleta = dao.validarLoginAtleta(login);

            if (atleta != null) {

                HttpSession session = request.getSession();

                session.setAttribute("email", atleta.getEmail());
                session.setAttribute("tipoUsuario", "atleta");

                response.sendRedirect(
                    request.getContextPath()
                    + "/pages/dashboard-atleta.html"
                );

                return;
            }else{
                System.out.println("Login do atleta mal sucedido");
            }

            loginModel clube = dao.validarLoginClube(login);

            if (clube != null) {

                HttpSession session = request.getSession();

                session.setAttribute("email", clube.getEmail());
                session.setAttribute("tipoUsuario", "clube");

                response.sendRedirect(
                    request.getContextPath()
                    + "/pages/dashboard-clube.html"
                );

                return;
            }else{
                System.out.println("Login do clube mal sucedido");
            }

            response.sendRedirect(
                request.getContextPath() + "/login.html?erro=credenciais"
            );

        } catch (RuntimeException e) {

            getServletContext().log(
                "Erro durante a autenticação.", e
            );

            response.sendRedirect(
                request.getContextPath() + "/login.html?erro=servidor"
            );
        }
    }
}