"use strict";

/* ==========================================
   DUVANT 12 — CATÁLOGO V2
========================================== */

const store =
  window.DuvantStore;

if (!store) {
  throw new Error(
    "DUVANT 12 Store Common no está disponible."
  );
}


/* ==========================================
   DOM
========================================== */

const catalogGrid =
  document.getElementById(
    "catalogGrid"
  );

const catalogSearch =
  document.getElementById(
    "catalogSearch"
  );

const catalogSort =
  document.getElementById(
    "catalogSort"
  );

const catalogResultCount =
  document.getElementById(
    "catalogResultCount"
  );

const catalogEmpty =
  document.getElementById(
    "catalogEmpty"
  );

const catalogError =
  document.getElementById(
    "catalogError"
  );

const catalogEmptyReset =
  document.getElementById(
    "catalogEmptyReset"
  );

const categoryShortcuts =
  document.getElementById(
    "catalogCategoryShortcuts"
  );

const categoryFilterPanel =
  document.getElementById(
    "categoryFilterPanel"
  );

const brandFilters =
  document.getElementById(
    "brandFilters"
  );

const sizeFilters =
  document.getElementById(
    "sizeFilters"
  );

const filterAvailable =
  document.getElementById(
    "filterAvailable"
  );

const activeFiltersContainer =
  document.getElementById(
    "catalogActiveFilters"
  );

const clearAllFiltersButton =
  document.getElementById(
    "clearAllFilters"
  );

const clearAllFiltersTop =
  document.getElementById(
    "clearAllFiltersTop"
  );

const focusSearchButton =
  document.getElementById(
    "catalogFocusSearch"
  );


/* ==========================================
   MOBILE FILTERS
========================================== */

const openCatalogFilters =
  document.getElementById(
    "openCatalogFilters"
  );

const catalogFilterDrawer =
  document.getElementById(
    "catalogFilterDrawer"
  );

const catalogFilterOverlay =
  document.getElementById(
    "catalogFilterOverlay"
  );

const closeCatalogFilters =
  document.getElementById(
    "closeCatalogFilters"
  );

const catalogFilterDrawerContent =
  document.getElementById(
    "catalogFilterDrawerContent"
  );

const clearMobileFilters =
  document.getElementById(
    "clearMobileFilters"
  );

const applyMobileFilters =
  document.getElementById(
    "applyMobileFilters"
  );

const mobileFilterCount =
  document.getElementById(
    "mobileFilterCount"
  );


/* ==========================================
   MOBILE MENU
========================================== */

const mobileMenuButton =
  document.getElementById(
    "catalogMobileMenuButton"
  );

const mobileMenu =
  document.getElementById(
    "catalogMobileMenu"
  );

const closeMobileMenuButton =
  document.getElementById(
    "catalogCloseMobileMenu"
  );


/* ==========================================
   CART
========================================== */

const cartButton =
  document.getElementById(
    "catalogCartButton"
  );

const cartDrawer =
  document.getElementById(
    "catalogCartDrawer"
  );

const drawerOverlay =
  document.getElementById(
    "catalogDrawerOverlay"
  );

const closeCartButton =
  document.getElementById(
    "catalogCloseCart"
  );

const cartItems =
  document.getElementById(
    "catalogCartItems"
  );

const cartEmpty =
  document.getElementById(
    "catalogCartEmpty"
  );

const cartFooter =
  document.getElementById(
    "catalogCartFooter"
  );

const cartSubtotal =
  document.getElementById(
    "catalogCartSubtotal"
  );

const checkoutButton =
  document.getElementById(
    "catalogCheckoutButton"
  );


/* ==========================================
   STATE
========================================== */

let selectedCategory =
  "Todos";

let searchTerm =
  "";

let sortMode =
  "featured";

let onlyAvailable =
  false;

const selectedBrands =
  new Set();

const selectedSizes =
  new Set();


/* ==========================================
   HELPERS
========================================== */

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase("es")
    .trim();
}


function uniqueSorted(
  values
) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ].sort(
    (a, b) =>
      String(a).localeCompare(
        String(b),
        "es",
        {
          sensitivity:
            "base",
          numeric:
            true
        }
      )
  );
}


