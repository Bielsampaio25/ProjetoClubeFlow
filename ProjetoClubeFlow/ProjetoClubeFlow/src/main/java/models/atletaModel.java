package models;

public class atletaModel {
    private String nome;
    private String data_nascimento;
    private String cpf;
    private String cidade;
    private String estado;
    private String email;
    private String telefone;
    private String senha;

    public String getNome() {
    return nome;
}

public void setNome(String nome) {
    this.nome = nome;
}

public String getData_nascimento() {
    return data_nascimento;
}

public void setData_nascimento(String data_nascimento) {
    this.data_nascimento = data_nascimento;
}

public String getCpf() {
    return cpf;
}

public void setCpf(String cpf) {
    this.cpf = cpf;
}

public String getCidade() {
    return cidade;
}

public void setCidade(String cidade) {
    this.cidade = cidade;
}

public String getEstado() {
    return estado;
}

public void setEstado(String estado) {
    this.estado = estado;
}

public String getEmail() {
    return email;
}

public void setEmail(String email) {
    this.email = email;
}

public String getTelefone() {
    return telefone;
}

public void setTelefone(String telefone) {
    this.telefone = telefone;
}

public String getSenha() {
    return senha;
}

public void setSenha(String senha) {
    this.senha = senha;
}

}