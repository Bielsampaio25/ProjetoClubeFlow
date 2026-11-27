package service;

import dao.inscricaoOportunidadeDAO;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

public class inscricaoService {

    private final inscricaoOportunidadeDAO inscricaoDao;

    public inscricaoService() {
        this.inscricaoDao = new inscricaoOportunidadeDAO();
    }

    // ==========================================
    // PROPOSTAS RECEBIDAS PELO ATLETA
    // ==========================================

    public List<Map<String, Object>> listarPropostasRecebidas(
            Long atletaId
    ) throws SQLException {

        if (atletaId == null || atletaId <= 0) {
            throw new IllegalArgumentException(
                    "Atleta não identificado."
            );
        }

        return inscricaoDao.listarPropostasRecebidas(atletaId);
    }

    // ==========================================
    // ACEITAR PROPOSTA
    // ==========================================

    public boolean aceitarProposta(
            Long inscricaoId,
            Long atletaId
    ) throws SQLException {

        validarIdentificadores(inscricaoId, atletaId);

        return inscricaoDao.responderProposta(
                inscricaoId,
                atletaId,
                "ACEITA"
        );
    }

    // ==========================================
    // RECUSAR PROPOSTA
    // ==========================================

    public boolean recusarProposta(
            Long inscricaoId,
            Long atletaId
    ) throws SQLException {

        validarIdentificadores(inscricaoId, atletaId);

        return inscricaoDao.responderProposta(
                inscricaoId,
                atletaId,
                "RECUSADA"
        );
    }

    // ==========================================
    // VALIDAÇÃO
    // ==========================================

    private void validarIdentificadores(
            Long inscricaoId,
            Long atletaId
    ) {

        if (inscricaoId == null || inscricaoId <= 0) {
            throw new IllegalArgumentException(
                    "Proposta inválida."
            );
        }

        if (atletaId == null || atletaId <= 0) {
            throw new IllegalArgumentException(
                    "Atleta não identificado."
            );
        }
    }
}
