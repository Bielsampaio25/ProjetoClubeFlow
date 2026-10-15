
const stories = document.querySelectorAll(".story .avatar");
const storyModal = document.getElementById("storyModal");
const fecharStory = document.getElementById("fecharStory");
const storyUsuario = document.getElementById("storyUsuario");
const storyNome = document.getElementById("storyNome");

stories.forEach((story) => {
    story.addEventListener("click", (evento) => {
        evento.preventDefault();

        const nome = story.dataset.nome;

        storyUsuario.textContent = nome;
        storyNome.textContent = nome;

        storyModal.classList.add("ativo");
    });
});

fecharStory.addEventListener("click", () => {
    storyModal.classList.remove("ativo");
});

storyModal.addEventListener("click", (evento) => {
    if (evento.target === storyModal) {
        storyModal.classList.remove("ativo");
    }
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        storyModal.classList.remove("ativo");
    }
});
