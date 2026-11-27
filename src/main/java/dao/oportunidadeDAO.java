package dao;

import connection.ConnectionFactory;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import models.oportunidadeModel;

public class oportunidadeDAO {

    public Long cadastrar(oportunidadeModel oportunidade) throws SQLException {
        return cadastrar(oportunidade, null);
    }

    public Long cadastrar(
            oportunidadeModel oportunidade,
            Long atletaDestinatarioId) throws SQLException {

        try (Connection conn = ConnectionFactory.getConnection()) {
            if (conn == null) {
                throw new SQLException("Não foi possível conectar ao banco de dados.");
            }
            return inserirOportunidade(conn, oportunidade, atletaDestinatarioId);
        }
    }

    public Long cadastrarPropostaDirecionada(
            oportunidadeModel oportunidade,
            Long atletaDestinatarioId) throws SQLException {

        if (atletaDestinatarioId == null || atletaDestinatarioId <= 0) {
            throw new IllegalArgumentException("Atleta destinatário inválido.");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            if (conn == null) {
                throw new SQLException("Não foi possível conectar ao banco de dados.");
            }

            boolean autoCommitOriginal = conn.getAutoCommit();
            conn.setAutoCommit(false);

            try {
                Long oportunidadeId = inserirOportunidade(
                        conn, oportunidade, atletaDestinatarioId);

                String sqlInscricao = "INSERT INTO inscricao_oportunidade ("
                        + "oportunidade_id, atleta_id, status_candidatura, "
                        + "status_resposta_proposta, data_inscricao"
                        + ") VALUES (?, ?, 'INSCRICAO_REALIZADA', 'PENDENTE', CURRENT_TIMESTAMP())";

                try (PreparedStatement stmt = conn.prepareStatement(sqlInscricao)) {
                    stmt.setLong(1, oportunidadeId);
                    stmt.setLong(2, atletaDestinatarioId);
                    stmt.executeUpdate();
                }

                conn.commit();
                return oportunidadeId;

            } catch (SQLException | RuntimeException ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(autoCommitOriginal);
            }
        }
    }


    private Long inserirOportunidade(
            Connection conn,
            oportunidadeModel oportunidade,
            Long atletaDestinatarioId) throws SQLException {

        String sql = "INSERT INTO oportunidade ("
                + "clube_id, atleta_destinatario_id, titulo, descricao, "
                + "objetivo, posicoes_procuradas, idade_minima, idade_maxima, "
                + "local_realizacao, data_publicacao, prazo_inscricao, "
                + "data_hora_avaliacao, requisitos, status_oportunidade"
                + ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement stmt = conn.prepareStatement(
                sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setLong(1, oportunidade.getClubeId());

            if (atletaDestinatarioId != null) {
                stmt.setLong(2, atletaDestinatarioId);
            } else {
                stmt.setNull(2, java.sql.Types.INTEGER);
            }

            stmt.setString(3, oportunidade.getTitulo());
            stmt.setString(4, oportunidade.getDescricao());
            stmt.setString(5, oportunidade.getObjetivo());
            stmt.setString(6, oportunidade.getPosicoesProcuradas());

            if (oportunidade.getIdadeMinima() == null) {
                stmt.setNull(7, java.sql.Types.INTEGER);
            } else {
                stmt.setInt(7, oportunidade.getIdadeMinima());
            }

            if (oportunidade.getIdadeMaxima() == null) {
                stmt.setNull(8, java.sql.Types.INTEGER);
            } else {
                stmt.setInt(8, oportunidade.getIdadeMaxima());
            }

            stmt.setString(9, oportunidade.getLocalRealizacao());

            Timestamp publicacao = oportunidade.getDataPublicacao() != null
                    ? Timestamp.valueOf(oportunidade.getDataPublicacao())
                    : new Timestamp(System.currentTimeMillis());
            stmt.setTimestamp(10, publicacao);

            if (oportunidade.getPrazoInscricao() != null) {
                stmt.setDate(11, Date.valueOf(oportunidade.getPrazoInscricao()));
            } else {
                stmt.setNull(11, java.sql.Types.DATE);
            }

            if (oportunidade.getDataHoraAvaliacao() != null) {
                stmt.setTimestamp(12,
                        Timestamp.valueOf(oportunidade.getDataHoraAvaliacao()));
            } else {
                stmt.setNull(12, java.sql.Types.TIMESTAMP);
            }

            stmt.setString(13, oportunidade.getRequisitos());
            stmt.setString(14, oportunidade.getStatusOportunidade() != null
                    ? oportunidade.getStatusOportunidade() : "ABERTA");

            stmt.executeUpdate();

            try (ResultSet keys = stmt.getGeneratedKeys()) {
                if (keys.next()) {
                    Long idGerado = keys.getLong(1);
                    oportunidade.setId(idGerado);
                    return idGerado;
                }
            }
        }
        throw new SQLException("Não foi possível obter o ID da oportunidade cadastrada.");
    }

