document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     MOBILE MENU
  ========================= */

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {

    menuToggle.addEventListener("click", () => {

      const isActive = mainNav.classList.toggle("active");

      menuToggle.setAttribute(
        "aria-expanded",
        isActive ? "true" : "false"
      );

    });


    mainNav.querySelectorAll("a").forEach(link => {

      link.addEventListener("click", () => {

        mainNav.classList.remove("active");

        menuToggle.setAttribute(
          "aria-expanded",
          "false"
        );

      });

    });

  }


  /* =========================
     CURRENT YEAR
  ========================= */

  const currentYear = document.getElementById("currentYear");

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }


  /* =========================
     PROJECT DATA
  ========================= */

  const projectData = {

    cotv: {
      category: "Educación + IA",
      title: "COTV",
      description:
        "COTV es un proyecto educativo que combina Dibujo Técnico e Inteligencia Artificial para acompañar el proceso de aprendizaje.",
      info:
        "La idea es que el alumno pueda consultar materiales, avanzar en sus láminas y recibir orientación de una IA tutor basada en contenidos y criterios definidos por el docente."
    },


    chacrita: {
      category: "Producción + Web",
      title: "La Chacrita",
      description:
        "Un proyecto de producción rural orientado a huevos camperos y productos de chacra.",
      info:
        "El concepto digital busca organizar pedidos, productos, clientes y comunicación, incorporando además un sistema de envases retornables."
    },


    cata: {
      category: "Base de datos + IA",
      title: "Cata Patagona",
      description:
        "Una guía inteligente para descubrir vinos de la Patagonia.",
      info:
        "El proyecto contempla una base de datos amplia de vinos, bodegas y vinotecas, con información organizada para facilitar la búsqueda y consulta."
    }

  };


  /* =========================
     PROJECT MODAL
  ========================= */

  const modal = document.getElementById("projectModal");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalClose = document.getElementById("modalClose");

  const modalCategory = document.getElementById("modalCategory");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescription = document.getElementById("modalDescription");
  const modalInfo = document.getElementById("modalInfo");

  const projectCards = document.querySelectorAll(".project-card");


  function openProject(projectKey) {

    const project = projectData[projectKey];

    if (!project || !modal) {
      return;
    }

    modalCategory.textContent = project.category;
    modalTitle.textContent = project.title;
    modalDescription.textContent = project.description;
    modalInfo.textContent = project.info;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");
  }


  function closeProject() {

    if (!modal) {
      return;
    }

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");
  }


  projectCards.forEach(card => {

    card.addEventListener("click", () => {

      const projectKey = card.dataset.project;

      openProject(projectKey);

    });

  });


  if (modalClose) {
    modalClose.addEventListener("click", closeProject);
  }


  if (modalOverlay) {
    modalOverlay.addEventListener("click", closeProject);
  }


  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
      closeProject();
    }

  });


  /* =========================
     SCROLL REVEAL
  ========================= */

  const revealElements = document.querySelectorAll(".reveal");


  if ("IntersectionObserver" in window) {

    const observer = new IntersectionObserver(
      entries => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add("visible");

            observer.unobserve(entry.target);

          }

        });

      },
      {
        threshold: 0.12
      }
    );


    revealElements.forEach(element => {
      observer.observe(element);
    });

  } else {

    revealElements.forEach(element => {
      element.classList.add("visible");
    });

  }


  /* =========================
     HEADER ON SCROLL
  ========================= */

  const header = document.querySelector(".site-header");


  function updateHeader() {

    if (!header) {
      return;
    }

    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }

  }


  window.addEventListener(
    "scroll",
    updateHeader,
    {
      passive: true
    }
  );


  updateHeader();


  /* =========================
     EMPTY HASH LINKS
  ========================= */

  document.querySelectorAll('a[href="#"]').forEach(link => {

    link.addEventListener("click", event => {
      event.preventDefault();
    });

  });

});
