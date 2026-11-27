package dao;

import connection.ConnectionFactory;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import models.inscricaoModel;

public class inscricaoOportunidadeDAO {

    public boolean existeInscricao(
            Long oportunidadeId,
            Long atletaId) throws SQLException {

        String sql = "SELECT 1 FROM inscricao_oportunidade "
                + "WHERE oportunidade_id = ? AND atleta_id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, oportunidadeId);
            stmt.setLong(2, atletaId);

            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next();
            }
        }
    }

    public void inscreverAtleta(
            Long oportunidadeId,
            Long atletaId) throws SQLException {

        String sql = "INSERT INTO inscricao_oportunidade ("
                + "oportunidade_id, atleta_id, status_candidatura, "
                + "status_resposta_proposta, data_inscricao"
                + ") VALUES (?, ?, 'INSCRICAO_REALIZADA', "
                + "'NAO_APLICAVEL', CURRENT_TIMESTAMP())";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, oportunidadeId);
            stmt.setLong(2, atletaId);

            stmt.executeUpdate();
        }
    }

    public boolean enviarPropostaParaAtleta(
            Long oportunidadeId,
            Long atletaId) throws SQLException {

        String sql = "INSERT INTO inscricao_oportunidade ("
                + "oportunidade_id, atleta_id, status_candidatura, "
                + "status_resposta_proposta, data_inscricao"
                + ") VALUES (?, ?, 'INSCRICAO_REALIZADA', "
                + "'PENDENTE', CURRENT_TIMESTAMP())";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, oportunidadeId);
            stmt.setLong(2, atletaId);

            return stmt.executeUpdate() > 0;
        }
    }

    public List<Map<String, Object>> listarPropostasRecebidas(
            Long atletaId) throws SQLException {

        String sql = "SELECT io.id AS inscricao_id, "
                + "io.oportunidade_id, io.atleta_id, "
                + "io.status_candidatura, "
                + "io.status_resposta_proposta, "
                + "io.observacao_clube, "
                + "io.data_inscricao, io.data_atualizacao, "
                + "o.titulo, o.descricao, o.objetivo, "
                + "o.posicoes_procuradas, o.idade_minima, "
                + "o.idade_maxima, o.local_realizacao, "
                + "o.prazo_inscricao, o.data_hora_avaliacao, "
                + "o.requisitos, o.status_oportunidade, "
                + "c.id AS clube_id, c.nome_clube, "
                + "c.divisao, c.cidade AS cidade_clube, "
                + "c.estado AS estado_clube "
                + "FROM inscricao_oportunidade io "
                + "INNER JOIN oportunidade o "
                + "ON o.id = io.oportunidade_id "
                + "INNER JOIN Clubes c "
                + "ON c.id = o.clube_id "
                + "WHERE io.atleta_id = ? "
                + "AND io.status_resposta_proposta IN "
                + "('PENDENTE', 'ACEITA', 'RECUSADA') "
                + "AND o.atleta_destinatario_id = ? "
                + "ORDER BY io.data_inscricao DESC";

        List<Map<String, Object>> propostas = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, atletaId);
            stmt.setLong(2, atletaId);

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    Map<String, Object> proposta = new HashMap<>();

                    proposta.put("inscricaoId",
                            rs.getLong("inscricao_id"));
                    proposta.put("oportunidadeId",
                            rs.getLong("oportunidade_id"));
                    proposta.put("atletaId",
                            rs.getLong("atleta_id"));

                    proposta.put("statusCandidatura",
                            rs.getString("status_candidatura"));
                    proposta.put("statusResposta",
                            rs.getString("status_resposta_proposta"));
                    proposta.put("observacaoClube",
                            rs.getString("observacao_clube"));

                    proposta.put("titulo",
                            rs.getString("titulo"));
                    proposta.put("descricao",
                            rs.getString("descricao"));
                    proposta.put("objetivo",
                            rs.getString("objetivo"));

                    proposta.put("posicoesProcuradas",
                            rs.getString("posicoes_procuradas"));
                    proposta.put("idadeMinima",
                            rs.getInt("idade_minima"));
                    proposta.put("idadeMaxima",
                            rs.getInt("idade_maxima"));

                    proposta.put("localRealizacao",
                            rs.getString("local_realizacao"));
                    proposta.put("requisitos",
                            rs.getString("requisitos"));
                    proposta.put("statusOportunidade",
                            rs.getString("status_oportunidade"));

                    proposta.put("prazoInscricao",
                            rs.getDate("prazo_inscricao") != null
                                    ? rs.getDate("prazo_inscricao").toString()
                                    : null);

                    proposta.put("dataHoraAvaliacao",
                            rs.getTimestamp("data_hora_avaliacao") != null
                                    ? rs.getTimestamp(
                                            "data_hora_avaliacao").toString()
                                    : null);

                    proposta.put("nomeClube",
                            rs.getString("nome_clube"));
                    proposta.put("clubeId",
                            rs.getLong("clube_id"));
                    proposta.put("divisao",
                            rs.getString("divisao"));
                    proposta.put("cidadeClube",
                            rs.getString("cidade_clube"));
                    proposta.put("estadoClube",
                            rs.getString("estado_clube"));

                    Timestamp dataInscricao =
                            rs.getTimestamp("data_inscricao");

                    proposta.put("dataInscricao",
                            dataInscricao != null
                                    ? dataInscricao.toString()
                                    : null);

                    Timestamp dataAtualizacao =
                            rs.getTimestamp("data_atualizacao");

                    proposta.put("dataAtualizacao",
                            dataAtualizacao != null
                                    ? dataAtualizacao.toString()
                                    : null);

                    propostas.add(proposta);
                }
            }
        }

        return propostas;
    }

    public boolean responderProposta(
            Long inscricaoId,
            Long atletaId,
            String resposta) throws SQLException {

        if (!"ACEITA".equals(resposta)
                && !"RECUSADA".equals(resposta)) {

            throw new IllegalArgumentException(
                    "Resposta inválida para proposta.");
        }

        String sql = "UPDATE inscricao_oportunidade io "
                + "INNER JOIN oportunidade o "
                + "ON o.id = io.oportunidade_id "
                + "SET io.status_resposta_proposta = ?, "
                + "io.data_atualizacao = CURRENT_TIMESTAMP() "
                + "WHERE io.id = ? "
                + "AND io.atleta_id = ? "
                + "AND o.atleta_destinatario_id = ? "
                + "AND io.status_resposta_proposta = 'PENDENTE' "
                + "AND o.status_oportunidade = 'ABERTA'";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, resposta);
            stmt.setLong(2, inscricaoId);
            stmt.setLong(3, atletaId);
            stmt.setLong(4, atletaId);

            return stmt.executeUpdate() > 0;
        }
    }

    public boolean atualizarStatusCandidatura(
            Long inscricaoId,
            Long clubeId,
            String novoStatus,
            String observacao) throws SQLException {

        String sql = "UPDATE inscricao_oportunidade io "
                + "INNER JOIN oportunidade o "
                + "ON o.id = io.oportunidade_id "
                + "SET io.status_candidatura = ?, "
                + "io.observacao_clube = ?, "
                + "io.data_atualizacao = CURRENT_TIMESTAMP() "
                + "WHERE io.id = ? AND o.clube_id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, novoStatus);
            stmt.setString(2, observacao);
            stmt.setLong(3, inscricaoId);
            stmt.setLong(4, clubeId);

            return stmt.executeUpdate() > 0;
        }
    }

    public List<inscricaoModel> listarHistoricoPorAtleta(
            Long atletaId) throws SQLException {

        String sql = "SELECT io.*, "
                + "o.titulo AS titulo_oportunidade, "
                + "o.local_realizacao, "
                + "o.status_oportunidade, "
                + "c.nome_clube AS nome_clube "
                + "FROM inscricao_oportunidade io "
                + "INNER JOIN oportunidade o "
                + "ON o.id = io.oportunidade_id "
                + "INNER JOIN Clubes c "
                + "ON c.id = o.clube_id "
                + "WHERE io.atleta_id = ? "
                + "ORDER BY io.data_atualizacao DESC";

        List<inscricaoModel> historico = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, atletaId);

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    inscricaoModel item = new inscricaoModel();

                    item.setId(rs.getLong("id"));
                    item.setOportunidadeId(
                            rs.getLong("oportunidade_id"));
                    item.setAtletaId(rs.getLong("atleta_id"));
                    item.setTituloOportunidade(
                            rs.getString("titulo_oportunidade"));
                    item.setNomeClube(
                            rs.getString("nome_clube"));
                    item.setLocalRealizacao(
                            rs.getString("local_realizacao"));
                    item.setStatusCandidatura(
                            rs.getString("status_candidatura"));
                    item.setStatusOportunidade(
                            rs.getString("status_oportunidade"));
                    item.setObservacaoClube(
                            rs.getString("observacao_clube"));

                    Timestamp dataInscricao =
                            rs.getTimestamp("data_inscricao");

                    if (dataInscricao != null) {
                        item.setDataInscricao(
                                dataInscricao.toLocalDateTime());
                    }

                    Timestamp dataAtualizacao =
                            rs.getTimestamp("data_atualizacao");

                    if (dataAtualizacao != null) {
                        item.setDataAtualizacao(
                                dataAtualizacao.toLocalDateTime());
                    }

                    historico.add(item);
                }
            }
        }

        return historico;
    }
}