function getProductImageMarkup(
  product,
  className = ""
) {
  const imageUrl =
    store.getProductImageUrl(
      product
    );


  if (!imageUrl) {
    return store.createBottleMarkup(
      "D12"
    );
  }


  return `
    <img
      class="${store.escapeHtml(
        className
      )}"
      src="${store.escapeHtml(
        imageUrl
      )}"
      alt="${store.escapeHtml(
        `${product.name} ${product.brand}`
      )}"
      loading="lazy"
    >
  `;
}


function getFilterCount() {
  let total =
    selectedBrands.size +
    selectedSizes.size;

  if (
    selectedCategory !==
    "Todos"
  ) {
    total += 1;
  }

  if (onlyAvailable) {
    total += 1;
  }

  return total;
}


/* ==========================================
   DYNAMIC FILTERS
========================================== */

function renderDynamicFilters() {
  const products =
    store.getProducts();


  const brands =
    uniqueSorted(
      products.map(
        product =>
          product.brand
      )
    );


  const sizes =
    uniqueSorted(
      products.map(
        product =>
          product.size
      )
    );


  brandFilters.innerHTML =
    brands
      .map(brand => `
        <label class="catalog-check">

          <input
            type="checkbox"
            value="${store.escapeHtml(
              brand
            )}"
            data-brand-filter
          >

          <span
            class="catalog-check-box"
          ></span>

          <span>
            ${store.escapeHtml(
              brand
            )}
          </span>

        </label>
      `)
      .join("");


  sizeFilters.innerHTML =
    sizes
      .map(size => `
        <label class="catalog-check">

          <input
            type="checkbox"
            value="${store.escapeHtml(
              size
            )}"
            data-size-filter
          >

          <span
            class="catalog-check-box"
          ></span>

          <span>
            ${store.escapeHtml(
              size
            )}
          </span>

        </label>
      `)
      .join("");
}


/* ==========================================
   FILTERING
========================================== */

function getFilteredProducts() {
  let filtered = [
    ...store.getProducts()
  ];


  if (
    selectedCategory !==
    "Todos"
  ) {
    filtered =
      filtered.filter(
        product =>
          normalizeText(
            product.category
          ) ===
          normalizeText(
            selectedCategory
          )
      );
  }


  if (onlyAvailable) {
    filtered =
      filtered.filter(
        product =>
          product.available
      );
  }


  if (selectedBrands.size) {
    filtered =
      filtered.filter(
        product =>
          selectedBrands.has(
            product.brand
          )
      );
  }


  if (selectedSizes.size) {
    filtered =
      filtered.filter(
        product =>
          selectedSizes.has(
            product.size
          )
      );
  }


  if (searchTerm.trim()) {
    const query =
      normalizeText(
        searchTerm
      );


    filtered =
      filtered.filter(
        product => {
          const searchable =
            normalizeText(
              [
                product.code,
                product.name,
                product.brand,
                product.category,
                product.size,
                product.badge
              ].join(
                " "
              )
            );


          return searchable.includes(
            query
          );
        }
      );
  }


  switch (sortMode) {
    case "price-low":
      filtered.sort(
        (a, b) =>
          a.price -
          b.price
      );
      break;


    case "price-high":
      filtered.sort(
        (a, b) =>
          b.price -
          a.price
      );
      break;


    case "name":
      filtered.sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "es",
            {
              sensitivity:
                "base"
            }
          )
      );
      break;


    default:
      filtered.sort(
        (a, b) => {
          if (
            a.featured !==
            b.featured
          ) {
            return a.featured
              ? -1
              : 1;
          }


          if (
            a.displayOrder !==
            b.displayOrder
          ) {
            return (
              a.displayOrder -
              b.displayOrder
            );
          }


          return a.name.localeCompare(
            b.name,
            "es",
            {
              sensitivity:
                "base"
            }
          );
        }
      );
  }


  return filtered;
}


/* ==========================================
   PRODUCT CARD
========================================== */

