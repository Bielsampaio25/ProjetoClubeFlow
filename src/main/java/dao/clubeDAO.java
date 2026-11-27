package dao;

import connection.ConnectionFactory;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import models.clubeModel;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class clubeDAO {

    public boolean cadastroClube(clubeModel clube) {

        String sql = "INSERT INTO Clubes "
                + "(nome_clube, cnpj, divisao, cidade, estado, "
                + "email_corporativo, nome_responsavel, cargo, senha) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, clube.getNome());
            stmt.setString(2, clube.getCnpj());
            stmt.setString(3, clube.getDivisao());
            stmt.setString(4, clube.getCidade());
            stmt.setString(5, clube.getEstado());
            stmt.setString(6, clube.getEmail_corporativo());
            stmt.setString(7, clube.getNome_responsavel());
            stmt.setString(8, clube.getCargo());
            stmt.setString(9, clube.getSenha());

            stmt.executeUpdate();

            return true;

        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public Long buscarIdPorEmail(String email) throws SQLException {
        if (email == null || email.isBlank()) {
            return null;
        }

        String sql = "SELECT id FROM Clubes WHERE email_corporativo = ?";

        Connection conn = ConnectionFactory.getConnection();
        if (conn == null) {
            throw new SQLException("Não foi possível conectar ao banco de dados.");
        }

        try (conn; PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email.trim());

            try (java.sql.ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("id");
                }
            }
        }
        return null;
    }
    
    public Map<String, Object> buscarDadosClubePorEmail(String email) throws SQLException {

    String sql = "SELECT nome_clube, divisao, cidade, estado, "
            + "email_corporativo, nome_responsavel, cargo "
            + "FROM Clubes WHERE email_corporativo = ?";

    Map<String, Object> clube = new HashMap<>();

    try (Connection conn = ConnectionFactory.getConnection();
         PreparedStatement stmt = conn.prepareStatement(sql)) {

        stmt.setString(1, email);

        try (ResultSet rs = stmt.executeQuery()) {

            if (rs.next()) {
                clube.put("nomeClube", rs.getString("nome_clube"));
                clube.put("divisao", rs.getString("divisao"));
                clube.put("cidade", rs.getString("cidade"));
                clube.put("estado", rs.getString("estado"));
                clube.put("email", rs.getString("email_corporativo"));
                clube.put("responsavel", rs.getString("nome_responsavel"));
                clube.put("cargo", rs.getString("cargo"));
            }
        }
    }

    return clube;
}

}
