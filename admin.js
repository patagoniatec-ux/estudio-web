/* PANEL DE CONTROL — Estudio Web
   Habla con las funciones de Netlify (/api/admin/*). La contraseña nunca
   está acá: el servidor la verifica y entrega una sesión temporal. */

(() => {
  "use strict";

  const TOKEN_KEY = "ew_admin_token";
  const STATUS_LABELS = {
    active: "Activo",
    development: "En desarrollo",
    hidden: "Oculto"
  };

  const state = {
    content: null,
    token: readToken(),
    editingId: null,   // id del proyecto que se está editando
    draft: null,       // proyecto nuevo todavía sin guardar
    linkRows: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);


  /* =========================
     UTILIDADES
  ========================= */

  function readToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveToken(value) {
    try {
      if (value) {
        localStorage.setItem(TOKEN_KEY, value);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* sin almacenamiento: la sesión dura mientras la pestaña esté abierta */
    }
  }

  function h(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    let value;

    for (const [key, val] of Object.entries(props)) {
      if (val === null || val === undefined || val === false) continue;

      if (key === "class") node.className = val;
      else if (key === "text") node.textContent = val;
      else if (key === "value") value = val;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), val);
      else node.setAttribute(key, val === true ? "" : val);
    }

    kids.flat().forEach(kid => {
      if (kid === null || kid === undefined || kid === false) return;
      node.append(kid.nodeType ? kid : document.createTextNode(kid));
    });

    if (value !== undefined) node.value = value;

    return node;
  }

  let toastTimer = null;

  function toast(message, isError = false) {
    const box = $("#toast");
    box.textContent = message;
    box.className = "toast" + (isError ? " error" : "");
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, isError ? 6000 : 3000);
  }

  async function withBusy(button, task) {
    button.disabled = true;
    try {
      return await task();
    } finally {
      button.disabled = false;
    }
  }

  function initials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].length <= 4 ? words[0].toUpperCase() : words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  const isPreviewable = value => /^(\/media\/|https?:\/\/)/i.test(value);

  function nextOrder(items) {
    return items.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0) + 1;
  }


  /* =========================
     API
  ========================= */

  async function api(path, { method = "GET", body, raw } = {}) {
    const headers = {};
    let payload;

    if (state.token) headers.Authorization = "Bearer " + state.token;

    if (raw) {
      payload = raw;
      headers["Content-Type"] = raw.type;
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }

    let response;

    try {
      response = await fetch(path, { method, headers, body: payload, cache: "no-store" });
    } catch {
      throw new Error("No hay conexión con el servidor.");
    }

    let data = null;

    try {
      data = await response.json();
    } catch {
      /* respuesta sin JSON */
    }

    if (response.status === 401 && path !== "/api/admin/login") {
      logout("Tu sesión venció. Ingresá de nuevo.");
      throw new Error("Sesión vencida.");
    }

    if (!response.ok) {
      if (!data) {
        throw new Error("El servicio del panel no responde. Verificá que las funciones de Netlify estén publicadas.");
      }
      throw new Error(data.error || "Error " + response.status);
    }

    return data;
  }

  async function loadContent() {
    for (const url of ["/api/content", "data/content.json"]) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) return await response.json();
      } catch {
        /* se prueba la siguiente fuente */
      }
    }
    throw new Error("No se pudo cargar el contenido del sitio.");
  }

  async function persist(next) {
    const result = await api("/api/admin/content", { method: "PUT", body: next });
    state.content = result.content;
  }


  /* =========================
     IMÁGENES
  ========================= */

  /* Achica la foto antes de subirla (las fotos del celular pesan varios MB). */
  async function shrinkImage(file) {
    let bitmap;

    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error("No se pudo leer la imagen. Probá con un JPG, PNG o WEBP.");
    }

    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const toBlob = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

    const webp = await toBlob("image/webp", 0.88);
    if (webp && webp.type === "image/webp") return webp;

    return toBlob("image/png");
  }

  function imageField(label, initial, hint) {
    const input = h("input", {
      type: "text",
      inputmode: "url",
      placeholder: "Subí una imagen o pegá un enlace",
      value: initial || ""
    });

    const preview = h("div", { class: "img-preview" });
    const status = h("small", { class: "field-hint", text: hint || "" });
    const fileInput = h("input", { type: "file", accept: "image/*", class: "visually-hidden", tabindex: "-1" });

    function refresh() {
      const value = input.value.trim();
      preview.replaceChildren();

      if (value && isPreviewable(value)) {
        preview.append(h("img", { src: value, alt: "" }));
      } else {
        preview.append(h("span", { text: "Sin imagen" }));
      }
    }

    input.addEventListener("input", refresh);

    const uploadButton = h("button", {
      class: "btn btn-secondary",
      type: "button",
      text: "Subir imagen",
      onclick: () => fileInput.click()
    });

    const removeButton = h("button", {
      class: "btn btn-secondary",
      type: "button",
      text: "Quitar",
      onclick: () => {
        input.value = "";
        refresh();
        status.textContent = "Imagen quitada. Guardá para aplicar el cambio.";
      }
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;

      uploadButton.disabled = true;
      status.textContent = "Subiendo imagen…";

      try {
        const blob = await shrinkImage(file);
        const result = await api("/api/admin/upload", { method: "POST", raw: blob });
        input.value = result.url;
        refresh();
        status.textContent = "Imagen subida. Guardá para aplicar el cambio.";
      } catch (error) {
        status.textContent = "";
        toast(error.message, true);
      } finally {
        uploadButton.disabled = false;
      }
    });

    refresh();

    const element = h("div", { class: "field image-field" },
      h("span", { class: "field-label", text: label }),
      h("div", { class: "image-row" },
        preview,
        h("div", { class: "image-buttons" }, uploadButton, removeButton, fileInput)
      ),
      input,
      status
    );

    return { element, get value() { return input.value.trim(); } };
  }

  function field(label, control, hint) {
    return h("label", { class: "field" },
      h("span", { class: "field-label", text: label }),
      control,
      hint ? h("small", { class: "field-hint", text: hint }) : null
    );
  }

  function thumb(project) {
    const box = h("div", { class: "thumb" });

    if (project.image && isPreviewable(project.image)) {
      box.append(h("img", { src: project.image, alt: "" }));
    } else {
      box.append(project.symbol || initials(project.name));
    }

    return box;
  }


  /* =========================
     PROYECTOS
  ========================= */

  function renderProjects() {
    const list = $("#projectsList");
    list.replaceChildren();

    const projects = [...state.content.projects].sort((a, b) => a.order - b.order);

    if (state.draft) {
      list.append(projectEditor(state.draft, true));
    }

    projects.forEach(project => {
      list.append(project.id === state.editingId ? projectEditor(project, false) : projectCard(project));
    });

    if (!projects.length && !state.draft) {
      list.append(h("p", { class: "empty", text: "Todavía no hay proyectos. Tocá “+ Agregar proyecto”." }));
    }
  }

  function projectCard(project) {
    const meta = h("div", { class: "project-meta" });

    if (project.url) {
      meta.append(h("a", { href: project.url, target: "_blank", rel: "noopener", text: project.url }));
    }
    if (project.whatsapp) {
      meta.append(h("span", { text: "WhatsApp: " + project.whatsapp }));
    }
    meta.append(h("span", { text: "Orden: " + project.order }));

    return h("article", { class: "card" },
      h("div", { class: "project-head" },
        thumb(project),
        h("div", {},
          h("h3", { class: "project-name", text: project.name }),
          h("span", {
            class: "badge badge-" + project.status,
            text: "Estado: " + (STATUS_LABELS[project.status] || "Activo")
          })
        )
      ),
      project.description ? h("p", { class: "project-desc", text: project.description }) : null,
      meta,
      h("div", { class: "card-actions" },
        h("button", {
          class: "btn btn-secondary",
          type: "button",
          text: "Editar",
          onclick: () => {
            if (state.editingId || state.draft) {
              toast("Guardá o cancelá el proyecto que estás editando.", true);
              return;
            }
            state.editingId = project.id;
            renderProjects();
          }
        })
      )
    );
  }

  function projectEditor(project, isNew) {
    const name = h("input", { type: "text", value: project.name, maxlength: "80", required: true });
    const category = h("input", { type: "text", value: project.category, maxlength: "60" });
    const tag = h("input", { type: "text", value: project.tag, maxlength: "60" });
    const symbol = h("input", { type: "text", value: project.symbol, maxlength: "6" });
    const description = h("textarea", { value: project.description, maxlength: "300", rows: "3" });
    const detail = h("textarea", { value: project.detail, maxlength: "2000", rows: "5" });
    const url = h("input", { type: "url", inputmode: "url", value: project.url, placeholder: "https://" });
    const whatsapp = h("input", { type: "tel", inputmode: "numeric", value: project.whatsapp, placeholder: "5492984881252" });
    const order = h("input", { type: "number", inputmode: "numeric", value: String(project.order) });
    const status = h("select", { value: project.status },
      Object.entries(STATUS_LABELS).map(([value, label]) => h("option", { value, text: label }))
    );
    const image = imageField("Imagen o logo", project.image);

    const saveButton = h("button", { class: "btn btn-primary", type: "button", text: "Guardar" });
    const cancelButton = h("button", {
      class: "btn btn-secondary",
      type: "button",
      text: "Cancelar",
      onclick: () => {
        state.editingId = null;
        state.draft = null;
        renderProjects();
      }
    });
    const deleteButton = isNew ? null : h("button", { class: "btn btn-danger", type: "button", text: "Eliminar" });

    saveButton.addEventListener("click", () => {
      if (!name.value.trim()) {
        toast("El proyecto necesita un nombre.", true);
        name.focus();
        return;
      }

      const values = {
        id: isNew ? undefined : project.id,
        name: name.value,
        category: category.value,
        tag: tag.value,
        symbol: symbol.value,
        description: description.value,
        detail: detail.value,
        image: image.value,
        url: url.value,
        whatsapp: whatsapp.value,
        status: status.value,
        order: order.value
      };

      saveProject(isNew ? null : project, values, saveButton);
    });

    if (deleteButton) {
      deleteButton.addEventListener("click", () => deleteProject(project, deleteButton));
    }

    return h("article", { class: "card editing" },
      h("h3", { class: "project-name", text: isNew ? "Nuevo proyecto" : "Editar proyecto" }),
      h("div", { class: "form", style: "margin-top:16px" },
        h("div", { class: "form-grid" },
          field("Nombre", name),
          field("Estado", status)
        ),
        field("Descripción corta", description, "Se ve en la tarjeta del sitio."),
        image.element,
        h("div", { class: "form-grid" },
          field("URL del proyecto", url),
          field("WhatsApp", whatsapp, "Con código de país, solo números.")
        ),
        h("div", { class: "form-grid" },
          field("Orden de aparición", order, "El número más bajo aparece primero."),
          field("Sigla (si no hay logo)", symbol, "Ej.: LC")
        ),
        h("div", { class: "form-grid" },
          field("Categoría", category),
          field("Etiqueta", tag, "Se ve sobre la imagen. Ej.: Educación + IA")
        ),
        field("Texto ampliado", detail, "Se ve al abrir el proyecto. Una línea en blanco separa párrafos."),
        h("div", { class: "card-actions" }, saveButton, cancelButton, deleteButton)
      )
    );
  }

  async function saveProject(existing, values, button) {
    await withBusy(button, async () => {
      const next = structuredClone(state.content);

      if (existing) {
        const index = next.projects.findIndex(item => item.id === existing.id);
        next.projects[index] = { ...next.projects[index], ...values };
      } else {
        next.projects.push(values);
      }

      try {
        await persist(next);
      } catch (error) {
        toast(error.message, true);
        return;
      }

      state.editingId = null;
      state.draft = null;
      renderProjects();
      toast("Proyecto guardado ✓");
    });
  }

  async function deleteProject(project, button) {
    if (!confirm("¿Eliminar «" + project.name + "»?\nEsta acción no se puede deshacer.")) return;

    await withBusy(button, async () => {
      const next = structuredClone(state.content);
      next.projects = next.projects.filter(item => item.id !== project.id);

      try {
        await persist(next);
      } catch (error) {
        toast(error.message, true);
        return;
      }

      state.editingId = null;
      renderProjects();
      toast("Proyecto eliminado.");
    });
  }

  function addProject() {
    if (state.editingId || state.draft) {
      toast("Guardá o cancelá el proyecto que estás editando.", true);
      return;
    }

    state.draft = {
      id: "",
      name: "",
      category: "",
      tag: "",
      symbol: "",
      description: "",
      detail: "",
      image: "",
      url: "",
      whatsapp: "",
      status: "active",
      order: nextOrder(state.content.projects)
    };

    renderProjects();
    const first = $("#projectsList input");
    if (first) first.focus();
  }


  /* =========================
     PÁGINA PRINCIPAL
  ========================= */

  function renderSite() {
    const site = state.content.site;
    const form = $("#siteForm");
    form.replaceChildren();

    const heroTitle1 = h("input", { type: "text", value: site.heroTitle1, maxlength: "120" });
    const heroTitle2 = h("input", { type: "text", value: site.heroTitle2, maxlength: "120" });
    const heroText = h("textarea", { value: site.heroText, maxlength: "600", rows: "4" });
    const servicesTitle = h("input", { type: "text", value: site.servicesTitle, maxlength: "160" });
    const servicesText = h("textarea", { value: site.servicesText, maxlength: "600", rows: "3" });
    const heroImage = imageField(
      "Imagen principal",
      site.heroImage,
      "Reemplaza la tarjeta oscura de la portada. Si la dejás vacía, se mantiene el diseño actual."
    );
    const whatsapp = h("input", { type: "tel", inputmode: "numeric", value: site.whatsapp, placeholder: "5492984881252" });
    const email = h("input", { type: "email", inputmode: "email", value: site.email, placeholder: "nombre@correo.com" });

    const saveButton = h("button", { class: "btn btn-primary", type: "submit", text: "Guardar página principal" });

    form.append(
      field("Título principal — primera línea", heroTitle1),
      field("Título principal — línea destacada (en verde)", heroTitle2),
      field("Texto de presentación", heroText),
      field("Título de servicios", servicesTitle),
      field("Texto de servicios", servicesText),
      heroImage.element,
      h("div", { class: "form-grid" },
        field("WhatsApp de contacto", whatsapp, "Con código de país, solo números."),
        field("Correo de contacto", email, "Si lo dejás vacío, no se muestra.")
      ),
      h("div", { class: "card-actions" }, saveButton)
    );

    form.onsubmit = async event => {
      event.preventDefault();

      await withBusy(saveButton, async () => {
        const next = structuredClone(state.content);

        next.site = {
          heroTitle1: heroTitle1.value,
          heroTitle2: heroTitle2.value,
          heroText: heroText.value,
          servicesTitle: servicesTitle.value,
          servicesText: servicesText.value,
          heroImage: heroImage.value,
          whatsapp: whatsapp.value,
          email: email.value
        };

        try {
          await persist(next);
        } catch (error) {
          toast(error.message, true);
          return;
        }

        renderSite();
        toast("Página principal guardada ✓");
      });
    };
  }


  /* =========================
     ENLACES
  ========================= */

  function renderLinks() {
    const list = $("#linksList");
    list.replaceChildren();
    state.linkRows = [];

    [...state.content.links]
      .sort((a, b) => a.order - b.order)
      .forEach(link => addLinkRow(link));

    updateLinksEmpty();
  }

  function updateLinksEmpty() {
    const list = $("#linksList");
    const empty = $("#linksEmpty");

    if (state.linkRows.length === 0 && !empty) {
      list.append(h("p", { class: "empty", id: "linksEmpty", text: "No hay enlaces. Tocá “+ Agregar enlace”." }));
    } else if (state.linkRows.length > 0 && empty) {
      empty.remove();
    }
  }

  function addLinkRow(link) {
    const label = h("input", { type: "text", value: link.label, maxlength: "60", placeholder: "Ej.: Instagram" });
    const url = h("input", { type: "url", inputmode: "url", value: link.url, placeholder: "https://" });
    const order = h("input", { type: "number", inputmode: "numeric", value: String(link.order) });

    const row = { collect: () => ({ id: link.id || undefined, label: label.value, url: url.value, order: order.value }) };

    row.element = h("article", { class: "card link-card" },
      field("Texto del enlace", label),
      field("Dirección", url),
      field("Orden", order),
      h("div", { class: "card-actions" },
        h("button", {
          class: "btn btn-danger",
          type: "button",
          text: "Quitar",
          onclick: () => {
            state.linkRows = state.linkRows.filter(item => item !== row);
            row.element.remove();
            updateLinksEmpty();
          }
        })
      )
    );

    state.linkRows.push(row);
    $("#linksList").append(row.element);
    updateLinksEmpty();
    return row;
  }

  async function saveLinks() {
    const button = $("#saveLinks");

    await withBusy(button, async () => {
      const next = structuredClone(state.content);

      next.links = state.linkRows
        .map(row => row.collect())
        .filter(link => link.label.trim() || link.url.trim());

      try {
        await persist(next);
      } catch (error) {
        toast(error.message, true);
        return;
      }

      renderLinks();
      toast("Enlaces guardados ✓");
    });
  }


  /* =========================
     PESTAÑAS
  ========================= */

  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll(".panel").forEach(panel => {
      panel.hidden = panel.id !== "panel-" + name;
    });
  }


  /* =========================
     SESIÓN
  ========================= */

  function showLogin(message) {
    $("#appView").hidden = true;
    $("#loginView").hidden = false;

    const error = $("#loginError");
    error.textContent = message || "";
    error.hidden = !message;

    $("#loginPassword").value = "";
  }

  function logout(message) {
    state.token = "";
    state.editingId = null;
    state.draft = null;
    saveToken("");
    showLogin(message);
  }

  async function showApp() {
    const content = await loadContent();

    content.site = content.site || {};
    content.projects = content.projects || [];
    content.links = content.links || [];
    state.content = content;

    $("#loginView").hidden = true;
    $("#appView").hidden = false;

    renderProjects();
    renderSite();
    renderLinks();
    switchTab("projects");
  }

  async function boot() {
    if (!state.token) {
      showLogin();
      return;
    }

    try {
      await api("/api/admin/session");
      await showApp();
    } catch (error) {
      /* si el token venció, api() ya mostró el ingreso */
      if (state.token) showLogin(error.message);
    }
  }


  /* =========================
     EVENTOS
  ========================= */

  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("#loginButton");
    const error = $("#loginError");
    error.hidden = true;

    await withBusy(button, async () => {
      try {
        const result = await api("/api/admin/login", {
          method: "POST",
          body: { password: $("#loginPassword").value }
        });

        state.token = result.token;
        saveToken(result.token);
        await showApp();
      } catch (failure) {
        error.textContent = failure.message;
        error.hidden = false;
      }
    });
  });

  $("#logoutButton").addEventListener("click", () => logout());
  $("#addProject").addEventListener("click", addProject);
  $("#addLink").addEventListener("click", () => {
    const row = addLinkRow({
      id: "",
      label: "",
      url: "",
      order: nextOrder(state.linkRows.map(item => item.collect()))
    });
    const first = row.element.querySelector("input");
    if (first) first.focus();
  });
  $("#saveLinks").addEventListener("click", saveLinks);

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  boot();

})();