function createCatalogCard(
  product
) {
  const badge =
    product.badge
      ? `
        <span class="product-badge">
          ${store.escapeHtml(
            product.badge
          )}
        </span>
      `
      : "";


  const availabilityText =
    product.available
      ? "Disponible"
      : "Agotado";


  const availabilityClass =
    product.available
      ? "available"
      : "unavailable";


  const productImage =
    getProductImageMarkup(
      product,
      "catalog-real-product-image"
    );


  return `
    <article
      class="catalog-product-card"
      data-product-id="${store.escapeHtml(
        product.id
      )}"
    >

      <a
        class="catalog-product-image"
        href="producto.html?id=${encodeURIComponent(
          product.id
        )}"
        aria-label="Ver ${store.escapeHtml(
          product.name
        )}"
      >

        ${badge}

        ${productImage}

        <span
          class="catalog-view-label"
        >
          Ver perfume
          <b>→</b>
        </span>

      </a>


      <div
        class="catalog-product-info"
      >

        <div
          class="catalog-product-top"
        >

          <div>

            <span
              class="product-brand"
            >
              ${store.escapeHtml(
                product.brand
              )}
            </span>


            <a
              href="producto.html?id=${encodeURIComponent(
                product.id
              )}"
              class="catalog-product-name"
            >
              ${store.escapeHtml(
                product.name
              )}
            </a>


            <span
              class="product-size"
            >
              ${store.escapeHtml(
                product.size
              )}
              ·
              ${store.escapeHtml(
                product.category
              )}
            </span>


            <span
              class="catalog-availability ${availabilityClass}"
            >
              <i></i>

              ${availabilityText}
            </span>

          </div>


          <strong
            class="catalog-product-price"
          >
            ${store.formatCurrency(
              product.price
            )}
          </strong>

        </div>


        <div
          class="catalog-product-actions"
        >

          <a
            href="producto.html?id=${encodeURIComponent(
              product.id
            )}"
            class="catalog-details-button"
          >
            Ver detalles
          </a>


          <button
            type="button"
            class="catalog-add-button"
            data-add-product="${store.escapeHtml(
              product.id
            )}"
            aria-label="Agregar ${store.escapeHtml(
              product.name
            )} al carrito"
            ${
              product.available
                ? ""
                : "disabled"
            }
          >
            ${
              product.available
                ? "+"
                : "×"
            }
          </button>

        </div>

      </div>

    </article>
  `;
}


/* ==========================================
   ACTIVE FILTERS
========================================== */

function renderActiveFilters() {
  const filters = [];


  if (
    selectedCategory !==
    "Todos"
  ) {
    filters.push({
      type:
        "category",
      value:
        selectedCategory,
      label:
        selectedCategory
    });
  }


  if (onlyAvailable) {
    filters.push({
      type:
        "availability",
      value:
        "available",
      label:
        "Disponible"
    });
  }


  selectedBrands.forEach(
    brand => {
      filters.push({
        type:
          "brand",
        value:
          brand,
        label:
          brand
      });
    }
  );


  selectedSizes.forEach(
    size => {
      filters.push({
        type:
          "size",
        value:
          size,
        label:
          size
      });
    }
  );


  activeFiltersContainer.hidden =
    filters.length === 0;


  clearAllFiltersTop.hidden =
    filters.length === 0 &&
    !searchTerm.trim();


  mobileFilterCount.textContent =
    String(
      getFilterCount()
    );


  mobileFilterCount.classList.toggle(
    "has-filters",
    getFilterCount() > 0
  );


  activeFiltersContainer.innerHTML =
    filters
      .map(filter => `
        <button
          type="button"
          data-remove-filter-type="${store.escapeHtml(
            filter.type
          )}"
          data-remove-filter-value="${store.escapeHtml(
            filter.value
          )}"
        >
          ${store.escapeHtml(
            filter.label
          )}
          <span>×</span>
        </button>
      `)
      .join("");
}


/* ==========================================
   SYNC FILTER UI
========================================== */

function syncFilterControls() {
  categoryShortcuts
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category ===
          selectedCategory
      );
    });


  document
    .querySelectorAll(
      'input[name="catalogCategory"]'
    )
    .forEach(input => {
      input.checked =
        input.value ===
        selectedCategory;
    });


  filterAvailable.checked =
    onlyAvailable;


  document
    .querySelectorAll(
      "[data-brand-filter]"
    )
    .forEach(input => {
      input.checked =
        selectedBrands.has(
          input.value
        );
    });


  document
    .querySelectorAll(
      "[data-size-filter]"
    )
    .forEach(input => {
      input.checked =
        selectedSizes.has(
          input.value
        );
    });
}


/* ==========================================
   RENDER CATALOG
========================================== */

