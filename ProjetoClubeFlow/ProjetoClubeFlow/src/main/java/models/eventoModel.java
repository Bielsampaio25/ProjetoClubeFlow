
package models;

public class eventoModel {

    private String id;
    private String nome;
    private String descricao;
    private String dataInicio;
    private String status;
    private String modalidade;
    private String cidade;
    private String estado;
    private String endereco;
    private String url;
    private String imagem;
    private String organizador;

    public eventoModel() {
    }

    public eventoModel(String id, String nome, String descricao,
            String dataInicio, String status, String modalidade,
            String cidade, String estado, String endereco,
            String url, String imagem, String organizador) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.dataInicio = dataInicio;
        this.status = status;
        this.modalidade = modalidade;
        this.cidade = cidade;
        this.estado = estado;
        this.endereco = endereco;
        this.url = url;
        this.imagem = imagem;
        this.organizador = organizador;
    }

    public String getId() { return id; }
    public String getNome() { return nome; }
    public String getDescricao() { return descricao; }
    public String getDataInicio() { return dataInicio; }
    public String getStatus() { return status; }
    public String getModalidade() { return modalidade; }
    public String getCidade() { return cidade; }
    public String getEstado() { return estado; }
    public String getEndereco() { return endereco; }
    public String getUrl() { return url; }
    public String getImagem() { return imagem; }
    public String getOrganizador() { return organizador; }

    public void setId(String id) { this.id = id; }
    public void setNome(String nome) { this.nome = nome; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public void setDataInicio(String dataInicio) { this.dataInicio = dataInicio; }
    public void setStatus(String status) { this.status = status; }
    public void setModalidade(String modalidade) { this.modalidade = modalidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public void setEstado(String estado) { this.estado = estado; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public void setUrl(String url) { this.url = url; }
    public void setImagem(String imagem) { this.imagem = imagem; }
    public void setOrganizador(String organizador) { this.organizador = organizador; }
}

