
package dao;

import connection.ConnectionFactory;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.LinkedHashMap;
import java.util.Map;

public class perfilAtletaDAO {

    public Map<String, Object> buscarPorEmail(String email)
            throws SQLException {

        String sql = "SELECT id, nome, cpf, data_nascimento, cidade, "
                + "estado, email, telefone, posicao_principal, "
                + "posicao_secundaria, pe_dominante, altura, peso, "
                + "categoria, numero_camisa, nivel_atual, "
                + "foto_perfil, bio "
                + "FROM Atletas WHERE email = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, email.trim());

            System.out.println("===== BUSCA DO PERFIL =====");
            System.out.println("Banco conectado: " + conn.getCatalog());
            System.out.println("E-mail pesquisado: [" + email + "]");

            try (ResultSet rs = stmt.executeQuery()) {

                if (!rs.next()) {
                    System.out.println("Atleta não encontrado.");
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

                BigDecimal altura = rs.getBigDecimal("altura");
                BigDecimal peso = rs.getBigDecimal("peso");

                dados.put("altura",
                        altura == null ? "" : altura.toPlainString());

                dados.put("peso",
                        peso == null ? "" : peso.toPlainString());

                dados.put("categoria", rs.getString("categoria"));
                dados.put("numeroCamisa",
                        rs.getObject("numero_camisa"));

                dados.put("nivel", rs.getString("nivel_atual"));
                dados.put("fotoPerfil", rs.getString("foto_perfil"));
                dados.put("bio", rs.getString("bio"));

                System.out.println("Nome encontrado: "
                        + dados.get("nome"));
                System.out.println("===========================");

                return dados;
            }
        }
    }

    public boolean atualizar(
            String emailOriginal,
            Map<String, Object> dados) throws SQLException {

        String sql = "UPDATE Atletas SET "
                + "nome = ?, "
                + "cpf = ?, "
                + "data_nascimento = ?, "
                + "cidade = ?, "
                + "estado = ?, "
                + "email = ?, "
                + "telefone = ?, "
                + "posicao_principal = ?, "
                + "posicao_secundaria = ?, "
                + "pe_dominante = ?, "
                + "altura = ?, "
                + "peso = ?, "
                + "categoria = ?, "
                + "numero_camisa = ?, "
                + "nivel_atual = ?, "
                + "bio = ?, "
                + "senha = CASE WHEN ? = '' THEN senha ELSE ? END "
                + "WHERE email = ?";

        String nome = texto(dados, "nome");
        String cpf = texto(dados, "cpf");
        String nascimento = texto(dados, "dataNascimento");
        String cidade = texto(dados, "cidade");
        String estado = texto(dados, "estado");
        String emailNovo = texto(dados, "email");
        String telefone = texto(dados, "telefone");
        String posicaoPrincipal = texto(dados, "posicaoPrincipal");
        String posicaoSecundaria = texto(dados, "posicaoSecundaria");
        String peDominante = texto(dados, "peDominante");
        String categoria = texto(dados, "categoria");
        String nivel = texto(dados, "nivel");
        String bio = texto(dados, "bio");
        String novaSenha = texto(dados, "senha");

        System.out.println("===== DADOS RECEBIDOS PELO DAO =====");
        System.out.println("E-mail original: [" + emailOriginal + "]");
        System.out.println("Nome recebido: [" + nome + "]");
        System.out.println("E-mail novo: [" + emailNovo + "]");

        if (nome.isBlank() || emailNovo.isBlank()) {
            throw new SQLException(
                    "Nome e e-mail são obrigatórios.");
        }

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            System.out.println("Banco conectado: " + conn.getCatalog());

            stmt.setString(1, nome);
            stmt.setString(2, vazioParaNull(cpf));

            if (nascimento.isBlank()) {
                stmt.setNull(3, Types.DATE);
            } else {
                stmt.setDate(3, java.sql.Date.valueOf(nascimento));
            }

            stmt.setString(4, vazioParaNull(cidade));
            stmt.setString(5, vazioParaNull(estado));
            stmt.setString(6, emailNovo);
            stmt.setString(7, vazioParaNull(telefone));
            stmt.setString(8, vazioParaNull(posicaoPrincipal));
            stmt.setString(9, vazioParaNull(posicaoSecundaria));
            stmt.setString(10, vazioParaNull(peDominante));

            definirDecimal(stmt, 11, dados.get("altura"));
            definirDecimal(stmt, 12, dados.get("peso"));

            stmt.setString(13, vazioParaNull(categoria));
            definirInteiro(stmt, 14, dados.get("numeroCamisa"));
            stmt.setString(15, vazioParaNull(nivel));
            stmt.setString(16, vazioParaNull(bio));

            stmt.setString(17, novaSenha);
            stmt.setString(18, novaSenha);
            stmt.setString(19, emailOriginal.trim());

            int linhasAlteradas = stmt.executeUpdate();

            System.out.println("Linhas alteradas: " + linhasAlteradas);
            System.out.println("====================================");

            return linhasAlteradas > 0;
        }
    }

    private String texto(Map<String, Object> dados, String chave) {
        Object valor = dados.get(chave);
        return valor == null ? "" : valor.toString().trim();
    }

    private String vazioParaNull(String valor) {
        return valor == null || valor.isBlank() ? null : valor;
    }

    private void definirDecimal(
            PreparedStatement stmt,
            int indice,
            Object valor) throws SQLException {

        if (valor == null || valor.toString().isBlank()) {
            stmt.setNull(indice, Types.DECIMAL);
        } else {
            stmt.setBigDecimal(
                    indice, new BigDecimal(valor.toString()));
        }
    }

    private void definirInteiro(
            PreparedStatement stmt,
            int indice,
            Object valor) throws SQLException {

        if (valor == null || valor.toString().isBlank()) {
            stmt.setNull(indice, Types.INTEGER);
        } else {
            stmt.setInt(indice, Integer.parseInt(valor.toString()));
        }
    }
}