function renderCatalog() {
  const products =
    getFilteredProducts();


  catalogResultCount.textContent =
    `${products.length} ${
      products.length === 1
        ? "perfume"
        : "perfumes"
    }`;


  catalogEmpty.hidden =
    products.length !== 0;


  catalogError.hidden =
    true;


  renderActiveFilters();

  syncFilterControls();


  if (!products.length) {
    catalogGrid.innerHTML =
      "";

    return;
  }


  catalogGrid.innerHTML =
    products
      .map(
        createCatalogCard
      )
      .join("");
}


/* ==========================================
   CATEGORY
========================================== */

function setCategory(
  category,
  updateUrl = true
) {
  selectedCategory =
    category;


  if (updateUrl) {
    const url =
      new URL(
        window.location.href
      );


    if (
      category ===
      "Todos"
    ) {
      url.searchParams.delete(
        "categoria"
      );
    } else {
      url.searchParams.set(
        "categoria",
        category
      );
    }


    window.history.replaceState(
      {},
      "",
      url
    );
  }


  renderCatalog();
}


function readCategoryFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );


  const category =
    params.get(
      "categoria"
    );


  if (
    [
      "Hombre",
      "Mujer",
      "Unisex"
    ].includes(
      category
    )
  ) {
    selectedCategory =
      category;
  }
}


/* ==========================================
   RESET
========================================== */

function clearAllFilters({
  preserveSearch = false
} = {}) {
  selectedCategory =
    "Todos";

  onlyAvailable =
    false;

  selectedBrands.clear();

  selectedSizes.clear();


  if (!preserveSearch) {
    searchTerm =
      "";

    catalogSearch.value =
      "";
  }


  const url =
    new URL(
      window.location.href
    );

  url.searchParams.delete(
    "categoria"
  );

  window.history.replaceState(
    {},
    "",
    url
  );


  renderCatalog();
}


/* ==========================================
   FILTER GROUPS
========================================== */

function toggleFilterGroup(
  button
) {
  const targetId =
    button.dataset.filterToggle;

  const target =
    document.getElementById(
      targetId
    );


  if (!target) {
    return;
  }


  const expanded =
    button.getAttribute(
      "aria-expanded"
    ) === "true";


  button.setAttribute(
    "aria-expanded",
    String(
      !expanded
    )
  );


  target.hidden =
    expanded;


  const icon =
    button.querySelector(
      "b"
    );


  if (icon) {
    icon.textContent =
      expanded
        ? "+"
        : "−";
  }
}


/* ==========================================
   MOBILE FILTER DRAWER
========================================== */

function buildMobileFilterContent() {
  const brands =
    uniqueSorted(
      store
        .getProducts()
        .map(
          product =>
            product.brand
        )
    );


  const sizes =
    uniqueSorted(
      store
        .getProducts()
        .map(
          product =>
            product.size
        )
    );


  catalogFilterDrawerContent.innerHTML = `
    <div class="catalog-mobile-filter-group">

      <span>
        Disponibilidad
      </span>

      <label class="catalog-check">

        <input
          type="checkbox"
          data-mobile-available
          ${
            onlyAvailable
              ? "checked"
              : ""
          }
        >

        <span
          class="catalog-check-box"
        ></span>

        <span>
          Disponible
        </span>

      </label>

    </div>


    <div class="catalog-mobile-filter-group">

      <span>
        Categoría
      </span>

      ${[
        "Todos",
        "Hombre",
        "Mujer",
        "Unisex"
      ].map(category => `
        <label class="catalog-check">

          <input
            type="radio"
            name="mobileCatalogCategory"
            value="${category}"
            ${
              selectedCategory ===
              category
                ? "checked"
                : ""
            }
          >

          <span
            class="catalog-radio-box"
          ></span>

          <span>
            ${category}
          </span>

        </label>
      `).join("")}

    </div>


    <div class="catalog-mobile-filter-group">

      <span>
        Marca
      </span>

      ${brands.map(brand => `
        <label class="catalog-check">

          <input
            type="checkbox"
            data-mobile-brand
            value="${store.escapeHtml(
              brand
            )}"
            ${
              selectedBrands.has(
                brand
              )
                ? "checked"
                : ""
            }
          >

          <span
            class="catalog-check-box"
          ></span>

          <span>
            ${store.escapeHtml(
              brand
            )}
          </span>

        </label>
      `).join("")}

    </div>


    <div class="catalog-mobile-filter-group">

      <span>
        Tamaño
      </span>

      ${sizes.map(size => `
        <label class="catalog-check">

          <input
            type="checkbox"
            data-mobile-size
            value="${store.escapeHtml(
              size
            )}"
            ${
              selectedSizes.has(
                size
              )
                ? "checked"
                : ""
            }
          >

          <span
            class="catalog-check-box"
          ></span>

          <span>
            ${store.escapeHtml(
              size
            )}
          </span>

        </label>
      `).join("")}

    </div>
  `;
}


