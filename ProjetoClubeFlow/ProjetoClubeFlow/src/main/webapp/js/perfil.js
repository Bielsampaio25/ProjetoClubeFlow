const inputFoto = document.getElementById("foto");
const btnMudarFoto = document.getElementById("btnMudarFoto");
const preview = document.getElementById("preview");
const textoUpload = document.getElementById("textoUpload");

inputFoto.addEventListener("change", function () {

    const arquivo = this.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = function (e) {

        preview.src = e.target.result;
        preview.hidden = false;

        textoUpload.style.display = "none";
        
        btnMudarFoto.hidden = false;
    };

    leitor.readAsDataURL(arquivo);

});