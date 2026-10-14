const inputPerfil = document.getElementById("perfil");
const fotoPerfil = document.getElementById("fotoPerfil");
const iniciais = document.getElementById("iniciais");

inputPerfil.addEventListener("change", function () {
    const arquivo = this.files[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
        alert("Selecione uma imagem válida.");
        this.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = function (evento) {
        fotoPerfil.src = evento.target.result;
        fotoPerfil.hidden = false;
        iniciais.hidden = true;
    };

    leitor.readAsDataURL(arquivo);
});