function openFilterDrawer() {
  buildMobileFilterContent();


  catalogFilterDrawer.classList.add(
    "open"
  );

  catalogFilterOverlay.classList.add(
    "open"
  );

  catalogFilterDrawer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );
}


function closeFilterDrawer() {
  catalogFilterDrawer.classList.remove(
    "open"
  );

  catalogFilterOverlay.classList.remove(
    "open"
  );

  catalogFilterDrawer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "no-scroll"
  );
}


function applyFiltersFromMobile() {
  const categoryInput =
    catalogFilterDrawerContent
      .querySelector(
        'input[name="mobileCatalogCategory"]:checked'
      );


  selectedCategory =
    categoryInput
      ? categoryInput.value
      : "Todos";


  onlyAvailable =
    Boolean(
      catalogFilterDrawerContent
        .querySelector(
          "[data-mobile-available]"
        )
        ?.checked
    );


  selectedBrands.clear();


  catalogFilterDrawerContent
    .querySelectorAll(
      "[data-mobile-brand]:checked"
    )
    .forEach(input => {
      selectedBrands.add(
        input.value
      );
    });


  selectedSizes.clear();


  catalogFilterDrawerContent
    .querySelectorAll(
      "[data-mobile-size]:checked"
    )
    .forEach(input => {
      selectedSizes.add(
        input.value
      );
    });


  const url =
    new URL(
      window.location.href
    );


  if (
    selectedCategory ===
    "Todos"
  ) {
    url.searchParams.delete(
      "categoria"
    );
  } else {
    url.searchParams.set(
      "categoria",
      selectedCategory
    );
  }


  window.history.replaceState(
    {},
    "",
    url
  );


  renderCatalog();

  closeFilterDrawer();
}


/* ==========================================
   CART
========================================== */

function renderCart() {
  const cart =
    store.getCart();


  const validItems =
    cart
      .map(item => {
        const product =
          store.getProductById(
            item.id
          );


        if (!product) {
          return null;
        }


        return {
          ...item,
          product
        };
      })
      .filter(Boolean);


  if (!validItems.length) {
    cartItems.innerHTML =
      "";

    cartEmpty.classList.remove(
      "hidden"
    );

    cartFooter.classList.add(
      "hidden"
    );

    cartSubtotal.textContent =
      store.formatCurrency(
        0
      );

    store.updateCartIndicators();

    return;
  }


  cartEmpty.classList.add(
    "hidden"
  );

  cartFooter.classList.remove(
    "hidden"
  );


  cartItems.innerHTML =
    validItems
      .map(item => {
        const product =
          item.product;


        const imageUrl =
          store.getProductImageUrl(
            product
          );


        const imageMarkup =
          imageUrl
            ? `
              <img
                class="cart-real-image"
                src="${store.escapeHtml(
                  imageUrl
                )}"
                alt="${store.escapeHtml(
                  product.name
                )}"
              >
            `
            : `
              <div
                class="cart-item-mini-bottle"
              ></div>
            `;


        return `
          <article class="cart-item">

            <div
              class="cart-item-image"
            >
              ${imageMarkup}
            </div>


            <div
              class="cart-item-info"
            >

              <span>
                ${store.escapeHtml(
                  product.brand
                )}
              </span>


              <strong>
                ${store.escapeHtml(
                  product.name
                )}
              </strong>


              <small>
                ${store.escapeHtml(
                  product.size
                )}
              </small>


              <div
                class="cart-quantity"
              >

                <button
                  type="button"
                  data-cart-minus="${store.escapeHtml(
                    product.id
                  )}"
                >
                  −
                </button>

                <span>
                  ${Number(
                    item.quantity
                  ) || 1}
                </span>

                <button
                  type="button"
                  data-cart-plus="${store.escapeHtml(
                    product.id
                  )}"
                >
                  +
                </button>

              </div>

            </div>


            <div
              class="cart-item-price"
            >

              <strong>
                ${store.formatCurrency(
                  product.price *
                  item.quantity
                )}
              </strong>


              <button
                type="button"
                class="remove-cart-item"
                data-cart-remove="${store.escapeHtml(
                  product.id
                )}"
              >
                Eliminar
              </button>

            </div>

          </article>
        `;
      })
      .join("");


  cartSubtotal.textContent =
    store.formatCurrency(
      store.getCartSubtotal()
    );


  store.updateCartIndicators();
}


