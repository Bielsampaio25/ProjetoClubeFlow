package controller;

import dao.redeSocialDAO;
import dao.redeSocialDAO.Midia;
import com.google.gson.Gson;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebServlet("/RedeSocialController")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,
    maxFileSize = 2 * 1024 * 1024,
    maxRequestSize = 20 * 1024 * 1024
)
public class redeSocialController extends HttpServlet {

    private static final long serialVersionUID = 1L;

    private static final int TAMANHO_MAXIMO_ARQUIVO = 2 * 1024 * 1024;
    private static final int TAMANHO_MAXIMO_TEXTO = 2200;
    private static final int TAMANHO_MAXIMO_COMENTARIO = 1000;
    private static final int MAXIMO_MIDIAS_PUBLICACAO = 10;

    private final redeSocialDAO dao = new redeSocialDAO();
    private final Gson gson = new Gson();

    // =========================================================
    // RESPOSTAS JSON
    // =========================================================

    private void responder(HttpServletResponse response, Object dados)
            throws IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        response.getWriter().write(gson.toJson(dados));
    }

    private void erro(
            HttpServletResponse response,
            int status,
            String mensagem) throws IOException {

        response.setStatus(status);

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("sucesso", false);
        resultado.put("mensagem", mensagem);

        responder(response, resultado);
    }

    private Map<String, Object> sucesso(String mensagem) {

        Map<String, Object> resultado = new HashMap<>();

        resultado.put("sucesso", true);
        resultado.put("mensagem", mensagem);

        return resultado;
    }

    // =========================================================
    // AUTENTICAÇÃO
    // =========================================================

    private int obterAtleta(HttpServletRequest request) throws Exception {

        HttpSession sessao = request.getSession(false);

        if (sessao == null || sessao.getAttribute("email") == null) {
            throw new Exception("Sessão expirada. Faça login novamente.");
        }

        String email = String.valueOf(sessao.getAttribute("email")).trim();

        if (email.isEmpty()) {
            throw new Exception("Sessão inválida. Faça login novamente.");
        }

        return dao.obterIdAtleta(email);
    }

    // =========================================================
    // VALIDAR PARÂMETROS
    // =========================================================

    private int obterId(HttpServletRequest request, String parametro) {

        String valor = request.getParameter(parametro);

        if (valor == null || valor.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "O parâmetro " + parametro + " é obrigatório."
            );
        }

        try {
            int id = Integer.parseInt(valor);

            if (id <= 0) {
                throw new IllegalArgumentException(
                        "O ID informado é inválido."
                );
            }

            return id;

        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "O ID informado é inválido."
            );
        }
    }

    private String obterTexto(
            HttpServletRequest request,
            String parametro) {

        String texto = request.getParameter(parametro);

        return texto == null ? "" : texto.trim();
    }

    // =========================================================
    // VALIDAR E LER MÍDIA
    // =========================================================

    private Midia lerMidia(Part parte) throws IOException {

        if (parte == null || parte.getSize() <= 0) {
            return null;
        }

        if (parte.getSize() > TAMANHO_MAXIMO_ARQUIVO) {
            throw new IllegalArgumentException(
                    "Cada arquivo deve ter no máximo 2 MB."
            );
        }

        String mime = parte.getContentType();

        if (mime == null) {
            throw new IllegalArgumentException(
                    "Não foi possível identificar o tipo do arquivo."
            );
        }

        mime = mime.toLowerCase().trim();

        boolean imagem = mime.equals("image/jpeg")
                || mime.equals("image/png")
                || mime.equals("image/webp")
                || mime.equals("image/gif");

        boolean video = mime.equals("video/mp4")
                || mime.equals("video/webm");

        if (!imagem && !video) {
            throw new IllegalArgumentException(
                    "Formato não permitido. "
                    + "Utilize JPG, PNG, WEBP, GIF, MP4 ou WEBM."
            );
        }

        String nome = parte.getSubmittedFileName();

        if (nome == null || nome.trim().isEmpty()) {
            nome = "arquivo";
        } else {
            nome = nome.replace("\\", "/");

            if (nome.contains("/")) {
                nome = nome.substring(nome.lastIndexOf("/") + 1);
            }
        }

        byte[] arquivo = parte.getInputStream().readAllBytes();

        if (arquivo.length == 0) {
            throw new IllegalArgumentException(
                    "O arquivo selecionado está vazio."
            );
        }

        if (arquivo.length > TAMANHO_MAXIMO_ARQUIVO) {
            throw new IllegalArgumentException(
                    "Cada arquivo deve ter no máximo 2 MB."
            );
        }

        return new Midia(arquivo, nome, mime);
    }

    // =========================================================
    // GET
    // =========================================================

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String acao = request.getParameter("acao");

        try {

            int atleta = obterAtleta(request);

            if (acao == null || acao.trim().isEmpty()) {
                erro(response, 400, "Ação não informada.");
                return;
            }

            switch (acao) {

                // -------------------------------------------------
                // FEED
                // -------------------------------------------------

                case "feed": {
                    responder(response, dao.listarFeed(atleta));
                    break;
                }

                // -------------------------------------------------
                // COMENTÁRIOS
                // -------------------------------------------------

                case "comentarios": {
                    int idPublicacao = obterId(request, "id");

                    responder(
                            response,
                            dao.listarComentarios(idPublicacao)
                    );

                    break;
                }

                // -------------------------------------------------
                // STORIES
                // -------------------------------------------------

                case "stories": {
                    responder(response, dao.listarStories());
                    break;
                }

                default: {
                    erro(response, 400, "Ação inválida.");
                    break;
                }
            }

        } catch (Exception e) {

            if (e.getMessage() != null
                    && e.getMessage().contains("Sessão")) {

                erro(response, 401, e.getMessage());

            } else {
                e.printStackTrace();

                erro(
                        response,
                        500,
                        "Não foi possível carregar os dados da rede social."
                );
            }
        }
    }

    // =========================================================
    // POST
    // =========================================================

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        try {

            int atleta = obterAtleta(request);
            String acao = request.getParameter("acao");

            if (acao == null || acao.trim().isEmpty()) {
                erro(response, 400, "Ação não informada.");
                return;
            }

            switch (acao) {

                // -------------------------------------------------
                // PUBLICAR NO FEED
                // -------------------------------------------------

                case "publicar": {

                    String texto = obterTexto(request, "texto");

                    if (texto.length() > TAMANHO_MAXIMO_TEXTO) {
                        erro(
                                response,
                                400,
                                "A publicação ultrapassa 2200 caracteres."
                        );
                        return;
                    }

                    List<Midia> midias = new ArrayList<>();

                    for (Part parte : request.getParts()) {

                        if (!"arquivos".equals(parte.getName())
                                || parte.getSize() <= 0) {
                            continue;
                        }

                        if (midias.size() >= MAXIMO_MIDIAS_PUBLICACAO) {
                            erro(
                                    response,
                                    400,
                                    "Você pode anexar no máximo 10 mídias."
                            );
                            return;
                        }

                        Midia midia = lerMidia(parte);

                        if (midia != null) {
                            midias.add(midia);
                        }
                    }

                    if (texto.isEmpty() && midias.isEmpty()) {
                        erro(
                                response,
                                400,
                                "Escreva algo ou selecione uma mídia."
                        );
                        return;
                    }

                    int idPublicacao = dao.publicar(
                            atleta,
                            texto,
                            midias
                    );

                    Map<String, Object> resultado =
                            sucesso("Publicação realizada com sucesso.");

                    resultado.put("id", idPublicacao);

                    responder(response, resultado);

                    break;
                }

                // -------------------------------------------------
                // CURTIR / DESCURTIR
                // -------------------------------------------------

                case "curtir": {

                    int idPublicacao = obterId(request, "id");

                    boolean curtido = dao.curtir(
                            atleta,
                            idPublicacao
                    );

                    Map<String, Object> resultado = sucesso(
                            curtido
                                    ? "Curtida adicionada."
                                    : "Curtida removida."
                    );

                    resultado.put("curtido", curtido);

                    responder(response, resultado);

                    break;
                }

                // -------------------------------------------------
                // COMENTAR
                // -------------------------------------------------

                case "comentar": {

                    int idPublicacao = obterId(request, "id");
                    String texto = obterTexto(request, "texto");

                    if (texto.isEmpty()) {
                        erro(
                                response,
                                400,
                                "O comentário não pode estar vazio."
                        );
                        return;
                    }

                    if (texto.length() > TAMANHO_MAXIMO_COMENTARIO) {
                        erro(
                                response,
                                400,
                                "O comentário ultrapassa 1000 caracteres."
                        );
                        return;
                    }

                    dao.comentar(
                            atleta,
                            idPublicacao,
                            texto
                    );

                    responder(
                            response,
                            sucesso("Comentário publicado.")
                    );

                    break;
                }

                // -------------------------------------------------
                // PUBLICAR STORY
                // -------------------------------------------------

                case "publicarStory": {

                    Part parte = request.getPart("arquivo");
                    Midia midia = lerMidia(parte);

                    if (midia == null) {
                        erro(
                                response,
                                400,
                                "Selecione uma foto ou vídeo."
                        );
                        return;
                    }

                    int idStory = dao.publicarStory(
                            atleta,
                            midia
                    );

                    Map<String, Object> resultado =
                            sucesso("Story publicado com sucesso.");

                    resultado.put("id", idStory);

                    responder(response, resultado);

                    break;
                }

                // -------------------------------------------------
                // EXCLUIR STORY
                // -------------------------------------------------

                case "excluirStory": {

                    int idStory = obterId(request, "id");

                    boolean excluido = dao.excluirStory(
                            idStory,
                            atleta
                    );

                    Map<String, Object> resultado = sucesso(
                            excluido
                                    ? "Story excluído."
                                    : "Story não encontrado ou não pertence a você."
                    );

                    resultado.put("excluido", excluido);

                    responder(response, resultado);

                    break;
                }

                // -------------------------------------------------
                // AÇÃO INVÁLIDA
                // -------------------------------------------------

                default: {

                    erro(response, 400, "Ação inválida.");

                    break;
                }
            }

        } catch (IllegalArgumentException e) {

            erro(
                    response,
                    400,
                    e.getMessage() == null
                            ? "Dados informados inválidos."
                            : e.getMessage()
            );

        } catch (Exception e) {

            e.printStackTrace();

            if (e.getMessage() != null
                    && e.getMessage().contains("Sessão")) {

                erro(response, 401, e.getMessage());

            } else if (e instanceof SQLException) {

                erro(
                        response,
                        500,
                        "Erro ao acessar o banco de dados."
                );

            } else if (e instanceof ServletException) {

                erro(
                        response,
                        413,
                        "Arquivo ou requisição acima do limite permitido."
                );

            } else {

                erro(
                        response,
                        500,
                        "Não foi possível concluir a operação."
                );
            }
        }
    }
}
