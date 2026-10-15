
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

const publicacao = document.getElementById('Publicacao');
const btnAbrir = document.getElementById('fazerPublicacao');
const btnFechar = document.getElementById('fecharPublicacao');

btnAbrir.addEventListener('click', () => {
  publicacao.showModal();
});

btnFechar.addEventListener('click', () => {
  publicacao.close();
});

const feed = document.getElementById('Feed');
const btnAbrirFeed = document.getElementById('publicarFeed');
const btnFecharFeed = document.getElementById('fecharFeed');

btnAbrirFeed.addEventListener('click', () => {
  feed.showModal();
});

btnFecharFeed.addEventListener('click', () => {
 feed.close();
});

const story = document.getElementById('Story');
const btnAbrirStory = document.getElementById('publicarStory');
const btnFecharStory = document.getElementById('fecharStory');

btnAbrirStory.addEventListener('click', () => {
  story.showModal();
});

btnFecharStory.addEventListener('click', () => {
 story.close();
});

