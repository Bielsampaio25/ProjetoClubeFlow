package dao;

import connection.ConnectionFactory;
import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.*;

public class gamificacaoDAO {

    private Map<String, Object> mapa(Object... valores) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < valores.length; i += 2) {
            m.put(String.valueOf(valores[i]), valores[i + 1]);
        }
        return m;
    }

    private int buscarIdAtleta(Connection con, String email) throws SQLException {
        String sql = "SELECT id FROM Atletas WHERE email = ?";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getInt("id");
            }
        }
        return -1;
    }

    private void garantirGamificacao(Connection con, int atletaId) throws SQLException {
        String sql = "INSERT IGNORE INTO GamificacaoAtletas (id_atleta, xp_total, nivel) VALUES (?, 0, 1)";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, atletaId);
            ps.executeUpdate();
        }
    }

    private String obterPeriodo(String frequencia) {
        LocalDate hoje = LocalDate.now();

        switch (frequencia) {
            case "DIARIO":
                return hoje.toString();

            case "SEMANAL":
                WeekFields wf = WeekFields.ISO;
                return hoje.get(wf.weekBasedYear()) + "-W"
                        + String.format("%02d", hoje.get(wf.weekOfWeekBasedYear()));

            default:
                return "PERMANENTE";
        }
    }

    private void garantirProgresso(
            Connection con,
            int atletaId,
            int desafioId,
            String periodo
    ) throws SQLException {

        String sql = "INSERT IGNORE INTO ProgressoDesafios "
                + "(id_atleta, id_desafio, periodo, progresso, concluido, recompensa_recebida) "
                + "VALUES (?, ?, ?, 0, FALSE, FALSE)";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, atletaId);
            ps.setInt(2, desafioId);
            ps.setString(3, periodo);
            ps.executeUpdate();
        }
    }

    public Map<String, Object> buscarDashboard(String email) throws SQLException {

        Map<String, Object> dashboard = new LinkedHashMap<>();

        try (Connection con = ConnectionFactory.getConnection()) {

            int atletaId = buscarIdAtleta(con, email);

            if (atletaId == -1) {
                dashboard.put("sucesso", false);
                dashboard.put("mensagem", "Atleta não encontrado.");
                return dashboard;
            }

            garantirGamificacao(con, atletaId);

            String sqlAtleta = "SELECT a.nome, a.foto_perfil, g.xp_total, g.nivel, "
                    + "g.desafios_concluidos "
                    + "FROM Atletas a JOIN GamificacaoAtletas g ON a.id = g.id_atleta "
                    + "WHERE a.id = ?";

            try (PreparedStatement ps = con.prepareStatement(sqlAtleta)) {
                ps.setInt(1, atletaId);

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        int xp = rs.getInt("xp_total");
                        int nivel = rs.getInt("nivel");
                        int xpNivel = xp % 1000;

                        dashboard.put("nome", rs.getString("nome"));
                        dashboard.put("fotoPerfil", rs.getString("foto_perfil"));
                        dashboard.put("xpTotal", xp);
                        dashboard.put("nivel", nivel);
                        dashboard.put("xpNivel", xpNivel);
                        dashboard.put("xpProximoNivel", 1000);
                        dashboard.put("xpRestante", 1000 - xpNivel);
                        dashboard.put("porcentagem", xpNivel / 10);
                        dashboard.put("desafiosConcluidos", rs.getInt("desafios_concluidos"));
                    }
                }
            }

            List<Map<String, Object>> desafios = new ArrayList<>();

            String sqlDesafios = "SELECT * FROM Desafios WHERE ativo = TRUE ORDER BY id";

            try (PreparedStatement ps = con.prepareStatement(sqlDesafios);
                 ResultSet rs = ps.executeQuery()) {

                while (rs.next()) {

                    int desafioId = rs.getInt("id");
                    String frequencia = rs.getString("frequencia");
                    String periodo = obterPeriodo(frequencia);

                    garantirProgresso(con, atletaId, desafioId, periodo);

                    String sqlProgresso = "SELECT progresso, concluido, recompensa_recebida "
                            + "FROM ProgressoDesafios "
                            + "WHERE id_atleta = ? AND id_desafio = ? AND periodo = ?";

                    int progresso = 0;
                    boolean concluido = false;
                    boolean recompensaRecebida = false;

                    try (PreparedStatement pp = con.prepareStatement(sqlProgresso)) {
                        pp.setInt(1, atletaId);
                        pp.setInt(2, desafioId);
                        pp.setString(3, periodo);

                        try (ResultSet rp = pp.executeQuery()) {
                            if (rp.next()) {
                                progresso = rp.getInt("progresso");
                                concluido = rp.getBoolean("concluido");
                                recompensaRecebida = rp.getBoolean("recompensa_recebida");
                            }
                        }
                    }

                    int objetivo = rs.getInt("objetivo");

                    desafios.add(mapa(
                            "id", desafioId,
                            "titulo", rs.getString("titulo"),
                            "descricao", rs.getString("descricao"),
                            "tipoAcao", rs.getString("tipo_acao"),
                            "frequencia", frequencia,
                            "objetivo", objetivo,
                            "progresso", progresso,
                            "xp", rs.getInt("xp_recompensa"),
                            "concluido", concluido,
                            "recompensaRecebida", recompensaRecebida,
                            "porcentagem", objetivo > 0
                                    ? Math.min(100, (progresso * 100) / objetivo)
                                    : 0
                    ));
                }
            }

            dashboard.put("desafios", desafios);
            dashboard.put("sucesso", true);
        }

        return dashboard;
    }

    public Map<String, Object> registrarEvento(
            String email,
            String tipoAcao,
            String eventoId
    ) throws SQLException {

        Map<String, Object> resposta = new LinkedHashMap<>();

        try (Connection con = ConnectionFactory.getConnection()) {

            con.setAutoCommit(false);

            try {

                int atletaId = buscarIdAtleta(con, email);

                if (atletaId == -1) {
                    con.rollback();
                    resposta.put("sucesso", false);
                    resposta.put("mensagem", "Atleta não encontrado.");
                    return resposta;
                }

                garantirGamificacao(con, atletaId);

                String sqlHistorico = "INSERT INTO HistoricoGamificacao "
                        + "(id_atleta, evento_id, tipo_acao, xp_ganho) "
                        + "VALUES (?, ?, ?, 0)";

                try (PreparedStatement ps = con.prepareStatement(sqlHistorico)) {
                    ps.setInt(1, atletaId);
                    ps.setString(2, eventoId);
                    ps.setString(3, tipoAcao);
                    ps.executeUpdate();
                }

                int xpGanho = 0;
                int desafiosFinalizados = 0;

                String sqlDesafios = "SELECT id, objetivo, xp_recompensa, frequencia "
                        + "FROM Desafios WHERE ativo = TRUE AND tipo_acao = ?";

                try (PreparedStatement ps = con.prepareStatement(sqlDesafios)) {
                    ps.setString(1, tipoAcao);

                    try (ResultSet rs = ps.executeQuery()) {

                        while (rs.next()) {

                            int desafioId = rs.getInt("id");
                            int objetivo = rs.getInt("objetivo");
                            int recompensa = rs.getInt("xp_recompensa");
                            String periodo = obterPeriodo(rs.getString("frequencia"));

                            garantirProgresso(con, atletaId, desafioId, periodo);

                            String sqlAtualizar = "SELECT progresso, concluido, recompensa_recebida "
                                    + "FROM ProgressoDesafios "
                                    + "WHERE id_atleta = ? AND id_desafio = ? AND periodo = ? "
                                    + "FOR UPDATE";

                            int progresso;
                            boolean concluido;
                            boolean recompensaRecebida;

                            try (PreparedStatement pp = con.prepareStatement(sqlAtualizar)) {
                                pp.setInt(1, atletaId);
                                pp.setInt(2, desafioId);
                                pp.setString(3, periodo);

                                try (ResultSet rp = pp.executeQuery()) {
                                    rp.next();
                                    progresso = rp.getInt("progresso");
                                    concluido = rp.getBoolean("concluido");
                                    recompensaRecebida = rp.getBoolean("recompensa_recebida");
                                }
                            }

                            if (concluido) continue;

                            progresso++;

                            if (progresso >= objetivo) {
                                progresso = objetivo;
                                concluido = true;
                            }

                            String sqlUpdate = "UPDATE ProgressoDesafios "
                                    + "SET progresso = ?, concluido = ? "
                                    + "WHERE id_atleta = ? AND id_desafio = ? AND periodo = ?";

                            try (PreparedStatement pu = con.prepareStatement(sqlUpdate)) {
                                pu.setInt(1, progresso);
                                pu.setBoolean(2, concluido);
                                pu.setInt(3, atletaId);
                                pu.setInt(4, desafioId);
                                pu.setString(5, periodo);
                                pu.executeUpdate();
                            }

                            if (concluido && !recompensaRecebida) {

                                String sqlRecompensa = "UPDATE ProgressoDesafios "
                                        + "SET recompensa_recebida = TRUE "
                                        + "WHERE id_atleta = ? AND id_desafio = ? AND periodo = ?";

                                try (PreparedStatement pr = con.prepareStatement(sqlRecompensa)) {
                                    pr.setInt(1, atletaId);
                                    pr.setInt(2, desafioId);
                                    pr.setString(3, periodo);
                                    pr.executeUpdate();
                                }

                                xpGanho += recompensa;
                                desafiosFinalizados++;
                            }
                        }
                    }
                }

                if (xpGanho > 0) {
                    String sqlXP = "UPDATE GamificacaoAtletas "
                            + "SET xp_total = xp_total + ?, "
                            + "desafios_concluidos = desafios_concluidos + ? "
                            + "WHERE id_atleta = ?";

                    try (PreparedStatement ps = con.prepareStatement(sqlXP)) {
                        ps.setInt(1, xpGanho);
                        ps.setInt(2, desafiosFinalizados);
                        ps.setInt(3, atletaId);
                        ps.executeUpdate();
                    }
                }

                String sqlNivel = "UPDATE GamificacaoAtletas "
                        + "SET nivel = FLOOR(xp_total / 1000) + 1 "
                        + "WHERE id_atleta = ?";

                try (PreparedStatement ps = con.prepareStatement(sqlNivel)) {
                    ps.setInt(1, atletaId);
                    ps.executeUpdate();
                }

                String sqlAtualizarHistorico = "UPDATE HistoricoGamificacao "
                        + "SET xp_ganho = ? WHERE id_atleta = ? AND evento_id = ?";

                try (PreparedStatement ps = con.prepareStatement(sqlAtualizarHistorico)) {
                    ps.setInt(1, xpGanho);
                    ps.setInt(2, atletaId);
                    ps.setString(3, eventoId);
                    ps.executeUpdate();
                }

                con.commit();

                resposta.put("sucesso", true);
                resposta.put("xpGanho", xpGanho);
                resposta.put("desafiosConcluidos", desafiosFinalizados);
                resposta.put("mensagem", xpGanho > 0
                        ? "Desafio concluído! Você recebeu " + xpGanho + " XP."
                        : "Progresso registrado!");

            } catch (SQLIntegrityConstraintViolationException e) {
                con.rollback();
                resposta.put("sucesso", false);
                resposta.put("duplicado", true);
                resposta.put("mensagem", "Este evento já foi registrado.");

            } catch (Exception e) {
                con.rollback();
                throw e;

            } finally {
                con.setAutoCommit(true);
            }
        }

        return resposta;
    }

    public List<Map<String, Object>> buscarRanking() throws SQLException {

        List<Map<String, Object>> ranking = new ArrayList<>();

        String sql = "SELECT a.id, a.nome, a.foto_perfil, g.xp_total, g.nivel "
                + "FROM Atletas a JOIN GamificacaoAtletas g ON a.id = g.id_atleta "
                + "ORDER BY g.xp_total DESC LIMIT 20";

        try (Connection con = ConnectionFactory.getConnection();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            int posicao = 1;

            while (rs.next()) {
                ranking.add(mapa(
                        "posicao", posicao++,
                        "id", rs.getInt("id"),
                        "nome", rs.getString("nome"),
                        "fotoPerfil", rs.getString("foto_perfil"),
                        "xp", rs.getInt("xp_total"),
                        "nivel", rs.getInt("nivel")
                ));
            }
        }

        return ranking;
    }
}