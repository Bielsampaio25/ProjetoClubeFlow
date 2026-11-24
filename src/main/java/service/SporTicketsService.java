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
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import models.eventoModel;

public class SporTicketsService {

    private static final String BASE_URL =
            "https://api.sportickets.com.br/public/v1/events";

    private static final String TOKEN = "stk_live_9Gu6zE4SnbI3MoLEel9UYqnLg6z8XvrN1Iu130";

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

        if (TOKEN == null || TOKEN.isBlank()) {
            throw new IllegalStateException(
                    "Token da SporTickets não configurado."
            );
        }

        atletaDAO dao = new atletaDAO();

        String cidade = dao.buscarCidade(email);
        String estado = dao.buscarEstado(email);

        System.out.println("========== DADOS DO ATLETA ==========");
        System.out.println("Cidade: " + cidade);
        System.out.println("Estado: " + estado);
        System.out.println("=====================================");

        if (cidade == null || cidade.isBlank()
                || estado == null || estado.isBlank()) {

            throw new IllegalStateException(
                    "Não foi possível localizar a cidade e o estado do atleta."
            );
        }

        List<eventoModel> eventosEncontrados = new ArrayList<>();

        String cursor = null;

        int totalRecebido = 0;
        int totalModalidades = 0;
        int totalLocalidade = 0;

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
                    .header("Authorization", "Bearer " + TOKEN)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            System.out.println("Status HTTP: " + response.statusCode());

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

            if (!resposta.has("data")
                    || !resposta.get("data").isJsonArray()) {

                throw new RuntimeException(
                        "Resposta inválida da SporTickets: campo data não encontrado."
                );
            }

            JsonArray dados = resposta.getAsJsonArray("data");

            System.out.println("Eventos recebidos nesta página: "
                    + dados.size());

            for (JsonElement elemento : dados) {

                if (!elemento.isJsonObject()) {
                    continue;
                }

                JsonObject eventoJson = elemento.getAsJsonObject();

                totalRecebido++;

                String modalidade = normalizar(
                        obterTexto(eventoJson, "sport")
                ).replace(" ", "_");

                if (!MODALIDADES.contains(modalidade)) {
                    continue;
                }

                totalModalidades++;

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

                totalLocalidade++;

                JsonObject organizador = eventoJson.has("host")
                        && eventoJson.get("host").isJsonObject()
                        ? eventoJson.getAsJsonObject("host")
                        : null;

                eventoModel evento = new eventoModel(
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
                );

                eventosEncontrados.add(evento);

                System.out.println("Evento encontrado: "
                        + obterTexto(eventoJson, "name"));
            }

            JsonObject paginacao = resposta.has("pagination")
                    && resposta.get("pagination").isJsonObject()
                    ? resposta.getAsJsonObject("pagination")
                    : null;

            cursor = paginacao != null
                    && paginacao.has("next_cursor")
                    && !paginacao.get("next_cursor").isJsonNull()
                    ? paginacao.get("next_cursor").getAsString()
                    : null;

        } while (cursor != null && !cursor.isBlank());

        System.out.println("\n========== RESULTADO FINAL ==========");
        System.out.println("Eventos recebidos: " + totalRecebido);
        System.out.println("Modalidades aceitas: " + totalModalidades);
        System.out.println("Eventos da localidade: " + totalLocalidade);
        System.out.println("Eventos adicionados: " + eventosEncontrados.size());
        System.out.println("=====================================");

        return eventosEncontrados;
    }

    private String obterTexto(JsonObject objeto, String campo) {

        if (objeto == null
                || !objeto.has(campo)
                || objeto.get(campo).isJsonNull()) {

            return null;
        }

        JsonElement elemento = objeto.get(campo);

        if (!elemento.isJsonPrimitive()) {
            return null;
        }

        return elemento.getAsString();
    }

    private String normalizar(String valor) {

        if (valor == null) {
            return "";
        }

        return Normalizer.normalize(
                valor.trim(),
                Normalizer.Form.NFD
        )
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
    }
}
