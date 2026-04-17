/**
 * Catálogo digital + carrito — Sabor Express
 * HTML/CSS/JS puro. Los pedidos se arman y se envían por WhatsApp (wa.me).
 */

// =============================================================================
// CONFIGURACIÓN WHATSAPP — CAMBIAR AQUÍ TU NÚMERO
// =============================================================================
// Usa SOLO dígitos: código de país + número local, sin +, espacios ni guiones.
// Ejemplo México: 521 + 10 dígitos (521XXXXXXXXXX → sustituye las X por tu número).
// Mientras tanto dejamos un placeholder obvio que debes reemplazar.
const WHATSAPP_SELLER_NUMBER = "529932343945"; // <-- REEMPLAZA por tu número real

// Clave para persistir el carrito en localStorage
const STORAGE_KEY = "saborExpressCart_v1";

/**
 * Catálogo de ejemplo (≥6 productos).
 * Las imágenes son URLs públicas; puedes cambiarlas por rutas locales en /img/
 */
const PRODUCTS = [
  {
    id: "burger-classic",
    name: "Hamburguesa Clásica",
    description: "Carne 150 g, queso cheddar, lechuga, tomate y salsa especial.",
    price: 89,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
  },
  {
    id: "tacos-pastor",
    name: "Tacos al Pastor",
    description: "Orden de 3 tacos con piña asada, cebolla y cilantro al gusto.",
    price: 65,
    image:
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&q=80",
  },
  {
    id: "pizza-margherita",
    name: "Pizza Margherita",
    description: "Masa delgada, mozzarella fresca, tomate y albahaca.",
    price: 145,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
  },
  {
    id: "wings-bbq",
    name: "Alitas BBQ",
    description: "6 piezas glaseadas con BBQ ahumado y dip de ranch.",
    price: 95,
    image:
      "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80",
  },
  {
    id: "nachos",
    name: "Nachos Supremos",
    description: "Totopos, queso fundido, jalapeños, frijol y pico de gallo.",
    price: 78,
    image:
      "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=80",
  },
  {
    id: "caesar-salad",
    name: "Ensalada César",
    description: "Lechuga romana, pollo a la plancha, parmesano y aderezo césar.",
    price: 88,
    image:
      "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&q=80",
  },
  {
    id: "agua-jamaica",
    name: "Agua de Jamaica",
    description: "500 ml bien fría, endulzada al punto.",
    price: 25,
    image:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80",
  },
  {
    id: "brownie",
    name: "Brownie con Helado",
    description: "Brownie de chocolate belga y bola de vainilla.",
    price: 55,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30439c?w=600&q=80",
  },
];

/** Estado del carrito: { [productId]: cantidad } */
let cart = {};

/* -------------------------------------------------------------------------- */
/* Utilidades de formato y persistencia */
/* -------------------------------------------------------------------------- */

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_) {
    /* ignorar JSON corrupto */
  }
  return {};
}

function saveCartToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (_) {
    /* almacenamiento lleno o deshabilitado */
  }
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

/** Total de unidades en el carrito (para el badge del header) */
function getCartItemCount() {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

/** Subtotal del carrito */
function getCartSubtotal() {
  let total = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const product = getProductById(id);
    if (product) total += product.price * qty;
  }
  return total;
}

/* -------------------------------------------------------------------------- */
/* Renderizado del catálogo */
/* -------------------------------------------------------------------------- */

