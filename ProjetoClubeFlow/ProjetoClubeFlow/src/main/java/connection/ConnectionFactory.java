package connection;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConnectionFactory {

    public static final String URL = "jdbc:mysql://localhost:3306/ClubeFlow";
    public static final String USER = "root";
    public static final String PASSWORD = "25042007";

    private static Connection conn;

    public static Connection getConnection() {
    try {
        Class.forName("com.mysql.cj.jdbc.Driver");

        Connection conexao = DriverManager.getConnection(
            URL,
            USER,
            PASSWORD
        );

        System.out.println("Conexão com MySQL estabelecida!");
        return conexao;

    } catch (ClassNotFoundException e) {
        System.out.println("Driver MySQL não encontrado no Tomcat.");
        e.printStackTrace();
        return null;

    } catch (SQLException e) {
        System.out.println("Erro ao conectar ao MySQL.");
        e.printStackTrace();
        return null;
    }
}
}
