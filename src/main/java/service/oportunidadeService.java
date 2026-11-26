package service;

import DAO.inscricaoOportunidadeDAO;
import dao.oportunidadeDAO;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import models.inscricaoModel;
import models.oportunidadeModel;

public class oportunidadeService {

    private static final Set<String> STATUS_CANDIDATURA_VALIDOS = Set.of(
            "INSCRICAO_REALIZADA",
            "EM_ANALISE",
            "CONVOCADO",
            "NAO_SELECIONADO"
    );

    private final oportunidadeDAO oportunidadeDao;
    private final inscricaoOportunidadeDAO inscricaoDao;

    public oportunidadeService() {
        this.oportunidadeDao = new oportunidadeDAO();
        this.inscricaoDao = new inscricaoOportunidadeDAO();
    }

    // ==========================================
    // OPORTUNIDADES PARA ATLETAS
    // ==========================================

    public List<oportunidadeModel> listarOportunidadesParaAtleta(
            Long atletaId,
            String filtroPosicao,
            Integer filtroIdade,
            String filtroLocal,
            boolean apenasCompativeis
    ) throws SQLException {

        String[] dadosPerfil = oportunidadeDao.buscarPerfilAtletaParaCompatibilidade(atletaId);

        String posicaoPerfil = dadosPerfil[0];
        Integer idadePerfil = parseIntegerSeguro(dadosPerfil[1]);
        String localPerfil = dadosPerfil[2];

        List<oportunidadeModel> oportunidades =
                oportunidadeDao.listarDisponiveisParaAtleta(atletaId);

        List<oportunidadeModel> resultado = new ArrayList<>();

        for (oportunidadeModel op : oportunidades) {

            boolean compativel = calcularCompatibilidade(
                    op,
                    posicaoPerfil,
                    idadePerfil,
                    localPerfil
            );

            op.setCompativelPerfil(compativel);

            if (op.getStatusCandidaturaAtleta() == null) {
                op.setStatusCandidaturaAtleta("ABERTA");
            }

            if (apenasCompativeis && !compativel) {
                continue;
            }

            if (filtroPosicao != null && !filtroPosicao.isBlank()) {
                String posicaoOportunidade = normalizar(op.getPosicoesProcuradas());

                if (!posicaoOportunidade.contains(normalizar(filtroPosicao))) {
                    continue;
                }
            }

            if (filtroIdade != null) {

                Integer idadeMinima = op.getIdadeMinima();
                Integer idadeMaxima = op.getIdadeMaxima();

                if (idadeMinima != null && filtroIdade < idadeMinima) {
                    continue;
                }

                if (idadeMaxima != null && filtroIdade > idadeMaxima) {
                    continue;
                }
            }

            if (filtroLocal != null && !filtroLocal.isBlank()) {

                String localOportunidade = normalizar(op.getLocalRealizacao());

                if (!localOportunidade.contains(normalizar(filtroLocal))) {
                    continue;
                }
            }

            resultado.add(op);
        }

        return resultado;
    }

    public oportunidadeModel detalharOportunidade(
            Long oportunidadeId,
            Long atletaId
    ) throws SQLException {

        oportunidadeModel op = oportunidadeDao.buscarPorIdParaAtleta(
                oportunidadeId,
                atletaId
        );

        if (op == null) {
            return null;
        }

        String[] dadosPerfil =
                oportunidadeDao.buscarPerfilAtletaParaCompatibilidade(atletaId);

        boolean compativel = calcularCompatibilidade(
                op,
                dadosPerfil[0],
                parseIntegerSeguro(dadosPerfil[1]),
                dadosPerfil[2]
        );

        op.setCompativelPerfil(compativel);

        if (op.getStatusCandidaturaAtleta() == null) {
            op.setStatusCandidaturaAtleta(op.getStatusOportunidade());
        }

        return op;
    }

    // ==========================================
    // INSCRIÇÃO DO ATLETA
    // ==========================================

    public void inscreverEmOportunidade(
            Long oportunidadeId,
            Long atletaId
    ) throws SQLException {

        oportunidadeModel op = oportunidadeDao.buscarPorIdParaAtleta(
                oportunidadeId,
                atletaId
        );

        if (op == null
                || !"ABERTA".equalsIgnoreCase(op.getStatusOportunidade())) {

            throw new IllegalStateException(
                    "Oportunidade indisponível ou encerrada para novas inscrições."
            );
        }

        if (inscricaoDao.existeInscricao(oportunidadeId, atletaId)) {
            throw new IllegalStateException(
                    "Você já possui inscrição registrada nesta oportunidade."
            );
        }

        inscricaoDao.inscreverAtleta(oportunidadeId, atletaId);
    }

    public List<inscricaoModel> listarHistoricoInscricoes(
            Long atletaId
    ) throws SQLException {

        return inscricaoDao.listarHistoricoPorAtleta(atletaId);
    }

