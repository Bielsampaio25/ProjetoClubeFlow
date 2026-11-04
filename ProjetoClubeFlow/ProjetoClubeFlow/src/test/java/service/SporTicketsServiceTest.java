/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/UnitTests/JUnit5TestClass.java to edit this template
 */
package service;

import java.util.List;
import models.eventoModel;
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
public class SporTicketsServiceTest {
    
    @Test
public void TesteAPIEsport() throws Exception {

    SporTicketsService service = new SporTicketsService();

    List<eventoModel> eventos =
            service.buscarEventos("São Paulo", "SP");

    System.out.println("Total de eventos: " + eventos.size());

    if (eventos.isEmpty()) {
        System.out.println("Nenhum evento encontrado.");
        return;
    }

    for (eventoModel evento : eventos) {
        System.out.println("-------------------------");
        System.out.println("Nome: " + evento.getNome());
        System.out.println("Cidade: " + evento.getCidade());
        System.out.println("Estado: " + evento.getEstado());
    }
}

    
}
