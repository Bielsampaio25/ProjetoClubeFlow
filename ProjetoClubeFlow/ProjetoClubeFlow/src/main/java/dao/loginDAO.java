
package dao;

import connection.ConnectionFactory;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import models.loginModel;

public class loginDAO {

    public loginModel validarLoginAtleta(loginModel login) {

        String sql = "SELECT email FROM Atletas "
                   + "WHERE email = ? AND senha = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, login.getEmail());
            stmt.setString(2, login.getSenha());

            try (ResultSet rs = stmt.executeQuery()) {

                if (rs.next()) {
                    loginModel atleta = new loginModel();

                    atleta.setEmail(rs.getString("email"));

                    return atleta;
                }
            }

        } catch (SQLException e) {
            throw new RuntimeException(
                "Erro ao validar login do atleta.", e
            );
        }

        return null;
    }

    public loginModel validarLoginClube(loginModel login) {

        String sql = "SELECT email_corporativo FROM Clubes "
                   + "WHERE email_corporativo = ? AND senha = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, login.getEmail());
            stmt.setString(2, login.getSenha());

            try (ResultSet rs = stmt.executeQuery()) {

                if (rs.next()) {
                    loginModel clube = new loginModel();

                    clube.setEmail(
                        rs.getString("email_corporativo")
                    );

                    return clube;
                }
            }

        } catch (SQLException e) {
            throw new RuntimeException(
                "Erro ao validar login do clube.", e
            );
        }

        return null;
    }
}