/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/UnitTests/JUnit5TestClass.java to edit this template
 */
package connection;

import java.sql.Connection;
import java.sql.SQLException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 *
 * @author 232.004662
 */
public class ConnectionFactoryTest {
    
    private Connection conn;
    
    @Test
    public void TestarConexao() throws SQLException{
        
        ConnectionFactory conexao = new ConnectionFactory();
        conn= conexao.getConnection();
        
        assertNotNull(conn);
    }
}
