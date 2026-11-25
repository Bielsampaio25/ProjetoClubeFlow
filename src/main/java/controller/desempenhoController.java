
package controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@WebServlet("/api/desempenho")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,
    maxFileSize = 10 * 1024 * 1024,
    maxRequestSize = 12 * 1024 * 1024
)
public class desempenhoController extends HttpServlet {

    private static final String API_PYTHON =
        "http://127.0.0.1:8001/analisar-documento";

    private static final HttpClient CLIENTE = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(20))
        .build();

    @Override
    protected void doPost(
        HttpServletRequest request,
        HttpServletResponse response
    ) throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            Part arquivo = request.getPart("arquivo");

            if (arquivo == null || arquivo.getSize() == 0) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(
                    "{\"sucesso\":false,\"mensagem\":\"Nenhum arquivo foi enviado.\"}"
                );
                return;
            }

            String nomeArquivo = arquivo.getSubmittedFileName();

            if (nomeArquivo == null || nomeArquivo.isBlank()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(
                    "{\"sucesso\":false,\"mensagem\":\"Nome do arquivo inválido.\"}"
                );
                return;
            }

            nomeArquivo = nomeArquivo.replace("\\", "/");
            nomeArquivo = nomeArquivo.substring(
                nomeArquivo.lastIndexOf("/") + 1
            );

            if (!nomeArquivo.toLowerCase().endsWith(".pdf")) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(
                    "{\"sucesso\":false,\"mensagem\":\"Envie um arquivo PDF válido.\"}"
                );
                return;
            }

            if (arquivo.getSize() > 10 * 1024 * 1024) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write(
                    "{\"sucesso\":false,\"mensagem\":\"O arquivo ultrapassa o limite de 10 MB.\"}"
                );
                return;
            }

            byte[] conteudoArquivo;

            try (InputStream input = arquivo.getInputStream()) {
                conteudoArquivo = input.readAllBytes();
            }

            String boundary = "----ClubFlowBoundary" + System.currentTimeMillis();

            byte[] corpoRequisicao = montarMultipart(
                boundary,
                nomeArquivo,
                conteudoArquivo
            );

            HttpRequest requisicaoPython = HttpRequest.newBuilder()
                .uri(URI.create(API_PYTHON))
                .timeout(Duration.ofSeconds(180))
                .header(
                    "Content-Type",
                    "multipart/form-data; boundary=" + boundary
                )
                .POST(HttpRequest.BodyPublishers.ofByteArray(corpoRequisicao))
                .build();

            HttpResponse<String> respostaPython = CLIENTE.send(
                requisicaoPython,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            response.setStatus(respostaPython.statusCode());

            response.getWriter().write(respostaPython.body());

        } catch (IllegalStateException e) {

            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write(
                "{\"sucesso\":false,\"mensagem\":\"O arquivo enviado é muito grande.\"}"
            );

        } catch (ServletException e) {

            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write(
                "{\"sucesso\":false,\"mensagem\":\"Erro ao receber o arquivo enviado.\"}"
            );

        } catch (java.net.http.HttpTimeoutException e) {

            response.setStatus(HttpServletResponse.SC_GATEWAY_TIMEOUT);
            response.getWriter().write(
                "{\"sucesso\":false,\"mensagem\":\"A IA demorou muito para responder. Tente novamente.\"}"
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(
                "{\"sucesso\":false,\"mensagem\":\"A análise foi interrompida.\"}"
            );

        } catch (IOException e) {

            response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
            response.getWriter().write(
                "{\"sucesso\":false,\"mensagem\":\"Não foi possível conectar à IA. Tente novamente mais tarde.\"}"
            );
        }
    }

    private byte[] montarMultipart(
        String boundary,
        String nomeArquivo,
        byte[] conteudoArquivo
    ) throws IOException {

        ByteArrayOutputStream saida = new ByteArrayOutputStream();

        String inicio =
            "--" + boundary + "\r\n" +
            "Content-Disposition: form-data; name=\"arquivo\"; filename=\"" +
            nomeArquivo.replace("\"", "") + "\"\r\n" +
            "Content-Type: application/pdf\r\n\r\n";

        saida.write(inicio.getBytes(StandardCharsets.UTF_8));
        saida.write(conteudoArquivo);

        String fim = "\r\n--" + boundary + "--\r\n";

        saida.write(fim.getBytes(StandardCharsets.UTF_8));

        return saida.toByteArray();
    }
}
