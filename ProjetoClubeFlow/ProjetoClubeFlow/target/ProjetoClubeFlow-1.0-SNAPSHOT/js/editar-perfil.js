const inputFoto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");
const uploadArea = document.getElementById("uploadArea");
const removerFoto = document.getElementById("removerFoto");

inputFoto.addEventListener("change", function () {
    const arquivo = this.files[0];

    if (!arquivo) return;

    if (!["image/png", "image/jpeg"].includes(arquivo.type)) {
        alert("Selecione uma imagem PNG ou JPG.");
        this.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = function (e) {
        previewFoto.src = e.target.result;
        previewFoto.hidden = false;

        uploadArea.hidden = true;
        removerFoto.hidden = false;
    };

    leitor.readAsDataURL(arquivo);
});

removerFoto.addEventListener("click", function () {
    inputFoto.value = "";
    previewFoto.src = "";
    previewFoto.hidden = true;

    uploadArea.hidden = false;
    removerFoto.hidden = true;
});

document.querySelectorAll(".form-grid textarea").forEach(textarea => {
    textarea.addEventListener("input", () => {
        textarea.style.height = "44px";
        textarea.style.height = `${textarea.scrollHeight}px`;
    });
});