package dao;

import connection.ConnectionFactory;
import models.atletaModel;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;

public class atletaDAO {

    public int cadastrarDadosPessoais(atletaModel atleta) {

        String sql = "INSERT INTO Atletas "
                + "(nome, cpf, data_nascimento, cidade, estado, "
                + "email, telefone, senha) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection()) {

            if (conn == null) {
                System.out.println(
                        "ERRO: conexão com o banco indisponível."
                );
                return -1;
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    sql, Statement.RETURN_GENERATED_KEYS)) {

                ps.setString(1, atleta.getNome());
                ps.setString(2, atleta.getCpf());

                String dataNascimento = atleta.getData_nascimento();

                if (dataNascimento == null
                        || dataNascimento.isBlank()) {
                    ps.setNull(3, Types.DATE);
                } else {
                    ps.setDate(
                            3,
                            java.sql.Date.valueOf(dataNascimento)
                    );
                }

                ps.setString(4, atleta.getCidade());
                ps.setString(5, atleta.getEstado());
                ps.setString(6, atleta.getEmail());
                ps.setString(7, atleta.getTelefone());
                ps.setString(8, atleta.getSenha());

                int linhasAfetadas = ps.executeUpdate();

                if (linhasAfetadas == 0) {
                    System.out.println(
                            "ERRO: nenhum registro pessoal foi inserido."
                    );
                    return -1;
                }

                try (ResultSet rs = ps.getGeneratedKeys()) {

                    if (rs.next()) {
                        int idAtleta = rs.getInt(1);

                        System.out.println(
                                "Dados pessoais cadastrados. ID: "
                                + idAtleta
                        );

                        return idAtleta;
                    }
                }

                System.out.println(
                        "ERRO: não foi possível recuperar o ID do atleta."
                );

                return -1;
            }

        } catch (SQLException | IllegalArgumentException e) {

            System.out.println(
                    "ERRO ao cadastrar os dados pessoais."
            );

            e.printStackTrace();
            return -1;
        }
    }

    public boolean atualizarDadosEsportivos(
            atletaModel atleta, int idAtleta) {

        String sql = "UPDATE Atletas SET "
                + "posicao_principal = ?, "
                + "posicao_secundaria = ?, "
                + "pe_dominante = ?, "
                + "altura = ?, "
                + "peso = ?, "
                + "categoria = ?, "
                + "numero_camisa = ?, "
                + "nivel_atual = ? "
                + "WHERE id = ?";

        System.out.println(
                "Iniciando atualização esportiva do atleta ID: "
                + idAtleta
        );

        try (Connection conn = ConnectionFactory.getConnection()) {

            if (conn == null) {
                System.out.println(
                        "ERRO: conexão com o banco indisponível."
                );
                return false;
            }

            try (PreparedStatement ps = conn.prepareStatement(sql)) {

                ps.setString(1, atleta.getPosicaoPrincipal());
                ps.setString(2, atleta.getPosicaoSecundaria());
                ps.setString(3, atleta.getPeDominante());

                definirDecimal(ps, 4, atleta.getAltura());
                definirDecimal(ps, 5, atleta.getPeso());

                ps.setString(6, atleta.getCategoria());

                if (atleta.getNumeroCamisa() == null) {
                    ps.setNull(7, Types.INTEGER);
                } else {
                    ps.setInt(7, atleta.getNumeroCamisa());
                }

                ps.setString(8, atleta.getNivelAtual());
                ps.setInt(9, idAtleta);

                int linhasAfetadas = ps.executeUpdate();

                if (linhasAfetadas > 0) {
                    System.out.println(
                            "Dados esportivos atualizados. ID: "
                            + idAtleta
                    );
                    System.out.println(
                            "Linhas afetadas: " + linhasAfetadas
                    );
                    return true;
                }

                System.out.println(
                        "ATENÇÃO: nenhuma linha foi alterada para o ID "
                        + idAtleta
                );

                return false;
            }

        } catch (SQLException | IllegalArgumentException e) {

            System.out.println(
                    "ERRO ao atualizar os dados esportivos."
            );

            e.printStackTrace();
            return false;
        }
    }

    private void definirDecimal(
            PreparedStatement ps,
            int indice,
            String valor) throws SQLException {

        if (valor == null || valor.isBlank()) {
            ps.setNull(indice, Types.DECIMAL);
            return;
        }

        String valorNormalizado = valor
                .replace("m", "")
                .replace("M", "")
                .replace("kg", "")
                .replace("KG", "")
                .trim()
                .replace(",", ".");

        BigDecimal numero = new BigDecimal(valorNormalizado);

        ps.setBigDecimal(indice, numero);
    }
}
