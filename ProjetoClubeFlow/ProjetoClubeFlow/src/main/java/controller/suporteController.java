package controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

@WebServlet("/api/suporte")
public class suporteController extends HttpServlet {

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        JsonObject resultado = new JsonObject();

        try {
            JsonObject dados = JsonParser.parseReader(
                    request.getReader()
            ).getAsJsonObject();

            String mensagem = dados.get("mensagem").getAsString();

            if (mensagem == null || mensagem.isBlank()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resultado.addProperty("resposta", "Digite uma pergunta.");
                response.getWriter().write(resultado.toString());
                return;
            }

            JsonObject corpo = new JsonObject();
            corpo.addProperty("mensagem", mensagem);

            HttpRequest requisicao = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:8000/perguntar"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(120))
                    .POST(HttpRequest.BodyPublishers.ofString(
                            corpo.toString()
                    ))
                    .build();

            HttpResponse<String> respostaPython = client.send(
                    requisicao,
                    HttpResponse.BodyHandlers.ofString()
            );

            response.setStatus(respostaPython.statusCode());
            response.getWriter().write(respostaPython.body());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR
            );

            resultado.addProperty(
                    "resposta",
                    "A solicitação foi interrompida."
            );

            response.getWriter().write(resultado.toString());

        } catch (Exception e) {
            getServletContext().log("Erro ao consultar suporte IA.", e);

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR
            );

            resultado.addProperty(
                    "resposta",
                    "Não foi possível conectar ao assistente."
            );

            response.getWriter().write(resultado.toString());
        }
    }
}

