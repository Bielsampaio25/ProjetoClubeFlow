package models;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class oportunidadeModel {

    private Long id;
    private Long clubeId;
    private String nomeClube;
    private String informacoesClube;
    private String titulo;
    private String descricao;
    private String objetivo;
    private String posicoesProcuradas;
    private Integer idadeMinima;
    private Integer idadeMaxima;
    private String localRealizacao;
    private LocalDateTime dataPublicacao;
    private LocalDate prazoInscricao;
    private LocalDateTime dataHoraAvaliacao;
    private String requisitos;
    private String statusOportunidade;
    private String statusCandidaturaAtleta;
    private boolean compativelPerfil;

    public oportunidadeModel() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getClubeId() {
        return clubeId;
    }

    public void setClubeId(Long clubeId) {
        this.clubeId = clubeId;
    }

    public String getNomeClube() {
        return nomeClube;
    }

    public void setNomeClube(String nomeClube) {
        this.nomeClube = nomeClube;
    }

    public String getInformacoesClube() {
        return informacoesClube;
    }

    public void setInformacoesClube(String informacoesClube) {
        this.informacoesClube = informacoesClube;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getObjetivo() {
        return objetivo;
    }

    public void setObjetivo(String objetivo) {
        this.objetivo = objetivo;
    }

    public String getPosicoesProcuradas() {
        return posicoesProcuradas;
    }

    public void setPosicoesProcuradas(String posicoesProcuradas) {
        this.posicoesProcuradas = posicoesProcuradas;
    }

    public Integer getIdadeMinima() {
        return idadeMinima;
    }

    public void setIdadeMinima(Integer idadeMinima) {
        this.idadeMinima = idadeMinima;
    }

    public Integer getIdadeMaxima() {
        return idadeMaxima;
    }

    public void setIdadeMaxima(Integer idadeMaxima) {
        this.idadeMaxima = idadeMaxima;
    }

    public String getLocalRealizacao() {
        return localRealizacao;
    }

    public void setLocalRealizacao(String localRealizacao) {
        this.localRealizacao = localRealizacao;
    }

    public LocalDateTime getDataPublicacao() {
        return dataPublicacao;
    }

    public void setDataPublicacao(LocalDateTime dataPublicacao) {
        this.dataPublicacao = dataPublicacao;
    }

    public LocalDate getPrazoInscricao() {
        return prazoInscricao;
    }

    public void setPrazoInscricao(LocalDate prazoInscricao) {
        this.prazoInscricao = prazoInscricao;
    }

    public LocalDateTime getDataHoraAvaliacao() {
        return dataHoraAvaliacao;
    }

    public void setDataHoraAvaliacao(LocalDateTime dataHoraAvaliacao) {
        this.dataHoraAvaliacao = dataHoraAvaliacao;
    }

    public String getRequisitos() {
        return requisitos;
    }

    public void setRequisitos(String requisitos) {
        this.requisitos = requisitos;
    }

    public String getStatusOportunidade() {
        return statusOportunidade;
    }

    public void setStatusOportunidade(String statusOportunidade) {
        this.statusOportunidade = statusOportunidade;
    }

    public String getStatusCandidaturaAtleta() {
        return statusCandidaturaAtleta;
    }

    public void setStatusCandidaturaAtleta(String statusCandidaturaAtleta) {
        this.statusCandidaturaAtleta = statusCandidaturaAtleta;
    }

    public boolean isCompativelPerfil() {
        return compativelPerfil;
    }

    public void setCompativelPerfil(boolean compativelPerfil) {
        this.compativelPerfil = compativelPerfil;
    }
}
