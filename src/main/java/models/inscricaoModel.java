package models;

import java.time.LocalDateTime;

public class inscricaoModel {

    private Long id;
    private Long oportunidadeId;
    private Long atletaId;
    private String tituloOportunidade;
    private String nomeClube;
    private String localRealizacao;
    private String statusCandidatura;
    private String statusOportunidade;
    private String statusRespostaProposta;
    private String observacaoClube;
    private LocalDateTime dataInscricao;
    private LocalDateTime dataAtualizacao;

    public inscricaoModel() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOportunidadeId() {
        return oportunidadeId;
    }

    public void setOportunidadeId(Long oportunidadeId) {
        this.oportunidadeId = oportunidadeId;
    }

    public Long getAtletaId() {
        return atletaId;
    }

    public void setAtletaId(Long atletaId) {
        this.atletaId = atletaId;
    }

    public String getTituloOportunidade() {
        return tituloOportunidade;
    }

    public void setTituloOportunidade(String tituloOportunidade) {
        this.tituloOportunidade = tituloOportunidade;
    }

    public String getNomeClube() {
        return nomeClube;
    }

    public void setNomeClube(String nomeClube) {
        this.nomeClube = nomeClube;
    }

    public String getLocalRealizacao() {
        return localRealizacao;
    }

    public void setLocalRealizacao(String localRealizacao) {
        this.localRealizacao = localRealizacao;
    }

    public String getStatusCandidatura() {
        return statusCandidatura;
    }

    public void setStatusCandidatura(String statusCandidatura) {
        this.statusCandidatura = statusCandidatura;
    }

    public String getStatusOportunidade() {
        return statusOportunidade;
    }

    public void setStatusOportunidade(String statusOportunidade) {
        this.statusOportunidade = statusOportunidade;
    }

    public String getStatusRespostaProposta() {
        return statusRespostaProposta;
    }

    public void setStatusRespostaProposta(String statusRespostaProposta) {
        this.statusRespostaProposta = statusRespostaProposta;
    }

    public String getObservacaoClube() {
        return observacaoClube;
    }

    public void setObservacaoClube(String observacaoClube) {
        this.observacaoClube = observacaoClube;
    }

    public LocalDateTime getDataInscricao() {
        return dataInscricao;
    }

    public void setDataInscricao(LocalDateTime dataInscricao) {
        this.dataInscricao = dataInscricao;
    }

    public LocalDateTime getDataAtualizacao() {
        return dataAtualizacao;
    }

    public void setDataAtualizacao(LocalDateTime dataAtualizacao) {
        this.dataAtualizacao = dataAtualizacao;
    }
}
