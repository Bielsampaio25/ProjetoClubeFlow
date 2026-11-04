package service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dao.atletaDAO;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import models.eventoModel;

public class SporTicketsService {

    private static final String BASE_URL
            = "https://api.sportickets.com.br/public/v1/events";

    private static final Set<String> MODALIDADES = Set.of(
            "FUTEBOL",
            "FUTSAL",
            "FUTEBOL_SOCIETY"
    );

    private final HttpClient client;

    public SporTicketsService() {
        this.client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public List<eventoModel> buscarEventos(String email) throws Exception {

    atletaDAO atletaDAO = new atletaDAO();

    String cidade = atletaDAO.buscarCidade(email);
    String estado = atletaDAO.buscarEstado(email);
    
    System.out.println("cidade: " + cidade);
    System.out.println("estado: " + estado);

    if (cidade == null || estado == null) {
        throw new IllegalStateException(
                "Não foi possível localizar a cidade e o estado do atleta."
        );
    }


        String token = "stk_live_9Gu6zE4SnbI3MoLEel9UYqnLg6z8XvrN1Iu130";

        if (token == null || token.isBlank()) {
            throw new IllegalStateException(
                    "Token da SporTickets não configurado."
            );
        }

        List<eventoModel> eventosEncontrados = new ArrayList<>();
        String cursor = null;

        do {
            String url = BASE_URL
                    + "?page_size=100"
                    + "&fields=id,name,detail,start_date,status,image,url,address,host,sport"
                    + (cursor != null
                            ? "&cursor=" + URLEncoder.encode(
                                    cursor, StandardCharsets.UTF_8)
                            : "");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                throw new RuntimeException(
                        "Erro na SporTickets. HTTP "
                        + response.statusCode() + ": "
                        + response.body()
                );
            }

            JsonObject resposta = JsonParser
                    .parseString(response.body())
                    .getAsJsonObject();

            JsonArray dados = resposta.getAsJsonArray("data");

            for (JsonElement elemento : dados) {

                JsonObject eventoJson = elemento.getAsJsonObject();

                String modalidade = obterTexto(eventoJson, "sport");

                if (!MODALIDADES.contains(modalidade)) {
                    continue;
                }

                JsonObject endereco = eventoJson.has("address")
                        && eventoJson.get("address").isJsonObject()
                        ? eventoJson.getAsJsonObject("address")
                        : null;

                if (endereco == null) {
                    continue;
                }

                String cidadeEvento = obterTexto(endereco, "city");
                String estadoEvento = obterTexto(endereco, "state");

                if (!normalizar(cidadeEvento).equals(normalizar(cidade))
                        || !normalizar(estadoEvento).equals(normalizar(estado))) {
                    continue;
                }

                JsonObject organizador = eventoJson.has("host")
                        && eventoJson.get("host").isJsonObject()
                        ? eventoJson.getAsJsonObject("host")
                        : null;

                eventosEncontrados.add(new eventoModel(
                        obterTexto(eventoJson, "id"),
                        obterTexto(eventoJson, "name"),
                        obterTexto(eventoJson, "detail"),
                        obterTexto(eventoJson, "start_date"),
                        obterTexto(eventoJson, "status"),
                        modalidade,
                        cidadeEvento,
                        estadoEvento,
                        obterTexto(endereco, "address"),
                        obterTexto(eventoJson, "url"),
                        obterTexto(eventoJson, "image"),
                        organizador != null
                                ? obterTexto(organizador, "name")
                                : null
                ));
            }

            JsonObject paginacao = resposta.getAsJsonObject("pagination");

            cursor = paginacao.has("next_cursor")
                    && !paginacao.get("next_cursor").isJsonNull()
                    ? paginacao.get("next_cursor").getAsString()
                    : null;

        } while (cursor != null);

        return eventosEncontrados;
    }

    private String obterTexto(JsonObject objeto, String campo) {

        if (objeto == null
                || !objeto.has(campo)
                || objeto.get(campo).isJsonNull()) {
            return null;
        }

        return objeto.get(campo).getAsString();
    }

    private String normalizar(String valor) {

        if (valor == null) {
            return "";
        }

        return java.text.Normalizer.normalize(
                valor.trim(),
                java.text.Normalizer.Form.NFD
        )
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
    }
}
