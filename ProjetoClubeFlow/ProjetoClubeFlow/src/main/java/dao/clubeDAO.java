package dao;

import connection.ConnectionFactory;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import models.clubeModel;

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
}