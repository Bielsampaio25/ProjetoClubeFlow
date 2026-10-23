package controller;

import dao.atletaDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import models.atletaModel;

@WebServlet("/dadosPessoaisAtleta")
public class atletaController extends HttpServlet {

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        atletaModel atletaModel = new atletaModel();

        atletaModel.setNome(request.getParameter("nome"));
        atletaModel.setData_nascimento(request.getParameter("dtaNascimento"));
        atletaModel.setCidade(request.getParameter("cidade"));
        atletaModel.setEstado(request.getParameter("estado"));
        atletaModel.setCpf(request.getParameter("cpf"));
        atletaModel.setEmail(request.getParameter("email"));
        atletaModel.setTelefone(request.getParameter("telefone"));
        atletaModel.setSenha(request.getParameter("senha"));

        atletaDAO atletaDAO = new atletaDAO();

        if (atletaDAO.cadastrarDadosPessoais(atletaModel)) {
            response.sendRedirect(request.getContextPath() + "/pages/dashboard-atleta.html");
        }else {
            response.sendRedirect(request.getContextPath() + "/pages/cadastro.html");
        }
    }
}
