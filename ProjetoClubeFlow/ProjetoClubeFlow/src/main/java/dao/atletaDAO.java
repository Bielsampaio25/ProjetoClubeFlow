package dao;

import connection.ConnectionFactory;
import models.atletaModel;
import java.sql.Connection;
import java.sql.PreparedStatement;

public class atletaDAO {

    public boolean cadastrarDadosPessoais(atletaModel atletaModel) {
        // Corrigido: adicionado VALUES (...) e mapeamento correto de todos os campos
        String sql = "INSERT INTO Atletas "
                + "(nome, cpf, cidade, estado, email, telefone, senha) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, atletaModel.getNome());
            stmt.setString(2, atletaModel.getData_nascimento());
            stmt.setString(3, atletaModel.getCidade());
            stmt.setString(4, atletaModel.getEstado());
            stmt.setString(5, atletaModel.getEmail());
            stmt.setString(6, atletaModel.getTelefone());
            stmt.setString(7, atletaModel.getSenha());

            stmt.executeUpdate();
            return true;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