    // ==========================================
    // GERENCIAMENTO DE CANDIDATURAS PELO CLUBE
    // ==========================================

    public boolean atualizarStatusPeloClube(
            Long inscricaoId,
            Long clubeId,
            String novoStatus,
            String observacao
    ) throws SQLException {

        if (novoStatus == null) {
            throw new IllegalArgumentException(
                    "Status de candidatura inválido."
            );
        }

        String status = novoStatus.toUpperCase(Locale.ROOT);

        if (!STATUS_CANDIDATURA_VALIDOS.contains(status)) {
            throw new IllegalArgumentException(
                    "Status de candidatura inválido."
            );
        }

        return inscricaoDao.atualizarStatusCandidatura(
                inscricaoId,
                clubeId,
                status,
                observacao
        );
    }

    // ==========================================
    // PESQUISA DE ATLETAS PELO CLUBE
    // ==========================================

    public List<java.util.Map<String, Object>> listarAtletasParaClube(
            String pesquisa
    ) throws SQLException {

        return oportunidadeDao.listarAtletasParaClube(pesquisa);
    }

    // ==========================================
    // PUBLICAÇÃO DE OPORTUNIDADE ABERTA
    // ==========================================

    public void cadastrarOportunidade(
            oportunidadeModel oportunidade
    ) throws SQLException {

        validarOportunidade(oportunidade);

        oportunidade.setStatusOportunidade("ABERTA");

        oportunidadeDao.cadastrar(oportunidade);
    }

    // ==========================================
    // ENVIO DE PROPOSTA DIRECIONADA
    // ==========================================

    public void enviarPropostaParaAtleta(
            oportunidadeModel oportunidade,
            Long atletaDestinatarioId
    ) throws SQLException {

        if (atletaDestinatarioId == null || atletaDestinatarioId <= 0) {
            throw new IllegalArgumentException(
                    "Selecione um atleta válido para receber a proposta."
            );
        }

        validarOportunidade(oportunidade);

        oportunidade.setStatusOportunidade("ABERTA");

        oportunidadeDao.cadastrar(
                oportunidade,
                atletaDestinatarioId
        );
    }

    private void validarOportunidade(
            oportunidadeModel oportunidade
    ) {

        if (oportunidade == null) {
            throw new IllegalArgumentException(
                    "Os dados da oportunidade não foram informados."
            );
        }

        if (oportunidade.getTitulo() == null
                || oportunidade.getTitulo().isBlank()) {

            throw new IllegalArgumentException(
                    "Informe o título da oportunidade."
            );
        }

        if (oportunidade.getDescricao() == null
                || oportunidade.getDescricao().isBlank()) {

            throw new IllegalArgumentException(
                    "Informe a descrição da oportunidade."
            );
        }

        if (oportunidade.getClubeId() == null) {
            throw new IllegalArgumentException(
                    "Clube não identificado."
            );
        }

        if (oportunidade.getIdadeMinima() != null
                && oportunidade.getIdadeMaxima() != null
                && oportunidade.getIdadeMinima()
                > oportunidade.getIdadeMaxima()) {

            throw new IllegalArgumentException(
                    "A idade mínima não pode ser maior que a idade máxima."
            );
        }
    }

    // ==========================================
    // COMPATIBILIDADE
    // ==========================================

    private boolean calcularCompatibilidade(
            oportunidadeModel op,
            String posicaoPerfil,
            Integer idadePerfil,
            String localPerfil
    ) {

        boolean matchPosicao = true;
        boolean matchIdade = true;
        boolean matchLocal = true;

        if (posicaoPerfil != null && !posicaoPerfil.isBlank()) {

            String posicoes = normalizar(op.getPosicoesProcuradas());
            String posicaoAtleta = normalizar(posicaoPerfil);

            matchPosicao = posicoes.contains(posicaoAtleta);
        }

        if (idadePerfil != null) {

            Integer idadeMinima = op.getIdadeMinima();
            Integer idadeMaxima = op.getIdadeMaxima();

            if (idadeMinima != null && idadePerfil < idadeMinima) {
                matchIdade = false;
            }

            if (idadeMaxima != null && idadePerfil > idadeMaxima) {
                matchIdade = false;
            }
        }

        if (localPerfil != null && !localPerfil.isBlank()) {

            String localOportunidade = normalizar(op.getLocalRealizacao());
            String localAtleta = normalizar(localPerfil);

            matchLocal = localOportunidade.contains(localAtleta)
                    || localAtleta.contains(localOportunidade);
        }

        return matchPosicao && matchIdade && matchLocal;
    }

    private String normalizar(String valor) {
        return valor == null
                ? ""
                : valor.trim().toLowerCase(Locale.ROOT);
    }

    private Integer parseIntegerSeguro(String valor) {

        if (valor == null || valor.isBlank()) {
            return null;
        }

        try {
            return Integer.valueOf(valor.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
