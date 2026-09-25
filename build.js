const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CATALOG_DIR = path.join(ROOT, "catalog");
const OUTPUT = path.join(ROOT, "data", "catalog.json");

const IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".svg", ".jfif", ".tif", ".tiff", ".heic", ".heif"
]);
const VIDEO_EXTS = new Set([
  ".mp4", ".webm", ".mov", ".m4v", ".ogv", ".avi", ".mkv"
]);
const SKIP_FILES = new Set(["produto.json", "categoria.json", "leia-me.txt", "readme.txt", ".ds_store"]);

function cleanName(name) {
  return name.replace(/\s+/g, " ").trim();
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function mediaFiles(productDir) {
  return fs.readdirSync(productDir, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => !SKIP_FILES.has(name.toLowerCase()))
    .filter(name => {
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext);
    })
    .sort(naturalCompare);
}

function categoryMediaFiles(categoryDir) {
  return fs.readdirSync(categoryDir, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => !SKIP_FILES.has(name.toLowerCase()))
    .filter(name => {
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXTS.has(ext);
    })
    .sort(naturalCompare);
}

function firstImage(files) {
  return files.find(f => IMAGE_EXTS.has(path.extname(f).toLowerCase())) || null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.warn(`⚠️ JSON inválido: ${file}`);
    return null;
  }
}

const categories = [];
const products = [];

if (!fs.existsSync(CATALOG_DIR)) {
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
}

for (const catEntry of fs.readdirSync(CATALOG_DIR, { withFileTypes: true })) {
  if (!catEntry.isDirectory() || catEntry.name.startsWith("_")) continue;

  const categoryDir = path.join(CATALOG_DIR, catEntry.name);
  const categoryConfigPath = path.join(categoryDir, "categoria.json");
  const categoryConfig = fs.existsSync(categoryConfigPath) ? readJson(categoryConfigPath) : {};
  if (categoryConfig && categoryConfig.ativo === false) continue;

  const category = cleanName(categoryConfig?.nome || catEntry.name);
  const categoryMedia = categoryMediaFiles(categoryDir);
  const requestedImage = cleanName(categoryConfig?.imagem || "");
  const categoryImage = requestedImage && categoryMedia.includes(requestedImage)
    ? requestedImage
    : firstImage(categoryMedia);

  categories.push({
    id: catEntry.name,
    nome: category,
    imagem: categoryImage
      ? `catalog/${encodeURIComponent(catEntry.name)}/${encodeURIComponent(categoryImage)}`
      : "",
    ativo: true
  });

  for (const productEntry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
    if (!productEntry.isDirectory() || productEntry.name.startsWith("_")) continue;

    const productDir = path.join(categoryDir, productEntry.name);
    const configPath = path.join(productDir, "produto.json");
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️ Ignorado (sem produto.json): ${productDir}`);
      continue;
    }

    const cfg = readJson(configPath);
    if (!cfg) continue;

    // Qualquer valor diferente de false mantém o produto ativo.
    if (cfg.ativo === false) continue;

    const files = mediaFiles(productDir);
    const image = firstImage(files);

    products.push({
      id: `${catEntry.name}/${productEntry.name}`,
      nome: cfg.nome || productEntry.name,
      valor: Number(cfg.valor) || 0,
      link: cfg.link || "#",
      categoria: cfg.categoria || category,
      destaque: cfg.destaque === true,
      maisVendido: cfg.maisVendido === true,
      imagem: image ? `catalog/${encodeURIComponent(catEntry.name)}/${encodeURIComponent(productEntry.name)}/${encodeURIComponent(image)}` : "",
      midias: files.map(file => {
        const ext = path.extname(file).toLowerCase();
        return {
          nome: file,
          tipo: VIDEO_EXTS.has(ext) ? "video" : "imagem",
          url: `catalog/${encodeURIComponent(catEntry.name)}/${encodeURIComponent(productEntry.name)}/${encodeURIComponent(file)}`
        };
      })
    });
  }
}

categories.sort((a, b) => naturalCompare(a.nome, b.nome));
products.sort((a, b) => naturalCompare(a.nome, b.nome));

fs.writeFileSync(
  OUTPUT,
  JSON.stringify({ categories, products }, null, 2),
  "utf8"
);

console.log(`✅ Catálogo atualizado: ${products.length} produto(s), ${categories.length} categoria(s).`);
