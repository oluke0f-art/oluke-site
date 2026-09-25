let SITE = {};
let CATALOG = { categories: [], products: [] };
let catalogView = "products";
let showAllProducts = false;
let selectedCategory = null;
let sortAscending = true;
let visibleCount = 12;
let loadingMore = false;

const $ = (selector) => document.querySelector(selector);

async function loadJson(url) {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function priceOf(product) {
  const raw = String(product?.valor ?? "");
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function imageOf(product) {
  return product?.imagem || product?.midias?.find(media => media.tipo === "imagem")?.url || "";
}

function renderSite() {
  document.title = SITE.title || "OLUKE — Gadgets e Jogos";

  const heroTitle = $("#hero-title");
  const heroText = $("#hero-text");
  const heroStats = $("#hero-stats");

  if (heroTitle) heroTitle.textContent = SITE.heroTitle || "Gadgets e Jogos";
  if (heroText) heroText.textContent = SITE.heroText || "";

  if (heroStats) {
    heroStats.innerHTML = "";
    (SITE.stats || []).forEach(stat => {
      const item = document.createElement("div");
      item.className = "stat";
      item.innerHTML = `<strong>${esc(stat.value)}</strong><span>${esc(stat.label)}</span>`;
      heroStats.appendChild(item);
    });
  }

  const socials = SITE.socials || {};
  const socialLinks = {
    youtube: socials.youtube?.link || SITE.youtube,
    instagram: socials.instagram?.link || SITE.instagram,
    tiktok: socials.tiktok?.link || SITE.tiktok,
    contact: socials.contact?.link || SITE.contact
  };

  [
    ["#youtube-hero", socialLinks.youtube],
    ["#youtube-link", socialLinks.youtube],
    ["#instagram-link", socialLinks.instagram],
    ["#tiktok-link", socialLinks.tiktok],
    ["#contact-link", socialLinks.contact]
  ].forEach(([selector, href]) => {
    const el = $(selector);
    if (el && href) el.href = href;
  });

  const disclosure = $("#disclosure");
  if (disclosure) disclosure.textContent = SITE.disclosure || "";
}

function createCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  article.setAttribute("aria-label", `Abrir ${product.nome || "produto"}`);

  const media = document.createElement("div");
  media.className = "product-card-media";

  const firstMedia = product?.midias?.[0];
  if (firstMedia?.tipo === "video") {
    const video = document.createElement("video");
    video.src = firstMedia.url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    media.appendChild(video);
  } else if (imageOf(product)) {
    const img = document.createElement("img");
    img.src = imageOf(product);
    img.alt = product.nome || "Produto";
    img.loading = "lazy";
    media.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "product-card-placeholder";
    placeholder.textContent = "🛍️";
    media.appendChild(placeholder);
  }

  if (product.maisVendido || product.destaque) {
    const badge = document.createElement("span");
    badge.className = "product-card-badge";
    badge.textContent = "Mais vendido";
    media.appendChild(badge);
  }

  if ((product.midias?.length || 0) > 1) {
    const more = document.createElement("span");
    more.className = "product-card-play";
    more.textContent = "↗";
    media.appendChild(more);
  }

  const body = document.createElement("div");
  body.className = "product-card-body";

  const category = document.createElement("p");
  category.className = "product-card-category";
  category.textContent = product.categoria || "";

  const title = document.createElement("h3");
  title.className = "product-card-title";
  title.textContent = product.nome || "Produto";

  const bottom = document.createElement("div");
  bottom.className = "product-card-bottom";

  const price = document.createElement("p");
  price.className = "product-card-price";
  price.textContent = money(product.valor);

  const openHint = document.createElement("span");
  openHint.className = "product-card-open";
  openHint.textContent = "Abrir ↗";

  bottom.append(price, openHint);
  body.append(category, title, bottom);
  article.append(media, body);

  const openProduct = () => {
    if (product.link && product.link !== "#") {
      window.open(product.link, "_blank", "noopener,noreferrer");
    }
  };

  article.addEventListener("click", openProduct);
  article.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct();
    }
  });

  return article;
}