    public List<Map<String, Object>> listarAtletasParaClube(
            String pesquisa) throws SQLException {

        String sql = "SELECT id, nome, posicao_principal, "
                + "posicao_secundaria, categoria, cidade, estado, "
                + "data_nascimento, nivel_atual, altura "
                + "FROM Atletas "
                + "WHERE (? IS NULL OR nome LIKE ? "
                + "OR posicao_principal LIKE ? "
                + "OR posicao_secundaria LIKE ? "
                + "OR categoria LIKE ? OR nivel_atual LIKE ? "
                + "OR cidade LIKE ? OR estado LIKE ?) "
                + "ORDER BY nome";

        List<Map<String, Object>> atletas = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            String busca = pesquisa == null || pesquisa.trim().isEmpty()
                    ? null
                    : pesquisa.trim();

            String termo = busca == null ? null : "%" + busca + "%";
            stmt.setString(1, busca);
            for (int i = 2; i <= 8; i++) {
                stmt.setString(i, termo);
            }

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    Map<String, Object> atleta = new HashMap<>();

                    atleta.put("id", rs.getLong("id"));
                    atleta.put("nome", rs.getString("nome"));
                    atleta.put("posicaoPrincipal",
                            rs.getString("posicao_principal"));
                    atleta.put("posicaoSecundaria",
                            rs.getString("posicao_secundaria"));
                    atleta.put("categoria", rs.getString("categoria"));
                    atleta.put("cidade", rs.getString("cidade"));
                    atleta.put("estado", rs.getString("estado"));
                    atleta.put("nivelAtual", rs.getString("nivel_atual"));
                    atleta.put("altura", rs.getBigDecimal("altura"));

                    Date nascimento = rs.getDate("data_nascimento");

                    if (nascimento != null) {
                        LocalDate dataNascimento = nascimento.toLocalDate();

                        atleta.put("dataNascimento",
                                dataNascimento.toString());

                        atleta.put("idade",
                                Period.between(
                                        dataNascimento,
                                        LocalDate.now()
                                ).getYears());
                    } else {
                        atleta.put("dataNascimento", null);
                        atleta.put("idade", null);
                    }

                    atletas.add(atleta);
                }
            }
        }

        return atletas;
    }

    public List<oportunidadeModel> listarDisponiveisParaAtleta(
            Long atletaId) throws SQLException {

        String sql = "SELECT o.*, "
                + "c.nome_clube AS nome_clube, "
                + "CONCAT_WS(' - ', c.cidade, c.estado) "
                + "AS informacoes_clube, "
                + "io.status_candidatura "
                + "FROM oportunidade o "
                + "INNER JOIN Clubes c ON c.id = o.clube_id "
                + "LEFT JOIN inscricao_oportunidade io "
                + "ON io.oportunidade_id = o.id "
                + "AND io.atleta_id = ? "
                + "WHERE o.status_oportunidade = 'ABERTA' "
                + "AND (o.prazo_inscricao IS NULL "
                + "OR o.prazo_inscricao >= CURRENT_DATE()) "
                + "AND (o.atleta_destinatario_id IS NULL "
                + "OR o.atleta_destinatario_id = ?) "
                + "ORDER BY o.data_publicacao DESC";

        List<oportunidadeModel> lista = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, atletaId);
            stmt.setLong(2, atletaId);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    lista.add(mapearResultSet(rs));
                }
            }
        }

        return lista;
    }

    public oportunidadeModel buscarPorIdParaAtleta(
            Long oportunidadeId,
            Long atletaId) throws SQLException {

        String sql = "SELECT o.*, "
                + "c.nome_clube AS nome_clube, "
                + "CONCAT_WS(' - ', c.cidade, c.estado) "
                + "AS informacoes_clube, "
                + "io.status_candidatura "
                + "FROM oportunidade o "
                + "INNER JOIN Clubes c ON c.id = o.clube_id "
                + "LEFT JOIN inscricao_oportunidade io "
                + "ON io.oportunidade_id = o.id "
                + "AND io.atleta_id = ? "
                + "WHERE o.id = ? "
                + "AND (o.atleta_destinatario_id IS NULL "
                + "OR o.atleta_destinatario_id = ?) "
                + "AND (o.status_oportunidade = 'ABERTA' "
                + "OR io.atleta_id IS NOT NULL)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, atletaId);
            stmt.setLong(2, oportunidadeId);
            stmt.setLong(3, atletaId);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapearResultSet(rs);
                }
            }
        }

        return null;
    }

    public String[] buscarPerfilAtletaParaCompatibilidade(
            Long atletaId) throws SQLException {

        String sql = "SELECT posicao_principal, data_nascimento, "
                + "cidade, estado "
                + "FROM Atletas WHERE id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, atletaId);

            try (ResultSet rs = stmt.executeQuery()) {

                if (rs.next()) {

                    String posicao = rs.getString("posicao_principal");

                    Date nascimento = rs.getDate("data_nascimento");

                    String idade = nascimento != null
                            ? String.valueOf(
                                    Period.between(
                                            nascimento.toLocalDate(),
                                            LocalDate.now()
                                    ).getYears())
                            : null;

                    String cidade = rs.getString("cidade");
                    String estado = rs.getString("estado");

                    String localizacao = cidade != null && estado != null
                            ? cidade + " - " + estado
                            : cidade != null
                                    ? cidade
                                    : estado;

                    return new String[]{
                        posicao,
                        idade,
                        localizacao
                    };
                }
            }
        }

        return new String[]{null, null, null};
    }

    private oportunidadeModel mapearResultSet(ResultSet rs)
            throws SQLException {

        oportunidadeModel model = new oportunidadeModel();

        model.setId(rs.getLong("id"));
        model.setClubeId(rs.getLong("clube_id"));
        model.setNomeClube(rs.getString("nome_clube"));
        model.setInformacoesClube(rs.getString("informacoes_clube"));
        model.setTitulo(rs.getString("titulo"));
        model.setDescricao(rs.getString("descricao"));
        model.setObjetivo(rs.getString("objetivo"));
        model.setPosicoesProcuradas(
                rs.getString("posicoes_procuradas"));
        int idadeMinima = rs.getInt("idade_minima");
        model.setIdadeMinima(rs.wasNull() ? null : idadeMinima);
        int idadeMaxima = rs.getInt("idade_maxima");
        model.setIdadeMaxima(rs.wasNull() ? null : idadeMaxima);
        model.setLocalRealizacao(rs.getString("local_realizacao"));

        Timestamp publicacao = rs.getTimestamp("data_publicacao");

        if (publicacao != null) {
            model.setDataPublicacao(publicacao.toLocalDateTime());
        }

        Date prazo = rs.getDate("prazo_inscricao");

        if (prazo != null) {
            model.setPrazoInscricao(prazo.toLocalDate());
        }

        Timestamp avaliacao = rs.getTimestamp("data_hora_avaliacao");

        if (avaliacao != null) {
            model.setDataHoraAvaliacao(
                    avaliacao.toLocalDateTime());
        }

        model.setRequisitos(rs.getString("requisitos"));
        model.setStatusOportunidade(
                rs.getString("status_oportunidade"));
        model.setStatusCandidaturaAtleta(
                rs.getString("status_candidatura"));

        return model;
    }
}
