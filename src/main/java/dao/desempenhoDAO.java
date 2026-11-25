package dao;

import connection.ConnectionFactory;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class desempenhoDAO {

    public boolean salvarAnalise(String email, JsonObject respostaIA) throws SQLException {

        if (email == null || email.isBlank() || respostaIA == null) {
            throw new IllegalArgumentException("Dados da análise inválidos.");
        }

        JsonObject dados = objeto(respostaIA, "dados");
        JsonObject estatisticas = objeto(dados, "estatisticas");
        JsonObject indicadores = objeto(dados, "indicadores");
        JsonObject avaliacoes = objeto(dados, "avaliacoes_ia", "avaliacao_ia", "avaliacao");

        JsonObject[] fontes = {estatisticas, indicadores};

        int jogos = inteiro(fontes, "jogos", "jogos_disputados", "partidas", "partidas_jogadas");
        int gols = inteiro(fontes, "gols", "gol", "total_gols");
        int assistencias = inteiro(fontes, "assistencias", "assistência", "total_assistencias");
        int finalizacoes = inteiro(fontes, "finalizacoes", "finalizações", "chutes", "chutes_totais", "total_finalizacoes");
        int finalizacoesCertas = inteiro(fontes, "finalizacoes_certas", "finalizações_certas", "finalizacoes_no_alvo", "chutes_no_alvo");
        int passesTotais = inteiro(fontes, "passes_totais", "total_passes", "passes_tentados", "tentativas_passes", "passes");
        int passesCertos = inteiro(fontes, "passes_certos", "passes_completos", "passes_completados", "passes_concluidos");
        int driblesTotais = inteiro(fontes, "dribles_totais", "total_dribles", "dribles_tentados", "tentativas_dribles");
        int driblesCertos = inteiro(fontes, "dribles_certos", "dribles_completos", "dribles_concluidos");
        int minutos = inteiro(fontes, "minutos_jogados", "minutos", "tempo_jogado");

        double precisaoFinalizacao = decimal(fontes, "precisao_finalizacao", "percentual_finalizacao", "eficiencia_finalizacao");
        double precisaoPasses = decimal(fontes, "precisao_passes", "percentual_passes", "eficiencia_passes");
        double precisaoDribles = decimal(fontes, "precisao_dribles", "percentual_dribles", "eficiencia_dribles");

        if (precisaoFinalizacao == 0 && finalizacoes > 0) {
            precisaoFinalizacao = (finalizacoesCertas * 100.0) / finalizacoes;
        }

        if (precisaoPasses == 0 && passesTotais > 0) {
            precisaoPasses = (passesCertos * 100.0) / passesTotais;
        }

        if (precisaoDribles == 0 && driblesTotais > 0) {
            precisaoDribles = (driblesCertos * 100.0) / driblesTotais;
        }

        double velocidadeMaxima = decimal(fontes, "velocidade_maxima", "velocidade_max", "max_speed");
        double velocidadeMedia = decimal(fontes, "velocidade_media", "average_speed");
        double distanciaMedia = decimal(fontes, "distancia_media", "distancia_por_jogo", "distancia_per_game");
        double distanciaAltaIntensidade = decimal(fontes, "distancia_alta_intensidade", "distancia_alta_intensidade_m", "high_intensity_distance");
        double cooper = decimal(fontes, "teste_cooper", "distancia_cooper", "cooper_metros");

        double notaMedia = decimal(avaliacoes, "nota_media", "nota_geral", "nota_desempenho", "pontuacao", "score");

        try (Connection conn = ConnectionFactory.getConnection()) {

            conn.setAutoCommit(false);

            try {

                int idAtleta = buscarIdAtleta(conn, email);

                if (idAtleta == -1) {
                    throw new SQLException("Atleta não encontrado para o e-mail informado.");
                }

                String sql = """
                    INSERT INTO Desempenho (
                        jogos, gols, finalizacoes, assistencias,
                        nota_media, sequencia_jogos,
                        finalizacoes_certas, precisao_finalizacao,
                        passes_totais, passes_certos, precisao_passes,
                        dribles_totais, dribles_certos, precisao_dribles,
                        velocidade_maxima, velocidade_media,
                        distancia_media, distancia_alta_intensidade,
                        teste_cooper, minutos_jogados, ultima_analise,
                        id_atleta
                    )
                    VALUES (
                        ?, ?, ?, ?, ?, 0,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, NOW(),
                        ?
                    )
                    ON DUPLICATE KEY UPDATE
                        jogos = VALUES(jogos),
                        gols = VALUES(gols),
                        finalizacoes = VALUES(finalizacoes),
                        assistencias = VALUES(assistencias),
                        nota_media = VALUES(nota_media),
                        finalizacoes_certas = VALUES(finalizacoes_certas),
                        precisao_finalizacao = VALUES(precisao_finalizacao),
                        passes_totais = VALUES(passes_totais),
                        passes_certos = VALUES(passes_certos),
                        precisao_passes = VALUES(precisao_passes),
                        dribles_totais = VALUES(dribles_totais),
                        dribles_certos = VALUES(dribles_certos),
                        precisao_dribles = VALUES(precisao_dribles),
                        velocidade_maxima = VALUES(velocidade_maxima),
                        velocidade_media = VALUES(velocidade_media),
                        distancia_media = VALUES(distancia_media),
                        distancia_alta_intensidade = VALUES(distancia_alta_intensidade),
                        teste_cooper = VALUES(teste_cooper),
                        minutos_jogados = VALUES(minutos_jogados),
                        ultima_analise = NOW()
                    """;

                try (PreparedStatement stmt = conn.prepareStatement(sql)) {

                    stmt.setInt(1, jogos);
                    stmt.setInt(2, gols);
                    stmt.setInt(3, finalizacoes);
                    stmt.setInt(4, assistencias);
                    stmt.setDouble(5, notaMedia);
                    stmt.setInt(6, finalizacoesCertas);
                    stmt.setDouble(7, precisaoFinalizacao);
                    stmt.setInt(8, passesTotais);
                    stmt.setInt(9, passesCertos);
                    stmt.setDouble(10, precisaoPasses);
                    stmt.setInt(11, driblesTotais);
                    stmt.setInt(12, driblesCertos);
                    stmt.setDouble(13, precisaoDribles);
                    stmt.setDouble(14, velocidadeMaxima);
                    stmt.setDouble(15, velocidadeMedia);
                    stmt.setDouble(16, distanciaMedia);
                    stmt.setDouble(17, distanciaAltaIntensidade);
                    stmt.setDouble(18, cooper);
                    stmt.setInt(19, minutos);
                    stmt.setInt(20, idAtleta);

                    stmt.executeUpdate();
                }

                int idDesempenho = buscarIdDesempenho(conn, idAtleta);

                salvarAvaliacoesTecnicas(conn, idAtleta, avaliacoes);
                salvarSugestoes(conn, idDesempenho, respostaIA);

                conn.commit();
                return true;

            } catch (Exception e) {

                conn.rollback();

                if (e instanceof SQLException) {
                    throw (SQLException) e;
                }

                throw new SQLException("Erro ao salvar a análise de desempenho.", e);

            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private void salvarAvaliacoesTecnicas(
            Connection conn,
            int idAtleta,
            JsonObject avaliacoes
    ) throws SQLException {

        String sql = """
            UPDATE Desempenho SET
                nota_velocidade = ?,
                justificativa_velocidade = ?,
                nota_finalizacao = ?,
                justificativa_finalizacao = ?,
                nota_drible = ?,
                justificativa_drible = ?,
                nota_passe = ?,
                justificativa_passe = ?,
                nota_resistencia = ?,
                justificativa_resistencia = ?
            WHERE id_atleta = ?
            """;

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {

            JsonObject velocidade = objeto(avaliacoes, "velocidade");
            JsonObject finalizacao = objeto(avaliacoes, "finalizacao");
            JsonObject drible = objeto(avaliacoes, "drible");
            JsonObject passe = objeto(avaliacoes, "passe");
            JsonObject resistencia = objeto(avaliacoes, "resistencia");

            stmt.setDouble(1, decimal(velocidade, "nota", "valor", "score"));
            stmt.setString(2, texto(velocidade, "justificativa", "descricao", "texto", "explicacao"));

            stmt.setDouble(3, decimal(finalizacao, "nota", "valor", "score"));
            stmt.setString(4, texto(finalizacao, "justificativa", "descricao", "texto", "explicacao"));

            stmt.setDouble(5, decimal(drible, "nota", "valor", "score"));
            stmt.setString(6, texto(drible, "justificativa", "descricao", "texto", "explicacao"));

            stmt.setDouble(7, decimal(passe, "nota", "valor", "score"));
            stmt.setString(8, texto(passe, "justificativa", "descricao", "texto", "explicacao"));

            stmt.setDouble(9, decimal(resistencia, "nota", "valor", "score"));
            stmt.setString(10, texto(resistencia, "justificativa", "descricao", "texto", "explicacao"));

            stmt.setInt(11, idAtleta);

            stmt.executeUpdate();
        }
    }

    private int buscarIdAtleta(Connection conn, String email) throws SQLException {

        String sql = "SELECT id FROM Atletas WHERE email = ?";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, email);

            try (ResultSet rs = stmt.executeQuery()) {

                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }

        return -1;
    }

    private int buscarIdDesempenho(Connection conn, int idAtleta) throws SQLException {

        String sql = "SELECT id FROM Desempenho WHERE id_atleta = ?";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, idAtleta);

            try (ResultSet rs = stmt.executeQuery()) {

                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }

        throw new SQLException("Não foi possível localizar o desempenho salvo.");
    }

    private void salvarSugestoes(Connection conn, int idDesempenho, JsonObject respostaIA) throws SQLException {

        String excluir = "DELETE FROM SugestoesDesempenho WHERE analise_id = ?";

        try (PreparedStatement stmt = conn.prepareStatement(excluir)) {
            stmt.setInt(1, idDesempenho);
            stmt.executeUpdate();
        }

        JsonObject dados = objeto(respostaIA, "dados");
        JsonObject avaliacao = objeto(dados, "avaliacoes_ia", "avaliacao_ia", "avaliacao");

        JsonArray sugestoes = array(dados, "sugestoes", "recomendacoes", "recomendações");

        if (sugestoes == null) {
            sugestoes = array(avaliacao, "sugestoes", "recomendacoes", "recomendações");
        }

        if (sugestoes == null) {
            sugestoes = array(respostaIA, "sugestoes", "recomendacoes", "recomendações");
        }

        if (sugestoes == null) {
            return;
        }

        String sql = """
            INSERT INTO SugestoesDesempenho
                (analise_id, categoria, sugestao)
            VALUES (?, ?, ?)
            """;

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {

            for (JsonElement elemento : sugestoes) {

                String categoria = "Geral";
                String sugestao = "";

                if (elemento.isJsonObject()) {

                    JsonObject item = elemento.getAsJsonObject();

                    String categoriaEncontrada = texto(item, "categoria", "area", "tipo", "atributo");

                    if (categoriaEncontrada != null && !categoriaEncontrada.isBlank()) {
                        categoria = categoriaEncontrada;
                    }

                    sugestao = texto(item, "sugestao", "recomendacao", "recomendação", "texto", "descricao", "objetivo");

                } else if (elemento.isJsonPrimitive()) {

                    sugestao = elemento.getAsString();
                }

                if (sugestao == null || sugestao.isBlank()) {
                    continue;
                }

                stmt.setInt(1, idDesempenho);
                stmt.setString(2, categoria);
                stmt.setString(3, sugestao);
                stmt.addBatch();
            }

            stmt.executeBatch();
        }
    }

    private JsonObject objeto(JsonObject origem, String... chaves) {

        if (origem == null) {
            return new JsonObject();
        }

        for (String chave : chaves) {

            if (!origem.has(chave) || origem.get(chave).isJsonNull()) {
                continue;
            }

            JsonElement elemento = origem.get(chave);

            if (elemento.isJsonObject()) {
                return elemento.getAsJsonObject();
            }
        }

        return new JsonObject();
    }

    private JsonArray array(JsonObject origem, String... chaves) {

        if (origem == null) {
            return null;
        }

        for (String chave : chaves) {

            if (origem.has(chave) && origem.get(chave).isJsonArray()) {
                return origem.getAsJsonArray(chave);
            }
        }

        return null;
    }

    private int inteiro(JsonObject[] fontes, String... chaves) {
        return (int) decimal(fontes, chaves);
    }

    private double decimal(JsonObject[] fontes, String... chaves) {

        if (fontes == null) {
            return 0;
        }

        for (JsonObject fonte : fontes) {

            double valor = decimal(fonte, chaves);

            if (valor != 0) {
                return valor;
            }
        }

        return 0;
    }

    private double decimal(JsonObject origem, String... chaves) {

        if (origem == null) {
            return 0;
        }

        for (String chave : chaves) {

            if (!origem.has(chave) || origem.get(chave).isJsonNull()) {
                continue;
            }

            try {

                JsonElement elemento = origem.get(chave);

                if (elemento.isJsonPrimitive()) {

                    String valor = elemento.getAsString()
                            .replace("%", "")
                            .replace(",", ".")
                            .trim();

                    return Double.parseDouble(valor);
                }

                if (elemento.isJsonObject()) {

                    JsonObject obj = elemento.getAsJsonObject();

                    if (obj.has("nota") && !obj.get("nota").isJsonNull()) {
                        return obj.get("nota").getAsDouble();
                    }

                    if (obj.has("valor") && !obj.get("valor").isJsonNull()) {
                        return obj.get("valor").getAsDouble();
                    }

                    if (obj.has("percentual") && !obj.get("percentual").isJsonNull()) {
                        return obj.get("percentual").getAsDouble();
                    }

                    if (obj.has("score") && !obj.get("score").isJsonNull()) {
                        return obj.get("score").getAsDouble();
                    }
                }

            } catch (Exception ignored) {
            }
        }

        return 0;
    }

    private String texto(JsonObject origem, String... chaves) {

        if (origem == null) {
            return null;
        }

        for (String chave : chaves) {

            if (!origem.has(chave) || origem.get(chave).isJsonNull()) {
                continue;
            }

            JsonElement elemento = origem.get(chave);

            try {

                if (elemento.isJsonPrimitive()) {
                    return elemento.getAsString();
                }

                if (elemento.isJsonObject()) {

                    JsonObject obj = elemento.getAsJsonObject();

                    if (obj.has("justificativa") && !obj.get("justificativa").isJsonNull()) {
                        return obj.get("justificativa").getAsString();
                    }

                    if (obj.has("texto") && !obj.get("texto").isJsonNull()) {
                        return obj.get("texto").getAsString();
                    }

                    if (obj.has("descricao") && !obj.get("descricao").isJsonNull()) {
                        return obj.get("descricao").getAsString();
                    }

                    if (obj.has("recomendacao") && !obj.get("recomendacao").isJsonNull()) {
                        return obj.get("recomendacao").getAsString();
                    }

                    if (obj.has("explicacao") && !obj.get("explicacao").isJsonNull()) {
                        return obj.get("explicacao").getAsString();
                    }
                }

            } catch (Exception ignored) {
            }
        }

        return null;
    }

    public JsonObject buscarAnaliseSalva(String email) throws SQLException {

        String sql = """
            SELECT
                d.*,
                a.nome,
                a.categoria,
                a.posicao_principal
            FROM Desempenho d
            INNER JOIN Atletas a ON a.id = d.id_atleta
            WHERE a.email = ?
            LIMIT 1
            """;

        try (Connection conexao = ConnectionFactory.getConnection();
             PreparedStatement stmt = conexao.prepareStatement(sql)) {

            stmt.setString(1, email);

            try (ResultSet rs = stmt.executeQuery()) {

                if (!rs.next()) {
                    return null;
                }

                JsonObject resposta = new JsonObject();
                JsonObject dados = new JsonObject();
                JsonObject atleta = new JsonObject();
                JsonObject estatisticas = new JsonObject();
                JsonObject indicadores = new JsonObject();
                JsonObject avaliacao = new JsonObject();
                JsonObject periodo = new JsonObject();

                atleta.addProperty("nome", rs.getString("nome"));
                atleta.addProperty("categoria", rs.getString("categoria"));
                atleta.addProperty("posicao", rs.getString("posicao_principal"));
                atleta.addProperty("clube", "--");

                estatisticas.addProperty("jogos", rs.getInt("jogos"));
                estatisticas.addProperty("gols", rs.getInt("gols"));
                estatisticas.addProperty("assistencias", rs.getInt("assistencias"));
                estatisticas.addProperty("finalizacoes", rs.getInt("finalizacoes"));
                estatisticas.addProperty("minutos_jogados", rs.getInt("minutos_jogados"));

                indicadores.addProperty("sequencia_jogos", rs.getInt("sequencia_jogos"));
                indicadores.addProperty("finalizacoes_certas", rs.getInt("finalizacoes_certas"));
                indicadores.addProperty("precisao_finalizacao", rs.getDouble("precisao_finalizacao"));
                indicadores.addProperty("passes_totais", rs.getInt("passes_totais"));
                indicadores.addProperty("passes_certos", rs.getInt("passes_certos"));
                indicadores.addProperty("precisao_passes", rs.getDouble("precisao_passes"));
                indicadores.addProperty("dribles_totais", rs.getInt("dribles_totais"));
                indicadores.addProperty("dribles_certos", rs.getInt("dribles_certos"));
                indicadores.addProperty("precisao_dribles", rs.getDouble("precisao_dribles"));
                indicadores.addProperty("velocidade_maxima", rs.getDouble("velocidade_maxima"));
                indicadores.addProperty("velocidade_media", rs.getDouble("velocidade_media"));
                indicadores.addProperty("distancia_media", rs.getDouble("distancia_media"));
                indicadores.addProperty("distancia_alta_intensidade", rs.getDouble("distancia_alta_intensidade"));
                indicadores.addProperty("teste_cooper", rs.getDouble("teste_cooper"));

                avaliacao.addProperty("nota_media", rs.getDouble("nota_media"));

                JsonArray recomendacoes = buscarSugestoes(conexao, rs.getInt("id"));

                avaliacao.add("recomendacoes", recomendacoes);
                avaliacao.addProperty("metodologia", "Análise baseada nos dados de desempenho armazenados.");

                adicionarAtributoSalvo(
                        avaliacao,
                        "velocidade",
                        rs.getDouble("nota_velocidade"),
                        rs.getString("justificativa_velocidade")
                );

                adicionarAtributoSalvo(
                        avaliacao,
                        "finalizacao",
                        rs.getDouble("nota_finalizacao"),
                        rs.getString("justificativa_finalizacao")
                );

                adicionarAtributoSalvo(
                        avaliacao,
                        "drible",
                        rs.getDouble("nota_drible"),
                        rs.getString("justificativa_drible")
                );

                adicionarAtributoSalvo(
                        avaliacao,
                        "passe",
                        rs.getDouble("nota_passe"),
                        rs.getString("justificativa_passe")
                );

                adicionarAtributoSalvo(
                        avaliacao,
                        "resistencia",
                        rs.getDouble("nota_resistencia"),
                        rs.getString("justificativa_resistencia")
                );

                periodo.addProperty("inicio", "--");
                periodo.addProperty("fim", "--");

                dados.add("atleta", atleta);
                dados.add("periodo", periodo);
                dados.add("estatisticas", estatisticas);
                dados.add("indicadores", indicadores);
                dados.add("avaliacao_ia", avaliacao);
                dados.add("avaliacoes_ia", avaliacao);

                resposta.addProperty("sucesso", true);
                resposta.add("dados", dados);

                return resposta;
            }
        }
    }

    private void adicionarAtributoSalvo(
            JsonObject avaliacao,
            String atributo,
            double nota,
            String justificativa
    ) {

        JsonObject dadosAtributo = new JsonObject();

        dadosAtributo.addProperty("nota", nota);
        dadosAtributo.addProperty(
                "justificativa",
                justificativa == null || justificativa.isBlank()
                        ? "Justificativa não disponível."
                        : justificativa
        );

        avaliacao.add(atributo, dadosAtributo);
    }

    private JsonArray buscarSugestoes(Connection conexao, int analiseId) throws SQLException {

        String sql = """
            SELECT categoria, sugestao
            FROM SugestoesDesempenho
            WHERE analise_id = ?
            ORDER BY id
            """;

        JsonArray sugestoes = new JsonArray();

        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {

            stmt.setInt(1, analiseId);

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    JsonObject sugestao = new JsonObject();

                    sugestao.addProperty("atributo", rs.getString("categoria"));
                    sugestao.addProperty("recomendacao", rs.getString("sugestao"));
                    sugestao.addProperty("objetivo", "");

                    sugestoes.add(sugestao);
                }
            }
        }

        return sugestoes;
    }
}