function getCategoryObjects() {
  const raw = Array.isArray(CATALOG.categories) ? CATALOG.categories : [];
  if (raw.length && typeof raw[0] === "object") {
    return raw.filter(category => category && category.ativo !== false).map(category => ({
      id: String(category.id || category.nome || ""),
      nome: String(category.nome || category.id || "Sem categoria").trim(),
      imagem: String(category.imagem || "")
    }));
  }

  return raw.map(category => ({
    id: String(category),
    nome: String(category).trim(),
    imagem: ""
  })).filter(category => category.nome);
}

function getAllCategories() {
  const categories = getCategoryObjects();
  const names = categories.map(category => category.nome);
  (CATALOG.products || []).forEach(product => {
    const name = String(product.categoria || "").trim();
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function getSortedProducts(products) {
  return [...products].sort((a, b) => {
    const diff = priceOf(a) - priceOf(b);
    return sortAscending ? diff : -diff;
  });
}

function getBestSellers() {
  const marked = CATALOG.products.filter(product => product.maisVendido === true);
  if (marked.length) return marked;
  const highlighted = CATALOG.products.filter(product => product.destaque === true);
  if (highlighted.length) return highlighted;
  return CATALOG.products.slice(0, 6);
}

function renderCards(grid, products, emptyMessage = "Nenhum produto encontrado.") {
  if (!grid) return;
  grid.innerHTML = "";

  if (!products.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<h3>${esc(emptyMessage)}</h3><p>Adicione produtos em <code>catalog/&lt;categoria&gt;/&lt;produto&gt;/produto.json</code> e rode <code>npm run build</code>.</p>`;
    grid.appendChild(empty);
    return;
  }

  products.forEach(product => grid.appendChild(createCard(product)));
}

function updateTabs() {
  document.querySelectorAll(".catalog-nav-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.view === catalogView);
  });
}

function renderSortButton() {
  const button = $("#sort-products");
  if (!button) return;
  button.hidden = !showAllProducts || catalogView !== "products";
  button.textContent = sortAscending ? "Mais baratos ↑" : "Mais caros ↓";
}

function renderProductsView() {
  const bestSection = $("#best-sellers-section");
  const allSection = $("#all-products-section");
  const grid = $("#grid");
  const allGrid = $("#all-products-grid");
  const categoriesView = $("#categories-view");
  const categoryHeading = $("#category-heading");

  if (categoriesView) categoriesView.hidden = true;
  if (bestSection) bestSection.hidden = showAllProducts || !!selectedCategory;
  if (allSection) allSection.hidden = !showAllProducts && !selectedCategory;
  if (categoryHeading) categoryHeading.hidden = !selectedCategory;

  if (selectedCategory) {
    if (bestSection) bestSection.hidden = true;
    if (allSection) allSection.hidden = false;
    const title = $("#selected-category-title");
    if (title) title.textContent = selectedCategory;

    const filtered = getSortedProducts(CATALOG.products.filter(product => String(product.categoria || "Sem categoria").trim() === selectedCategory));
    visibleCount = Math.max(12, Math.min(visibleCount, filtered.length));
    renderCards(allGrid, filtered.slice(0, visibleCount));
  } else if (showAllProducts) {
    const products = getSortedProducts(CATALOG.products);
    visibleCount = Math.max(12, Math.min(visibleCount, products.length));
    renderCards(allGrid, products.slice(0, visibleCount));
  } else {
    renderCards(grid, getBestSellers().slice(0, 6), "Ainda não há produtos em destaque.");
  }

  renderSortButton();
}

// Rola até o catálogo completo. (O offsetTop antigo media a distância dentro da
// seção, não da página, então a rolagem parava no lugar errado.)
// O espaço do cabeçalho fixo é tratado no CSS por "scroll-padding-top".
function scrollToProducts() {
  // dentro de uma categoria, rola até o título dela (com o botão "← Categorias")
  const target = selectedCategory ? "#category-heading" : "#all-products-section";
  document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showProducts() {
  catalogView = "products";
  selectedCategory = null;
  showAllProducts = false;
  visibleCount = 12;
  updateTabs();
  renderProductsView();
}

function showAll() {
  catalogView = "products";
  selectedCategory = null;
  showAllProducts = true;
  visibleCount = 12;
  updateTabs();
  renderProductsView();
  scrollToProducts();
}

function showCategory(category) {
  catalogView = "products";
  selectedCategory = category;
  showAllProducts = true;
  visibleCount = 12;
  updateTabs();
  renderProductsView();
  scrollToProducts();
}

function showCategories() {
  catalogView = "categories";
  selectedCategory = null;
  showAllProducts = false;
  updateTabs();

  const bestSection = $("#best-sellers-section");
  const allSection = $("#all-products-section");
  const categoriesView = $("#categories-view");
  const categoryHeading = $("#category-heading");

  if (bestSection) bestSection.hidden = true;
  if (allSection) allSection.hidden = true;
  if (categoryHeading) categoryHeading.hidden = true;
  if (categoriesView) categoriesView.hidden = false;

  renderCategories();
}

function renderCategories() {
  const grid = $("#categories-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const categories = getCategoryObjects();
  const knownNames = new Set(categories.map(category => category.nome));
  (CATALOG.products || []).forEach(product => {
    const name = String(product.categoria || "").trim();
    if (name && !knownNames.has(name)) {
      categories.push({ id: name, nome: name, imagem: imageOf(product) });
      knownNames.add(name);
    }
  });

  categories.forEach(category => {
    const products = CATALOG.products.filter(product => String(product.categoria || "Sem categoria").trim() === category.nome);
    const card = document.createElement("article");
    card.className = "category-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const media = document.createElement("div");
    media.className = "category-card-media";
    const image = category.imagem || imageOf(products[0]);
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = category.nome;
      img.loading = "lazy";
      media.appendChild(img);
    }

    const overlay = document.createElement("div");
    overlay.className = "category-card-overlay";

    const body = document.createElement("div");
    body.className = "category-card-body";
    body.innerHTML = `<h3>${esc(category.nome)}</h3><span>${products.length} ${products.length === 1 ? "produto" : "produtos"}</span>`;

    media.appendChild(overlay);
    card.append(media, body);

    const open = () => showCategory(category.nome);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    grid.appendChild(card);
  });
}

function socialIcon(type) {
  if (type === "youtube") return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"/></svg>`;
  if (type === "instagram") return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>`;
  if (type === "tiktok") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.2a4.8 4.8 0 1 1-3-4.45v2.9a2.1 2.1 0 1 0 .3 1.55V4h2.7c.35 1.45 1.2 2.5 3 3v2.65c-1.15-.1-2.15-.45-3-1.05V4z"/></svg>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>`;
}

function setupSocialPopover() {
  const popover = $("#social-modal");
  const linksBox = $("#social-links");
  const photo = $("#social-profile-photo");
  const name = $("#social-profile-name");
  const close = $("#close-social-modal");
  const triggers = [$("#subscribe-top"), $("#subscribe-bottom")].filter(Boolean);
  if (!popover || !linksBox || !triggers.length) return;

  const socials = SITE.socials || {};
  const entries = [
    ["youtube", socials.youtube],
    ["instagram", socials.instagram],
    ["tiktok", socials.tiktok],
    ["contact", socials.contact]
  ].filter(([, item]) => item && item.link);

  if (photo && socials.foto) photo.src = socials.foto;
  if (name) name.textContent = socials.usuario || socials.nome || "@oluke";

  linksBox.innerHTML = entries.map(([type, item]) => `
    <a class="social-popover-link" href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">
      <span class="social-popover-icon social-${type}">${socialIcon(type)}</span>
      <span class="social-popover-text">
        <strong>${esc(item.nome || type)}</strong>
        <small>${esc(item.usuario || item.link)}</small>
      </span>
      <span class="social-popover-arrow">↗</span>
    </a>
  `).join("");

  let activeTrigger = null;

  function position(trigger) {
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    popover.style.width = `${width}px`;
    let left = rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    let top = rect.bottom + 10;
    if (top + popover.offsetHeight > window.innerHeight - 12) {
      top = rect.top - popover.offsetHeight - 10;
    }
    // nunca deixa o cartão sair da tela (importante em celular deitado)
    top = Math.min(top, window.innerHeight - popover.offsetHeight - 12);
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(12, top)}px`;
  }

  function open(trigger) {
    activeTrigger = trigger;
    popover.hidden = false;
    popover.setAttribute("aria-hidden", "false");
    position(trigger);
  }

  function closePopover() {
    popover.hidden = true;
    popover.setAttribute("aria-hidden", "true");
    activeTrigger = null;
  }

  triggers.forEach(trigger => {
    trigger.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (!popover.hidden && activeTrigger === trigger) closePopover();
      else open(trigger);
    });
  });

  close?.addEventListener("click", closePopover);
  document.addEventListener("click", event => {
    if (!popover.hidden && !popover.contains(event.target) && !triggers.some(trigger => trigger.contains(event.target))) {
      closePopover();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePopover();
  });
  window.addEventListener("resize", () => {
    if (!popover.hidden && activeTrigger) position(activeTrigger);
  });
  window.addEventListener("scroll", () => {
    if (!popover.hidden && activeTrigger) position(activeTrigger);
  }, { passive: true });
}

function setupCatalogNavigation() {
  document.querySelectorAll(".catalog-nav-tab").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "categories") showCategories();
      else showProducts();
    });
  });

  $("#show-all-products")?.addEventListener("click", showAll);
  $("#back-to-categories")?.addEventListener("click", showCategories);
  $("#sort-products")?.addEventListener("click", () => {
    sortAscending = !sortAscending;
    visibleCount = 12;
    renderProductsView();
  });

  window.addEventListener("scroll", () => {
    if (catalogView !== "products" || !showAllProducts || loadingMore || selectedCategory && false) return;
    const total = selectedCategory
      ? CATALOG.products.filter(product => String(product.categoria || "Sem categoria").trim() === selectedCategory).length
      : CATALOG.products.length;
    if (visibleCount >= total) return;

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
      loadingMore = true;
      visibleCount = Math.min(visibleCount + 12, total);
      renderProductsView();
      window.setTimeout(() => { loadingMore = false; }, 100);
    }
  }, { passive: true });
}

function openGallery(product) {
  const modal = $("#media-modal");
  const content = $("#media-modal-content");
  const title = $("#media-modal-title");
  if (!modal || !content) return;

  if (title) title.textContent = product.nome;
  content.innerHTML = "";

  (product.midias || []).forEach(media => {
    const wrapper = document.createElement("div");
    wrapper.className = "gallery-item";

    if (media.tipo === "video") {
      const video = document.createElement("video");
      video.src = media.url;
      video.controls = true;
      video.playsInline = true;
      wrapper.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = media.url;
      image.alt = `${product.nome} — ${media.nome}`;
      wrapper.appendChild(image);
    }

    const caption = document.createElement("small");
    caption.textContent = media.nome;
    wrapper.appendChild(caption);
    content.appendChild(wrapper);
  });

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeGallery() {
  const modal = $("#media-modal");
  const content = $("#media-modal-content");
  if (modal) modal.hidden = true;
  if (content) content.innerHTML = "";
  document.body.classList.remove("modal-open");
}

async function init() {
  try {
    const [site, catalog] = await Promise.all([
      loadJson("site.json"),
      loadJson("data/catalog.json")
    ]);

    SITE = site;
    CATALOG = catalog;

    renderSite();
    setupSocialPopover();
    setupCatalogNavigation();
    showProducts();

    $("#close-media-modal")?.addEventListener("click", closeGallery);
    $("#media-modal")?.addEventListener("click", event => {
      if (event.target.id === "media-modal") closeGallery();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeGallery();
    });

    console.log("OLUKE carregado:", CATALOG.products.length, "produto(s)");
  } catch (error) {
    console.error("ERRO OLUKE:", error);
    const grid = $("#grid");
    if (grid) {
      grid.innerHTML = `<div class="empty-state"><h3>Erro ao carregar o catálogo</h3><p>${esc(error.message)}</p></div>`;
    }
  }
}

init();
