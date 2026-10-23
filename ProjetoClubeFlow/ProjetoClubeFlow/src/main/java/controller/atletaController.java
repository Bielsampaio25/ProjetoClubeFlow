package controller;

import java.io.IOException;

import dao.atletaDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import models.atletaModel;

@WebServlet(urlPatterns = {
    "/dadosPessoaisAtleta",
    "/dadosEsportivoAtleta"
})
public class atletaController extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        atletaDAO dao = new atletaDAO();
        atletaModel atleta = new atletaModel();

        String caminho = request.getServletPath();
        
        if ("/dadosPessoaisAtleta".equals(caminho)) {

            atleta.setNome(request.getParameter("nome"));
            atleta.setData_nascimento(request.getParameter("dtaNascimento"));
            atleta.setCidade(request.getParameter("cidade"));
            atleta.setEstado(request.getParameter("estado"));
            atleta.setCpf(request.getParameter("cpf"));
            atleta.setEmail(request.getParameter("email"));
            atleta.setTelefone(request.getParameter("telefone"));
            atleta.setSenha(request.getParameter("senha"));
            
            System.out.println("atleta salvo no model");

            if (dao.cadastrarDadosPessoais(atleta)) {
                response.sendRedirect(
                    request.getContextPath() + "/pages/perfil-esportivo.html"
                );
            } else {
                response.sendRedirect(
                    request.getContextPath() + "/pages/cadastro.html"
                );
            }

        } else if ("/dadosEsportivoAtleta".equals(caminho)) {

            atleta.setPosicaoPrincipal(
                request.getParameter("posicaoPrincipal")
            );
            atleta.setPosicaoSecundaria(
                request.getParameter("posicaoSecundaria")
            );
            atleta.setPeDominante(
                request.getParameter("peDominante")
            );
            atleta.setAltura(
                request.getParameter("altura")
            );
            atleta.setPeso(
                request.getParameter("peso")
            );
            atleta.setCategoria(
                request.getParameter("categoria")
            );

            String numero = request.getParameter("numeroCamisa");

            if (numero != null && !numero.isBlank()) {
                atleta.setNumeroCamisa(Integer.parseInt(numero));
            }

            atleta.setNivelAtual(
                request.getParameter("nivelAtual")
            );

            if (dao.cadastrarDadosPessoais(atleta)) {
                response.sendRedirect(
                    request.getContextPath() + "/pages/cadastro-concluido.html"
                );
            } else {
                response.sendRedirect(
                    request.getContextPath() + "/pages/cadastro.html"
                );
            }

        }
    }
}
