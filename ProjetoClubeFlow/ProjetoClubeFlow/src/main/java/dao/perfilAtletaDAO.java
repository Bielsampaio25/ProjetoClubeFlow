package dao;

import connection.ConnectionFactory;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

public class perfilAtletaDAO {

    public Map<String, Object> buscarPorEmail(String email)
            throws SQLException {

        String sql = "SELECT id, nome, cpf, data_nascimento, cidade, "
                + "estado, email, telefone, posicao_principal, "
                + "posicao_secundaria, pe_dominante, altura, peso, "
                + "categoria, numero_camisa, nivel_atual, foto_perfil, bio "
                + "FROM Atletas WHERE email = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, email);

            try (ResultSet rs = stmt.executeQuery()) {

                if (!rs.next()) {
                    return null;
                }

                Map<String, Object> dados = new LinkedHashMap<>();

                dados.put("id", rs.getInt("id"));
                dados.put("nome", rs.getString("nome"));
                dados.put("cpf", rs.getString("cpf"));

                java.sql.Date nascimento =
                        rs.getDate("data_nascimento");

                dados.put("dataNascimento",
                        nascimento == null ? "" : nascimento.toString());

                dados.put("cidade", rs.getString("cidade"));
                dados.put("estado", rs.getString("estado"));
                dados.put("email", rs.getString("email"));
                dados.put("telefone", rs.getString("telefone"));
                dados.put("posicaoPrincipal",
                        rs.getString("posicao_principal"));
                dados.put("posicaoSecundaria",
                        rs.getString("posicao_secundaria"));
                dados.put("peDominante",
                        rs.getString("pe_dominante"));

                dados.put("altura", rs.getBigDecimal("altura"));
                dados.put("peso", rs.getBigDecimal("peso"));
                dados.put("categoria", rs.getString("categoria"));
                dados.put("numeroCamisa",
                        rs.getObject("numero_camisa"));
                dados.put("nivel", rs.getString("nivel_atual"));
                dados.put("fotoPerfil", rs.getString("foto_perfil"));
                dados.put("bio", rs.getString("bio"));

                return dados;
            }
        }
    }

    public boolean atualizar(String emailOriginal,
                             Map<String, Object> dados)
            throws SQLException {

        String sql = "UPDATE Atletas SET "
                + "nome = ?, cpf = ?, data_nascimento = ?, "
                + "cidade = ?, estado = ?, email = ?, telefone = ?, "
                + "posicao_principal = ?, posicao_secundaria = ?, "
                + "pe_dominante = ?, altura = ?, peso = ?, "
                + "categoria = ?, numero_camisa = ?, nivel_atual = ?, "
                + "bio = ?, senha = CASE WHEN ? = '' THEN senha ELSE ? END "
                + "WHERE email = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, texto(dados, "nome"));
            stmt.setString(2, texto(dados, "cpf"));
            stmt.setString(3, texto(dados, "dataNascimento").isEmpty()
                    ? null : texto(dados, "dataNascimento"));
            stmt.setString(4, texto(dados, "cidade"));
            stmt.setString(5, texto(dados, "estado"));
            stmt.setString(6, texto(dados, "email"));
            stmt.setString(7, texto(dados, "telefone"));
            stmt.setString(8, texto(dados, "posicaoPrincipal"));
            stmt.setString(9, texto(dados, "posicaoSecundaria"));
            stmt.setString(10, texto(dados, "peDominante"));

            definirDecimal(stmt, 11, dados.get("altura"));
            definirDecimal(stmt, 12, dados.get("peso"));

            stmt.setString(13, texto(dados, "categoria"));
            definirInteiro(stmt, 14, dados.get("numeroCamisa"));
            stmt.setString(15, texto(dados, "nivel"));
            stmt.setString(16, texto(dados, "bio"));

            String novaSenha = texto(dados, "senha");

            stmt.setString(17, novaSenha);
            stmt.setString(18, novaSenha);
            stmt.setString(19, emailOriginal);

            return stmt.executeUpdate() > 0;
        }
    }

    private String texto(Map<String, Object> dados, String chave) {
        Object valor = dados.get(chave);
        return valor == null ? "" : valor.toString().trim();
    }

    private void definirDecimal(
            PreparedStatement stmt, int indice, Object valor)
            throws SQLException {

        if (valor == null || valor.toString().isBlank()) {
            stmt.setNull(indice, java.sql.Types.DECIMAL);
        } else {
            stmt.setBigDecimal(indice,
                    new java.math.BigDecimal(valor.toString()));
        }
    }

    private void definirInteiro(
            PreparedStatement stmt, int indice, Object valor)
            throws SQLException {

        if (valor == null || valor.toString().isBlank()) {
            stmt.setNull(indice, java.sql.Types.INTEGER);
        } else {
            stmt.setInt(indice, Integer.parseInt(valor.toString()));
        }
    }
}