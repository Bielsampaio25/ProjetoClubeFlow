package connection;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConnectionFactory {

    public static final String URL = "jdbc:mysql://localhost:3309/ClubeFlow";
    public static final String USER = "root";
    public static final String PASSWORD = "cimatec";

    private static Connection conn;

    public static Connection getConnection() {
        try {
            if (conn == null) {
                conn = DriverManager.getConnection(URL, USER, PASSWORD);
                System.out.println("Conexão sucedida!");
            }

            return conn;

        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }
}
