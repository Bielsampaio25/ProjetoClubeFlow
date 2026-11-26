package dao;

import connection.ConnectionFactory;
import java.sql.*;
import java.util.*;
import java.io.*;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class redeSocialDAO {

    public static class Midia {
        public byte[] arquivo;
        public String nome;
        public String mime;
        public String tipo;

        public Midia(byte[] arquivo, String nome, String mime) {
            this.arquivo = arquivo;
            this.nome = nome;
            this.mime = mime;
            this.tipo = mime != null && mime.startsWith("video/")
                    ? "VIDEO" : "FOTO";
        }
    }

    private Connection conectar() throws SQLException {
        return ConnectionFactory.getConnection();
    }

    // =========================================================
    // PERFIL SOCIAL
    // =========================================================

    private int obterPerfil(Connection conn, int idAtleta) throws SQLException {
        String sql = "SELECT id FROM Perfil_social_atleta WHERE id_atleta = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idAtleta);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }

        String inserir = """
            INSERT INTO Perfil_social_atleta
            (id_atleta,nome_usuario,bio,publicacoes,seguidores,seguindo)
            VALUES (?, ?, '', 0, 0, 0)
        """;

        try (PreparedStatement ps = conn.prepareStatement(
                inserir, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idAtleta);
            ps.setString(2, "atleta" + idAtleta);
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        }

        throw new SQLException("Não foi possível obter o perfil social.");
    }

    public int obterIdAtleta(String email) throws SQLException {
        String sql = "SELECT id FROM Atletas WHERE email = ?";

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, email);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }

        throw new SQLException("Atleta não encontrado.");
    }

    // =========================================================
    // FEED
    // =========================================================

    public List<Map<String, Object>> listarFeed(int idAtleta) throws SQLException {
        List<Map<String, Object>> feed = new ArrayList<>();

        String sql = """
            SELECT p.id, p.id_perfil, p.curtidas, p.qtd_comentarios,
                   p.data_publicacao, p.comentarios,
                   ps.nome_usuario, a.nome, a.foto_perfil,
                   a.id AS id_atleta,
                   EXISTS(
                       SELECT 1
                       FROM CurtidasPublicacao cp
                       WHERE cp.id_publicacao = p.id
                         AND cp.id_atleta = ?
                   ) AS curtido
            FROM Publicacoes p
            JOIN Perfil_social_atleta ps ON ps.id = p.id_perfil
            JOIN Atletas a ON a.id = ps.id_atleta
            ORDER BY p.data_publicacao DESC, p.id DESC
        """;

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, idAtleta);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> post = new LinkedHashMap<>();

                    post.put("id", rs.getInt("id"));
                    post.put("idAtleta", rs.getInt("id_atleta"));
                    post.put("nome", rs.getString("nome"));
                    post.put("usuario", rs.getString("nome_usuario"));
                    post.put("curtidas", rs.getInt("curtidas"));
                    post.put("comentarios", rs.getInt("qtd_comentarios"));
                    post.put("curtido", rs.getBoolean("curtido"));
                    post.put("data", rs.getTimestamp("data_publicacao"));
                    post.put("fotoPerfil", rs.getBytes("foto_perfil"));
                    post.put("texto", rs.getString("comentarios"));

                    post.put("midias", listarMidias(conn, rs.getInt("id")));

                    feed.add(post);
                }
            }
        }

        return feed;
    }

    private List<Map<String, Object>> listarMidias(
            Connection conn, int idPublicacao) throws SQLException {

        List<Map<String, Object>> midias = new ArrayList<>();

        String sql = """
            SELECT id, arquivo, nome_arquivo, mime_type, tipo
            FROM PublicacaoMidias
            WHERE id_publicacao = ?
            ORDER BY ordem, id
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> media = new LinkedHashMap<>();

                    media.put("id", rs.getInt("id"));
                    media.put("arquivo", rs.getBytes("arquivo"));
                    media.put("nome", rs.getString("nome_arquivo"));
                    media.put("mime", rs.getString("mime_type"));
                    media.put("tipo", rs.getString("tipo"));

                    midias.add(media);
                }
            }
        }

        return midias;
    }

    // =========================================================
    // PUBLICAR
    // =========================================================

    public int publicar(
            int idAtleta,
            String texto,
            List<Midia> midias) throws Exception {

        try (Connection conn = conectar()) {
            conn.setAutoCommit(false);

            try {
                int idPerfil = obterPerfil(conn, idAtleta);
                String tipoPublicacao = "TEXTO";

                if (midias != null && !midias.isEmpty()) {
                    tipoPublicacao = midias.stream()
                            .anyMatch(m -> "VIDEO".equals(m.tipo))
                            ? "VIDEO" : "FOTO";
                }

                String sql = """
                    INSERT INTO Publicacoes
                    (id_perfil,curtidas,qtd_comentarios,comentarios,
                     tipo_publicacao,data_publicacao)
                    VALUES (?,0,0,?,?,NOW())
                """;

                int idPublicacao;

                try (PreparedStatement ps = conn.prepareStatement(
                        sql, Statement.RETURN_GENERATED_KEYS)) {

                    ps.setInt(1, idPerfil);
                    ps.setString(2, texto == null ? "" : texto);
                    ps.setString(3, tipoPublicacao);

                    ps.executeUpdate();

                    try (ResultSet rs = ps.getGeneratedKeys()) {
                        if (!rs.next()) {
                            throw new SQLException("Erro ao criar publicação.");
                        }

                        idPublicacao = rs.getInt(1);
                    }
                }

                if (midias != null && !midias.isEmpty()) {
                    inserirMidias(conn, idPublicacao, midias);
                }

                atualizarContagemPublicacoes(conn, idPerfil);

                int totalVideos = contarVideos(conn, idAtleta);
                int totalFotos = contarFotos(conn, idAtleta);

                registrarDesafio(
                        conn, idAtleta,
                        "Postar 3 vídeos",
                        totalVideos
                );

                registrarDesafio(
                        conn, idAtleta,
                        "Postar uma foto em campo",
                        totalFotos
                );

                conn.commit();

                return idPublicacao;

            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private void inserirMidias(
            Connection conn,
            int idPublicacao,
            List<Midia> midias) throws SQLException {

        String sql = """
            INSERT INTO PublicacaoMidias
            (id_publicacao,arquivo,nome_arquivo,mime_type,tipo,ordem)
            VALUES (?,?,?,?,?,?)
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            int ordem = 0;

            for (Midia media : midias) {
                if (media == null || media.arquivo == null
                        || media.arquivo.length == 0) {
                    continue;
                }

                ps.setInt(1, idPublicacao);
                ps.setBytes(2, media.arquivo);
                ps.setString(3, media.nome);
                ps.setString(4, media.mime);
                ps.setString(5, media.tipo);
                ps.setInt(6, ordem++);

                ps.addBatch();
            }

            ps.executeBatch();
        }
    }

    private void atualizarContagemPublicacoes(
            Connection conn, int idPerfil) throws SQLException {

        String sql = """
            UPDATE Perfil_social_atleta
            SET publicacoes = (
                SELECT COUNT(*)
                FROM Publicacoes
                WHERE id_perfil = ?
            )
            WHERE id = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPerfil);
            ps.setInt(2, idPerfil);
            ps.executeUpdate();
        }
    }

    // =========================================================
    // CONTAGEM DE VÍDEOS E FOTOS
    // =========================================================

    private int contarVideos(Connection conn, int idAtleta) throws SQLException {
        String sql = """
            SELECT COUNT(*)
            FROM PublicacaoMidias m
            JOIN Publicacoes p ON p.id = m.id_publicacao
            JOIN Perfil_social_atleta ps ON ps.id = p.id_perfil
            WHERE ps.id_atleta = ?
              AND m.tipo = 'VIDEO'
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idAtleta);

            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    private int contarFotos(Connection conn, int idAtleta) throws SQLException {
        String sql = """
            SELECT COUNT(*)
            FROM PublicacaoMidias m
            JOIN Publicacoes p ON p.id = m.id_publicacao
            JOIN Perfil_social_atleta ps ON ps.id = p.id_perfil
            WHERE ps.id_atleta = ?
              AND m.tipo = 'FOTO'
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idAtleta);

            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    // =========================================================
    // GAMIFICAÇÃO - PROGRESSO AUTOMÁTICO DOS DESAFIOS
    // =========================================================

    private void registrarDesafio(
            Connection conn,
            int idAtleta,
            String titulo,
            int progressoAtual) throws SQLException {

        String sqlDesafio = """
            SELECT id, objetivo, xp_recompensa
            FROM Desafios
            WHERE titulo = ? AND ativo = TRUE
            LIMIT 1
        """;

        try (PreparedStatement ps = conn.prepareStatement(sqlDesafio)) {
            ps.setString(1, titulo);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return;
                }

                int idDesafio = rs.getInt("id");
                int objetivo = rs.getInt("objetivo");
                int xp = rs.getInt("xp_recompensa");

                inserirProgressoDesafio(conn, idAtleta, idDesafio);

                boolean concluido = progressoAtual >= objetivo;
                int progresso = Math.min(progressoAtual, objetivo);

                atualizarProgressoDesafio(
                        conn, idAtleta, idDesafio,
                        progresso, concluido
                );

                if (concluido) {
                    liberarXP(
                            conn, idAtleta,
                            idDesafio, titulo, xp
                    );
                }
            }
        }
    }

    private void inserirProgressoDesafio(
            Connection conn,
            int idAtleta,
            int idDesafio) throws SQLException {

        String sql = """
            INSERT IGNORE INTO ProgressoDesafios
            (id_atleta,id_desafio,periodo,progresso,
             concluido,recompensa_recebida)
            VALUES (?,?,'PERMANENTE',0,FALSE,FALSE)
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idAtleta);
            ps.setInt(2, idDesafio);
            ps.executeUpdate();
        }
    }

    private void atualizarProgressoDesafio(
            Connection conn,
            int idAtleta,
            int idDesafio,
            int progresso,
            boolean concluido) throws SQLException {

        String sql = """
            UPDATE ProgressoDesafios
            SET progresso = GREATEST(progresso, ?),
                concluido = ?,
                data_atualizacao = NOW()
            WHERE id_atleta = ?
              AND id_desafio = ?
              AND periodo = 'PERMANENTE'
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, progresso);
            ps.setBoolean(2, concluido);
            ps.setInt(3, idAtleta);
            ps.setInt(4, idDesafio);
            ps.executeUpdate();
        }
    }

    // =========================================================
    // LIBERAÇÃO DE XP
    // =========================================================

    private void liberarXP(
            Connection conn,
            int idAtleta,
            int idDesafio,
            String titulo,
            int xp) throws SQLException {

        String sqlProgresso = """
            SELECT recompensa_recebida
            FROM ProgressoDesafios
            WHERE id_atleta = ?
              AND id_desafio = ?
              AND periodo = 'PERMANENTE'
            FOR UPDATE
        """;

        try (PreparedStatement ps = conn.prepareStatement(sqlProgresso)) {
            ps.setInt(1, idAtleta);
            ps.setInt(2, idDesafio);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next() || rs.getBoolean("recompensa_recebida")) {
                    return;
                }
            }
        }

        String eventoId = "DESAFIO-" + idDesafio;

        String sqlHistorico = """
            INSERT IGNORE INTO HistoricoGamificacao
            (id_atleta,id_desafio,evento_id,tipo_acao,
             xp_ganho,data_evento)
            VALUES (?,?,?,?,?,NOW())
        """;

        try (PreparedStatement ps = conn.prepareStatement(sqlHistorico)) {
            ps.setInt(1, idAtleta);
            ps.setInt(2, idDesafio);
            ps.setString(3, eventoId);
            ps.setString(4, titulo);
            ps.setInt(5, xp);

            int inseridos = ps.executeUpdate();

            if (inseridos == 0) {
                return;
            }
        }

        inserirGamificacaoAtleta(conn, idAtleta);

        atualizarXP(conn, idAtleta, xp);

        marcarRecompensaRecebida(conn, idAtleta, idDesafio);
    }

    private void inserirGamificacaoAtleta(
            Connection conn, int idAtleta) throws SQLException {

        String sql = """
            INSERT IGNORE INTO GamificacaoAtletas
            (id_atleta,xp_total,nivel,desafios_concluidos)
            VALUES (?,0,1,0)
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idAtleta);
            ps.executeUpdate();
        }
    }

    private void atualizarXP(
            Connection conn,
            int idAtleta,
            int xpGanho) throws SQLException {

        String consultar = """
            SELECT xp_total
            FROM GamificacaoAtletas
            WHERE id_atleta = ?
            FOR UPDATE
        """;

        int xpAtual;

        try (PreparedStatement ps = conn.prepareStatement(consultar)) {
            ps.setInt(1, idAtleta);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new SQLException("Gamificação do atleta não encontrada.");
                }

                xpAtual = rs.getInt("xp_total");
            }
        }

        int novoXP = xpAtual + xpGanho;
        int novoNivel = (novoXP / 500) + 1;

        String atualizar = """
            UPDATE GamificacaoAtletas
            SET xp_total = ?,
                nivel = ?,
                desafios_concluidos = desafios_concluidos + 1,
                data_atualizacao = NOW()
            WHERE id_atleta = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(atualizar)) {
            ps.setInt(1, novoXP);
            ps.setInt(2, novoNivel);
            ps.setInt(3, idAtleta);
            ps.executeUpdate();
        }
    }

    private void marcarRecompensaRecebida(
            Connection conn,
            int idAtleta,
            int idDesafio) throws SQLException {

        String sql = """
            UPDATE ProgressoDesafios
            SET recompensa_recebida = TRUE,
                data_atualizacao = NOW()
            WHERE id_atleta = ?
              AND id_desafio = ?
              AND periodo = 'PERMANENTE'
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idAtleta);
            ps.setInt(2, idDesafio);
            ps.executeUpdate();
        }
    }

    // =========================================================
    // CURTIR / DESCURTIR
    // =========================================================

    public boolean curtir(int idAtleta, int idPublicacao) throws SQLException {
        try (Connection conn = conectar()) {
            conn.setAutoCommit(false);

            try {
                verificarPublicacao(conn, idPublicacao);

                boolean curtido = verificarCurtida(
                        conn, idPublicacao, idAtleta
                );

                if (curtido) {
                    removerCurtida(conn, idPublicacao, idAtleta);
                } else {
                    adicionarCurtida(conn, idPublicacao, idAtleta);
                }

                atualizarCurtidas(conn, idPublicacao);

                conn.commit();

                return !curtido;

            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private void verificarPublicacao(
            Connection conn, int idPublicacao) throws SQLException {

        String sql = "SELECT id FROM Publicacoes WHERE id = ?";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new SQLException("Publicação não encontrada.");
                }
            }
        }
    }

    private boolean verificarCurtida(
            Connection conn,
            int idPublicacao,
            int idAtleta) throws SQLException {

        String sql = """
            SELECT id
            FROM CurtidasPublicacao
            WHERE id_publicacao = ?
              AND id_atleta = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);
            ps.setInt(2, idAtleta);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private void removerCurtida(
            Connection conn,
            int idPublicacao,
            int idAtleta) throws SQLException {

        String sql = """
            DELETE FROM CurtidasPublicacao
            WHERE id_publicacao = ?
              AND id_atleta = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);
            ps.setInt(2, idAtleta);
            ps.executeUpdate();
        }
    }

    private void adicionarCurtida(
            Connection conn,
            int idPublicacao,
            int idAtleta) throws SQLException {

        String sql = """
            INSERT IGNORE INTO CurtidasPublicacao
            (id_publicacao,id_atleta)
            VALUES (?,?)
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);
            ps.setInt(2, idAtleta);
            ps.executeUpdate();
        }
    }

    private void atualizarCurtidas(
            Connection conn, int idPublicacao) throws SQLException {

        String sql = """
            UPDATE Publicacoes
            SET curtidas = (
                SELECT COUNT(*)
                FROM CurtidasPublicacao
                WHERE id_publicacao = ?
            )
            WHERE id = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);
            ps.setInt(2, idPublicacao);
            ps.executeUpdate();
        }
    }

    // =========================================================
    // COMENTÁRIOS
    // =========================================================

    public List<Map<String, Object>> listarComentarios(
            int idPublicacao) throws SQLException {

        List<Map<String, Object>> lista = new ArrayList<>();

        String sql = """
            SELECT c.id,c.id_atleta,c.comentario,
                   c.data_comentario,a.nome,a.foto_perfil
            FROM ComentariosPublicacao c
            JOIN Atletas a ON a.id = c.id_atleta
            WHERE c.id_publicacao = ?
            ORDER BY c.data_comentario ASC, c.id ASC
        """;

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, idPublicacao);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> item = new LinkedHashMap<>();

                    item.put("id", rs.getInt("id"));
                    item.put("idAtleta", rs.getInt("id_atleta"));
                    item.put("nome", rs.getString("nome"));
                    item.put("texto", rs.getString("comentario"));
                    item.put("data", rs.getTimestamp("data_comentario"));
                    item.put("fotoPerfil", rs.getBytes("foto_perfil"));

                    lista.add(item);
                }
            }
        }

        return lista;
    }

    public void comentar(
            int idAtleta,
            int idPublicacao,
            String texto) throws Exception {

        if (texto == null || texto.trim().isEmpty()) {
            throw new SQLException("O comentário não pode estar vazio.");
        }

        try (Connection conn = conectar()) {
            conn.setAutoCommit(false);

            try {
                int idDono = obterDonoPublicacao(conn, idPublicacao);

                inserirComentario(
                        conn, idAtleta, idPublicacao, texto.trim()
                );

                atualizarContagemComentarios(conn, idPublicacao);

                if (idAtleta != idDono) {
                    registrarDesafio(
                            conn,
                            idAtleta,
                            "Comentar um post de outro atleta",
                            1
                    );
                }

                conn.commit();

            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private int obterDonoPublicacao(
            Connection conn, int idPublicacao) throws SQLException {

        String sql = """
            SELECT ps.id_atleta
            FROM Publicacoes p
            JOIN Perfil_social_atleta ps ON ps.id = p.id_perfil
            WHERE p.id = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new SQLException("Publicação não encontrada.");
                }

                return rs.getInt("id_atleta");
            }
        }
    }

    private void inserirComentario(
            Connection conn,
            int idAtleta,
            int idPublicacao,
            String texto) throws SQLException {

        String sql = """
            INSERT INTO ComentariosPublicacao
            (id_publicacao,id_atleta,comentario,data_comentario)
            VALUES (?,?,?,NOW())
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);
            ps.setInt(2, idAtleta);
            ps.setString(3, texto);
            ps.executeUpdate();
        }
    }

    private void atualizarContagemComentarios(
            Connection conn, int idPublicacao) throws SQLException {

        String sql = """
            UPDATE Publicacoes
            SET qtd_comentarios = (
                SELECT COUNT(*)
                FROM ComentariosPublicacao
                WHERE id_publicacao = ?
            )
            WHERE id = ?
        """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idPublicacao);
            ps.setInt(2, idPublicacao);
            ps.executeUpdate();
        }
    }

    // =========================================================
    // STORIES
    // =========================================================

    public int publicarStory(int idAtleta, Midia midia) throws SQLException {
        if (midia == null || midia.arquivo == null
                || midia.arquivo.length == 0) {
            throw new SQLException("Arquivo do story inválido.");
        }

        String sql = """
            INSERT INTO Stories
            (id_atleta,arquivo,nome_arquivo,mime_type,
             data_publicacao,data_expiracao)
            VALUES (?,?,?,?,NOW(),DATE_ADD(NOW(),INTERVAL 24 HOUR))
        """;

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(
                     sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idAtleta);
            ps.setBytes(2, midia.arquivo);
            ps.setString(3, midia.nome);
            ps.setString(4, midia.mime);

            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        }

        throw new SQLException("Story não foi salvo.");
    }

    public List<Map<String, Object>> listarStories() throws SQLException {
        List<Map<String, Object>> stories = new ArrayList<>();

        String sql = """
            SELECT s.id,s.id_atleta,s.arquivo,s.mime_type,
                   s.data_publicacao,s.data_expiracao,
                   a.nome,ps.nome_usuario,a.foto_perfil
            FROM Stories s
            JOIN Atletas a ON a.id = s.id_atleta
            LEFT JOIN Perfil_social_atleta ps ON ps.id_atleta = a.id
            WHERE s.data_expiracao > NOW()
            ORDER BY s.data_publicacao DESC, s.id DESC
        """;

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> item = new LinkedHashMap<>();

                item.put("id", rs.getInt("id"));
                item.put("idAtleta", rs.getInt("id_atleta"));
                item.put("nome", rs.getString("nome"));
                item.put("usuario", rs.getString("nome_usuario"));
                item.put("arquivo", rs.getBytes("arquivo"));
                item.put("mime", rs.getString("mime_type"));
                item.put("data", rs.getTimestamp("data_publicacao"));
                item.put("expiracao", rs.getTimestamp("data_expiracao"));
                item.put("fotoPerfil", rs.getBytes("foto_perfil"));

                stories.add(item);
            }
        }

        return stories;
    }

    public boolean excluirStory(
            int idStory, int idAtleta) throws SQLException {

        String sql = """
            DELETE FROM Stories
            WHERE id = ?
              AND id_atleta = ?
        """;

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, idStory);
            ps.setInt(2, idAtleta);

            return ps.executeUpdate() > 0;
        }
    }


    public int excluirStoriesExpirados() throws SQLException {
        String sql = "DELETE FROM Stories WHERE data_expiracao <= NOW()";

        try (Connection conn = conectar();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            return ps.executeUpdate();
        }
    }
}