function openCart() {
  renderCart();

  cartDrawer.classList.add(
    "open"
  );

  drawerOverlay.classList.add(
    "open"
  );

  cartDrawer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );
}


function closeCart() {
  cartDrawer.classList.remove(
    "open"
  );

  drawerOverlay.classList.remove(
    "open"
  );

  cartDrawer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "no-scroll"
  );
}


function changeCartQuantity(
  productId,
  delta
) {
  const item =
    store
      .getCart()
      .find(
        cartItem =>
          String(
            cartItem.id
          ) ===
          String(
            productId
          )
      );


  if (!item) {
    return;
  }


  if (
    Number(item.quantity) +
    Number(delta) <=
    0
  ) {
    store.removeFromCart(
      productId
    );

    return;
  }


  store.updateQuantity(
    productId,
    delta
  );
}


/* ==========================================
   MOBILE MENU
========================================== */

function openMobileMenu() {
  mobileMenu.classList.add(
    "open"
  );

  mobileMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  mobileMenuButton.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.classList.add(
    "no-scroll"
  );
}


function closeMobileMenu() {
  mobileMenu.classList.remove(
    "open"
  );

  mobileMenu.setAttribute(
    "aria-hidden",
    "true"
  );

  mobileMenuButton.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "no-scroll"
  );
}


/* ==========================================
   EVENTS
========================================== */

catalogSearch.addEventListener(
  "input",
  event => {
    searchTerm =
      event.target.value;

    renderCatalog();
  }
);


catalogSort.addEventListener(
  "change",
  event => {
    sortMode =
      event.target.value;

    renderCatalog();
  }
);


categoryShortcuts.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-category]"
      );


    if (!button) {
      return;
    }


    setCategory(
      button.dataset.category
    );
  }
);


categoryFilterPanel.addEventListener(
  "change",
  event => {
    const input =
      event.target.closest(
        'input[name="catalogCategory"]'
      );


    if (!input) {
      return;
    }


    setCategory(
      input.value
    );
  }
);


filterAvailable.addEventListener(
  "change",
  event => {
    onlyAvailable =
      event.target.checked;

    renderCatalog();
  }
);


brandFilters.addEventListener(
  "change",
  event => {
    const input =
      event.target.closest(
        "[data-brand-filter]"
      );


    if (!input) {
      return;
    }


    if (input.checked) {
      selectedBrands.add(
        input.value
      );
    } else {
      selectedBrands.delete(
        input.value
      );
    }


    renderCatalog();
  }
);


sizeFilters.addEventListener(
  "change",
  event => {
    const input =
      event.target.closest(
        "[data-size-filter]"
      );


    if (!input) {
      return;
    }


    if (input.checked) {
      selectedSizes.add(
        input.value
      );
    } else {
      selectedSizes.delete(
        input.value
      );
    }


    renderCatalog();
  }
);


document.addEventListener(
  "click",
  event => {
    const toggle =
      event.target.closest(
        "[data-filter-toggle]"
      );


    if (toggle) {
      toggleFilterGroup(
        toggle
      );

      return;
    }


    const removeFilter =
      event.target.closest(
        "[data-remove-filter-type]"
      );


    if (removeFilter) {
      const type =
        removeFilter.dataset
          .removeFilterType;

      const value =
        removeFilter.dataset
          .removeFilterValue;


      if (
        type ===
        "category"
      ) {
        setCategory(
          "Todos"
        );

        return;
      }


      if (
        type ===
        "availability"
      ) {
        onlyAvailable =
          false;
      }


      if (
        type ===
        "brand"
      ) {
        selectedBrands.delete(
          value
        );
      }


      if (
        type ===
        "size"
      ) {
        selectedSizes.delete(
          value
        );
      }


      renderCatalog();

      return;
    }
  }
);


