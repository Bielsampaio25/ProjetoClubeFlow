package controller;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import dao.atletaDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import models.atletaModel;

@WebServlet(urlPatterns = {
    "/dadosPessoaisAtleta",
    "/dadosEsportivoAtleta"
})
public class atletaController extends HttpServlet {

    private final atletaDAO dao = new atletaDAO();

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String caminho = request.getServletPath();

        if ("/dadosPessoaisAtleta".equals(caminho)) {
            cadastrarDadosPessoais(request, response);

        } else if ("/dadosEsportivoAtleta".equals(caminho)) {
            cadastrarDadosEsportivos(request, response);

        } else {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
        }
    }

    private void cadastrarDadosPessoais(
            HttpServletRequest request,
            HttpServletResponse response)
            throws IOException {

        atletaModel atleta = new atletaModel();

        atleta.setNome(request.getParameter("nome"));
        atleta.setData_nascimento(
                request.getParameter("dtaNascimento"));
        atleta.setCpf(request.getParameter("cpf"));
        atleta.setCidade(request.getParameter("cidade"));
        atleta.setEstado(request.getParameter("estado"));
        atleta.setEmail(request.getParameter("email"));
        atleta.setTelefone(request.getParameter("telefone"));
        atleta.setSenha(request.getParameter("senha"));

        if (atleta.getNome() == null
                || atleta.getNome().isBlank()
                || atleta.getCpf() == null
                || atleta.getCpf().isBlank()) {

            response.sendRedirect(
                    request.getContextPath() + "/pages/cadastro.html");
            return;
        }

        String dataNascimento = atleta.getData_nascimento();

        if (dataNascimento != null && !dataNascimento.isBlank()) {
            try {
                LocalDate.parse(dataNascimento);
            } catch (DateTimeParseException e) {
                response.sendRedirect(
                        request.getContextPath() + "/pages/cadastro.html");
                return;
            }
        }

        int idAtleta = dao.cadastrarDadosPessoais(atleta);

        if (idAtleta > 0) {
            HttpSession sessao = request.getSession();
            sessao.setAttribute("idAtleta", idAtleta);

            response.sendRedirect(
                    request.getContextPath()
                    + "/pages/perfil-esportivo.html");
        } else {
            response.sendRedirect(
                    request.getContextPath() + "/pages/cadastro.html");
        }
    }

    private void cadastrarDadosEsportivos(
            HttpServletRequest request,
            HttpServletResponse response)
            throws IOException {

        HttpSession sessao = request.getSession(false);

        if (sessao == null
                || sessao.getAttribute("idAtleta") == null) {

            response.sendRedirect(
                    request.getContextPath() + "/pages/cadastro.html");
            return;
        }

        Integer idAtleta
                = (Integer) sessao.getAttribute("idAtleta");

        atletaModel atleta = new atletaModel();

        atleta.setPosicaoPrincipal(
                request.getParameter("posicaoPrincipal"));

        atleta.setPosicaoSecundaria(
                request.getParameter("posicaoSecundaria"));

        atleta.setPeDominante(
                request.getParameter("peDominante"));

        atleta.setAltura(request.getParameter("altura"));
        atleta.setPeso(request.getParameter("peso"));
        atleta.setCategoria(request.getParameter("categoria"));
        atleta.setNivelAtual(request.getParameter("nivelAtual"));

        String numero = request.getParameter("numeroCamisa");

        if (numero != null && !numero.isBlank()) {
            try {
                atleta.setNumeroCamisa(Integer.valueOf(numero));
            } catch (NumberFormatException e) {
                response.sendRedirect(
                        request.getContextPath()
                        + "/pages/perfil-esportivo.html");
                return;
            }
        }

        if (!decimalValido(atleta.getAltura())
                || !decimalValido(atleta.getPeso())) {

            response.sendRedirect(
                    request.getContextPath()
                    + "/pages/perfil-esportivo.html");
            return;
        }

        boolean atualizado
                = dao.atualizarDadosEsportivos(atleta, idAtleta);

        if (atualizado) {
            sessao.removeAttribute("idAtleta");

            response.sendRedirect(
                    request.getContextPath()
                    + "/pages/cadastro-concluido.html");
        } else {
            response.sendRedirect(
                    request.getContextPath()
                    + "/pages/perfil-esportivo.html");
        }
    }

    private boolean decimalValido(String valor) {
        if (valor == null || valor.isBlank()) {
            return true;
        }

        try {
            BigDecimal numero = new BigDecimal(
                    valor.replace("m", "")
                            .replace("kg", "")
                            .trim()
                            .replace(",", "."));

            return numero.compareTo(BigDecimal.ZERO) > 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
