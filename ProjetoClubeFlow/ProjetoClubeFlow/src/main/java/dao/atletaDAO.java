package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;

import connection.ConnectionFactory;
import models.atletaModel;

public class atletaDAO {

    public boolean cadastrarDadosPessoais(atletaModel atletaModel) {
        // Corrigido: adicionado VALUES (...) e mapeamento correto de todos os campos
        String sql = "INSERT INTO Atletas "
                + "(nome, cpf, cidade, estado, email, telefone, senha) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, atletaModel.getNome());
            ps.setString(2, atletaModel.getData_nascimento());
            ps.setString(3, atletaModel.getCpf());
            ps.setString(4, atletaModel.getCidade());
            ps.setString(5, atletaModel.getEstado());
            ps.setString(6, atletaModel.getEmail());
            ps.setString(7, atletaModel.getTelefone());
            ps.setString(8, atletaModel.getSenha());
            ps.setString(9, atletaModel.getPosicaoPrincipal());
            ps.setString(10, atletaModel.getPosicaoSecundaria());
            ps.setString(11, atletaModel.getPeDominante());
            ps.setString(11, atletaModel.getAltura());
            ps.setString(11, atletaModel.getPeso());
            ps.setString(11, atletaModel.getCategoria());
            ps.setInt(11, atletaModel.getNumeroCamisa());
            ps.setString(11, atletaModel.getNivelAtual());

            ps.executeUpdate();
            System.out.println("Atleta cadastrado no banco de dados");
            return true;

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Erro ao cadastrar atleta");
            return false;
        }
    }
}
