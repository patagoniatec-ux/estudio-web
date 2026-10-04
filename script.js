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

  /* Respaldo: si no se puede leer el contenido del panel,
     el sitio sigue funcionando con estos textos. */

  let projectData = {

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
  const modalActions = document.getElementById("modalActions");

  const projectsGrid = document.getElementById("projectsGrid");


  function openProject(projectKey) {

    const project = projectData[projectKey];

    if (!project || !modal) {
      return;
    }

    modalCategory.textContent = project.category;
    modalTitle.textContent = project.title;
    modalDescription.textContent = project.description;
    modalInfo.textContent = project.info || "";
    modalInfo.style.display = project.info ? "" : "none";

    if (modalActions) {

      modalActions.replaceChildren();

      if (project.url) {
        modalActions.append(
          makeLink(project.url, "Visitar proyecto →", "btn btn-primary")
        );
      }

      if (project.whatsapp) {
        modalActions.append(
          makeLink(
            "https://wa.me/" + project.whatsapp +
              "?text=" + encodeURIComponent("Hola, quiero consultar por " + project.title + "."),
            "Consultar por WhatsApp",
            "btn btn-secondary"
          )
        );
      }

    }

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


  /* Un solo listener para todas las tarjetas, incluso las que
     se crean después desde el contenido del panel. */

  if (projectsGrid) {

    projectsGrid.addEventListener("click", event => {

      const card = event.target.closest(".project-card");

      if (card) {
        openProject(card.dataset.project);
      }

    });

  }


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

  let revealObserver = null;

  if ("IntersectionObserver" in window) {

    revealObserver = new IntersectionObserver(
      entries => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add("visible");

            revealObserver.unobserve(entry.target);

          }

        });

      },
      {
        threshold: 0.12
      }
    );

  }


  function observeReveal(elements) {

    elements.forEach(element => {

      if (revealObserver) {
        revealObserver.observe(element);
      } else {
        element.classList.add("visible");
      }

    });

  }


  observeReveal(document.querySelectorAll(".reveal"));


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


  /* =========================
     CONTENIDO DEL PANEL
     (proyectos, textos, imagen, enlaces)
  ========================= */

  function make(tag, className, text) {

    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text) {
      node.textContent = text;
    }

    return node;

  }


  /* Solo se aceptan enlaces http(s), mailto y tel. */

  function safeHref(value, allowMail) {

    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    try {

      const url = new URL(text, window.location.origin);

      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.href;
      }

      if (allowMail && (url.protocol === "mailto:" || url.protocol === "tel:")) {
        return url.href;
      }

    } catch (error) {
      /* dirección inválida */
    }

    return "";

  }


  function makeLink(href, text, className) {

    const link = make("a", className || "", text);
    const safe = safeHref(href, true);

    if (safe) {

      link.href = safe;

      if (safe.startsWith("http")) {
        link.target = "_blank";
        link.rel = "noopener";
      }

    }

    return link;

  }


  function initialsOf(name) {

    const words = String(name || "").trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return "?";
    }

    if (words.length === 1) {
      return words[0].length <= 4
        ? words[0].toUpperCase()
        : words[0][0].toUpperCase();
    }

    return (words[0][0] + words[1][0]).toUpperCase();

  }


  const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);


  function buildProjectCard(project) {

    const card = make("article", "project-card reveal");
    card.dataset.project = project.id;

    const image = make("div", "project-image");
    const photo = safeHref(project.image, false);

    if (photo) {

      const img = make("img", "project-photo");
      img.src = photo;
      img.alt = project.name;
      img.loading = "lazy";
      image.append(img);

    } else {

      image.append(
        make("div", "project-symbol", project.symbol || initialsOf(project.name))
      );

    }

    if (project.tag) {
      image.append(make("span", "project-type", project.tag));
    }

    if (project.status === "development") {
      image.append(make("span", "project-status", "En desarrollo"));
    }

    const content = make("div", "project-content");

    if (project.category) {
      content.append(make("span", "project-category", project.category));
    }

    content.append(make("h3", "", project.name));

    if (project.description) {
      content.append(make("p", "", project.description));
    }

    const button = make("button", "project-link", "Ver proyecto →");
    button.type = "button";
    content.append(button);

    card.append(image, content);

    return card;

  }


  function applyProjects(projects) {

    if (!projectsGrid || !Array.isArray(projects)) {
      return;
    }

    const visible = projects
      .filter(project => project && project.name && project.status !== "hidden")
      .sort(byOrder);

    const data = {};

    projectsGrid.replaceChildren();

    visible.forEach(project => {

      const parts = String(project.detail || "").split(/\n\s*\n/);

      data[project.id] = {
        category: project.tag || project.category || "",
        title: project.name,
        description: parts[0] || project.description || "",
        info: parts.slice(1).join("\n\n"),
        url: safeHref(project.url, false),
        whatsapp: String(project.whatsapp || "").replace(/\D/g, "")
      };

      projectsGrid.append(buildProjectCard(project));

    });

    projectData = data;

    observeReveal(projectsGrid.querySelectorAll(".reveal"));

  }


  function applySite(site) {

    function setText(id, value) {

      const node = document.getElementById(id);

      if (node && value) {
        node.textContent = value;
      }

    }

    setText("heroText", site.heroText);
    setText("servicesTitle", site.servicesTitle);
    setText("servicesText", site.servicesText);

    const title = document.getElementById("heroTitle");

    if (title) {

      if (site.heroTitle1) {

        const firstText = Array.from(title.childNodes).find(
          node => node.nodeType === 3 && node.textContent.trim()
        );

        if (firstText) {
          firstText.textContent = site.heroTitle1 + " ";
        }

      }

      const highlight = title.querySelector("span");

      if (highlight && site.heroTitle2) {
        highlight.textContent = site.heroTitle2;
      }

    }

    const heroCard = document.getElementById("heroCard");

    if (heroCard) {

      const previous = heroCard.querySelector(".hero-image");

      if (previous) {
        previous.remove();
      }

      const source = safeHref(site.heroImage, false);

      heroCard.classList.toggle("has-image", Boolean(source));

      if (source) {

        const img = make("img", "hero-image");
        img.src = source;
        img.alt = "";
        heroCard.append(img);

      }

    }

    const phone = String(site.whatsapp || "").replace(/\D/g, "");
    const whatsappButton = document.getElementById("contactWhatsapp");

    if (whatsappButton && phone) {

      whatsappButton.href =
        "https://wa.me/" + phone +
        "?text=Hola%20Estudio%20Web,%20quiero%20consultar%20por%20un%20sitio.";

    }

  }


  function applyFooterLinks(site, links) {

    const box = document.getElementById("footerLinks");

    if (!box) {
      return;
    }

    box.replaceChildren();

    if (site.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email)) {
      box.append(makeLink("mailto:" + site.email, site.email));
    }

    (Array.isArray(links) ? links : [])
      .filter(link => link && link.label && link.url)
      .sort(byOrder)
      .forEach(link => box.append(makeLink(link.url, link.label)));

    box.hidden = box.children.length === 0;

  }


  async function fetchContent() {

    for (const url of ["/api/content", "data/content.json"]) {

      try {

        const response = await fetch(url, { cache: "no-cache" });

        if (response.ok) {
          return await response.json();
        }

      } catch (error) {
        /* se prueba la siguiente fuente */
      }

    }

    return null;

  }


  /* Mientras se lee el contenido, la grilla de proyectos queda oculta
     para que no se vea un instante la versión anterior. */

  function endLoading() {

    if (projectsGrid) {
      projectsGrid.classList.remove("is-loading");
    }

  }

  if (projectsGrid) {
    projectsGrid.classList.add("is-loading");
    setTimeout(endLoading, 3000);
  }

  fetchContent()
    .then(content => {

      if (!content) {
        return;
      }

      const site = content.site || {};

      applySite(site);
      applyProjects(content.projects);
      applyFooterLinks(site, content.links);

    })
    .catch(() => {
      /* si algo falla, queda el contenido original del sitio */
    })
    .finally(endLoading);

});
