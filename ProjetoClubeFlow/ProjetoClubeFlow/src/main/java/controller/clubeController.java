package controller;

import dao.clubeDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import models.clubeModel;

@WebServlet("/cadastroClube")
public class clubeController extends HttpServlet {

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        clubeModel clube = new clubeModel();

        clube.setNome(request.getParameter("nomeClube"));
        clube.setCnpj(request.getParameter("cnpj"));
        clube.setDivisao(request.getParameter("divisao"));
        clube.setCidade(request.getParameter("estado"));
        clube.setEstado(request.getParameter("cidade"));
        clube.setEmail_corporativo(request.getParameter("emailCorporativo"));
        clube.setNome_responsavel(request.getParameter("responsavel"));
        clube.setCargo(request.getParameter("cargo"));

        clubeDAO clubeDAO = new clubeDAO();

        if (clubeDAO.cadastroClube(clube) == true) {
            response.sendRedirect(
                    request.getContextPath()
                    + "/pages/cadastro-concluido-clube.html");
            System.out.println("Cadastro realizado1");
        }else{
            response.sendRedirect(
                    request.getContextPath()
                    + "/pages/cadastro-clube.html");
            System.out.println("Erro ao cadastrar");
        }
    }
}