clearAllFiltersButton.addEventListener(
  "click",
  () => {
    clearAllFilters();
  }
);


clearAllFiltersTop.addEventListener(
  "click",
  () => {
    clearAllFilters();
  }
);


catalogEmptyReset.addEventListener(
  "click",
  () => {
    clearAllFilters();
  }
);


focusSearchButton.addEventListener(
  "click",
  () => {
    catalogSearch.focus();

    catalogSearch.scrollIntoView({
      behavior:
        "smooth",
      block:
        "center"
    });
  }
);


catalogGrid.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-add-product]"
      );


    if (!button) {
      return;
    }


    const product =
      store.getProductById(
        button.dataset.addProduct
      );


    if (
      !product ||
      !product.available
    ) {
      return;
    }


    const added =
      store.addToCart(
        product.id
      );


    if (
      added !==
      false
    ) {
      store.showToast(
        `${product.name} agregado al carrito`
      );
    }
  }
);


cartItems.addEventListener(
  "click",
  event => {
    const minus =
      event.target.closest(
        "[data-cart-minus]"
      );


    const plus =
      event.target.closest(
        "[data-cart-plus]"
      );


    const remove =
      event.target.closest(
        "[data-cart-remove]"
      );


    if (minus) {
      changeCartQuantity(
        minus.dataset.cartMinus,
        -1
      );

      return;
    }


    if (plus) {
      changeCartQuantity(
        plus.dataset.cartPlus,
        1
      );

      return;
    }


    if (remove) {
      store.removeFromCart(
        remove.dataset.cartRemove
      );
    }
  }
);


cartButton.addEventListener(
  "click",
  openCart
);


closeCartButton.addEventListener(
  "click",
  closeCart
);


drawerOverlay.addEventListener(
  "click",
  closeCart
);


checkoutButton.addEventListener(
  "click",
  () => {
    if (
      store.getCartCount() <= 0
    ) {
      store.showToast(
        "Tu carrito está vacío."
      );

      return;
    }


    window.location.href =
      "carrito.html";
  }
);

openCatalogFilters.addEventListener(
  "click",
  openFilterDrawer
);


closeCatalogFilters.addEventListener(
  "click",
  closeFilterDrawer
);


catalogFilterOverlay.addEventListener(
  "click",
  closeFilterDrawer
);


applyMobileFilters.addEventListener(
  "click",
  applyFiltersFromMobile
);


clearMobileFilters.addEventListener(
  "click",
  () => {
    selectedCategory =
      "Todos";

    onlyAvailable =
      false;

    selectedBrands.clear();

    selectedSizes.clear();

    buildMobileFilterContent();
  }
);


mobileMenuButton.addEventListener(
  "click",
  openMobileMenu
);


closeMobileMenuButton.addEventListener(
  "click",
  closeMobileMenu
);


mobileMenu
  .querySelectorAll(
    "a"
  )
  .forEach(link => {
    link.addEventListener(
      "click",
      closeMobileMenu
    );
  });


window.addEventListener(
  "duvant-cart-updated",
  renderCart
);


window.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
      "Escape"
    ) {
      closeCart();

      closeFilterDrawer();

      closeMobileMenu();
    }
  }
);


/* ==========================================
   INITIALIZE
========================================== */

async function initializeCatalog() {
  try {
    catalogResultCount.textContent =
      "Cargando...";

    catalogError.hidden =
      true;

    catalogEmpty.hidden =
      true;


    await store.loadProducts();


    readCategoryFromUrl();

    renderDynamicFilters();

    renderCatalog();

    renderCart();

    store.updateCartIndicators();


    document
      .querySelectorAll(
        "[data-current-year]"
      )
      .forEach(element => {
        element.textContent =
          String(
            new Date()
              .getFullYear()
          );
      });


    console.log(
      "DUVANT 12 Catálogo: productos cargados:",
      store.getProducts().length
    );

  } catch (error) {
    console.error(
      "Error cargando catálogo:",
      error
    );


    catalogGrid.innerHTML =
      "";

    catalogResultCount.textContent =
      "0 perfumes";

    catalogEmpty.hidden =
      true;

    catalogError.hidden =
      false;
  }
}


initializeCatalog();