function renderCatalog() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = "";

  PRODUCTS.forEach((product) => {
    const article = document.createElement("article");
    article.className = "product-card";
    article.setAttribute("role", "listitem");

    article.innerHTML = `
      <div class="product-media">
        <img src="${product.image}" alt="" loading="lazy" width="600" height="450" />
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <p class="product-desc">${escapeHtml(product.description)}</p>
        <div class="product-meta">
          <span class="product-price">${formatMoney(product.price)}</span>
          <button type="button" class="btn btn-add" data-add="${product.id}">
            ➕ Agregar
          </button>
        </div>
      </div>
    `;

    const img = article.querySelector("img");
    if (img) img.alt = `Foto de ${product.name}`;

    grid.appendChild(article);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* -------------------------------------------------------------------------- */
/* Lógica del carrito */
/* -------------------------------------------------------------------------- */

function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;
  cart[productId] = (cart[productId] || 0) + 1;
  persistAndRefresh();
}

function setQuantity(productId, qty) {
  const n = Math.max(0, Math.floor(Number(qty)));
  if (n === 0) {
    delete cart[productId];
  } else {
    cart[productId] = n;
  }
  persistAndRefresh();
}

function increment(productId, delta) {
  const current = cart[productId] || 0;
  setQuantity(productId, current + delta);
}

function persistAndRefresh() {
  saveCartToStorage();
  updateCartBadge();
  renderCartPanel();
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const count = getCartItemCount();
  if (count > 0) {
    badge.hidden = false;
    badge.textContent = count > 99 ? "99+" : String(count);
  } else {
    badge.hidden = true;
  }
}

function renderCartPanel() {
  const list = document.getElementById("cartList");
  const empty = document.getElementById("cartEmpty");
  const totalEl = document.getElementById("cartTotal");
  const waBtn = document.getElementById("whatsappBtn");
  if (!list || !empty || !totalEl || !waBtn) return;

  list.innerHTML = "";
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);

  if (ids.length === 0) {
    empty.hidden = false;
    totalEl.textContent = formatMoney(0);
    waBtn.disabled = true;
    return;
  }

  empty.hidden = true;
  waBtn.disabled = false;

  ids.forEach((id) => {
    const product = getProductById(id);
    const qty = cart[id];
    if (!product) return;

    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-thumb">
        <img src="${escapeHtml(product.image)}" alt="" width="56" height="56" loading="lazy" />
      </div>
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHtml(product.name)}</p>
        <p class="cart-item-price">${formatMoney(product.price)} c/u · ${formatMoney(
      product.price * qty
    )}</p>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control" role="group" aria-label="Cantidad de ${escapeHtml(product.name)}">
          <button type="button" class="qty-btn" data-dec="${id}" aria-label="Menos uno">−</button>
          <span class="qty-value">${qty}</span>
          <button type="button" class="qty-btn" data-inc="${id}" aria-label="Más uno">+</button>
        </div>
        <button type="button" class="btn-remove" data-remove="${id}">Quitar</button>
      </div>
    `;
    const thumbImg = li.querySelector(".cart-item-thumb img");
    if (thumbImg) thumbImg.alt = product.name;

    list.appendChild(li);
  });

  list.onclick = (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const rem = e.target.closest("[data-remove]");
    if (inc) increment(inc.getAttribute("data-inc"), 1);
    else if (dec) increment(dec.getAttribute("data-dec"), -1);
    else if (rem) setQuantity(rem.getAttribute("data-remove"), 0);
  };

  totalEl.textContent = formatMoney(getCartSubtotal());
}

/* -------------------------------------------------------------------------- */
/* Mensaje de WhatsApp y enlace wa.me */
/* -------------------------------------------------------------------------- */

function buildWhatsAppMessage() {
  const lines = [];
  lines.push("🍽️ *Nuevo pedido — Sabor Express*");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  let i = 1;
  for (const [id, qty] of Object.entries(cart)) {
    const product = getProductById(id);
    if (!product || qty <= 0) continue;
    const sub = product.price * qty;
    lines.push(`${i}. *${product.name}*`);
    lines.push(`   Cantidad: ${qty}`);
    lines.push(`   Subtotal: ${formatMoney(sub)}`);
    lines.push("");
    i += 1;
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(`💰 *Total:* ${formatMoney(getCartSubtotal())}`);
  lines.push("");
  lines.push("📍 Confírmame horario de entrega o pickup. ¡Gracias!");

  return lines.join("\n");
}

function openWhatsAppOrder() {
  const num = String(WHATSAPP_SELLER_NUMBER).replace(/\D/g, "");
  if (!num || num.includes("X")) {
    alert(
      "Configura tu número de WhatsApp en script.js → WHATSAPP_SELLER_NUMBER (solo dígitos, sin X)."
    );
    return;
  }

  const text = buildWhatsAppMessage();
  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* -------------------------------------------------------------------------- */
/* Panel carrito: abrir / cerrar y accesibilidad */
/* -------------------------------------------------------------------------- */

function setCartOpen(open) {
  const panel = document.getElementById("cartPanel");
  const overlay = document.getElementById("cartOverlay");
  const toggle = document.getElementById("cartToggle");
  if (!panel || !overlay || !toggle) return;

  panel.hidden = false;
  overlay.hidden = false;

  requestAnimationFrame(() => {
    panel.classList.toggle("is-open", open);
    overlay.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("cart-open", open);
    if (open) {
      const closeBtn = document.getElementById("cartClose");
      closeBtn?.focus();
    } else {
      toggle.focus();
    }
  });

  if (!open) {
    const onTransitionEnd = (ev) => {
      if (ev.propertyName !== "transform") return;
      if (!panel.classList.contains("is-open")) {
        panel.hidden = true;
        overlay.hidden = true;
      }
      panel.removeEventListener("transitionend", onTransitionEnd);
    };
    panel.addEventListener("transitionend", onTransitionEnd);
  }
}

function wireUi() {
  const toggle = document.getElementById("cartToggle");
  const closeBtn = document.getElementById("cartClose");
  const overlay = document.getElementById("cartOverlay");
  const waBtn = document.getElementById("whatsappBtn");
  const year = document.getElementById("year");
  const productGrid = document.getElementById("productGrid");

  /** Delegación: un solo listener aunque el catálogo se regenere */
  productGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const id = btn.getAttribute("data-add");
    if (id) addToCart(id);
  });

  if (year) year.textContent = String(new Date().getFullYear());

  toggle?.addEventListener("click", () => {
    const panel = document.getElementById("cartPanel");
    const isOpen = panel?.classList.contains("is-open");
    setCartOpen(!isOpen);
  });

  closeBtn?.addEventListener("click", () => setCartOpen(false));
  overlay?.addEventListener("click", () => setCartOpen(false));

  waBtn?.addEventListener("click", () => openWhatsAppOrder());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setCartOpen(false);
  });
}

/* -------------------------------------------------------------------------- */
/* Inicio */
/* -------------------------------------------------------------------------- */

function init() {
  cart = loadCartFromStorage();
  renderCatalog();
  persistAndRefresh();
  wireUi();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
