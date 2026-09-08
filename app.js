"use strict";

/* ==========================================
   DUVANT 12 — HOME
========================================== */

const store =
  window.DuvantStore;

if (!store) {
  throw new Error(
    "DUVANT 12 Store Common no está disponible."
  );
}


/* ==========================================
   STATE
========================================== */

let products = [];


/* ==========================================
   DOM
========================================== */

const siteHeader =
  document.getElementById(
    "siteHeader"
  );

const mobileMenuButton =
  document.getElementById(
    "mobileMenuButton"
  );

const mobileMenu =
  document.getElementById(
    "mobileMenu"
  );

const closeMobileMenuButton =
  document.getElementById(
    "closeMobileMenu"
  );

const searchButton =
  document.getElementById(
    "searchButton"
  );

const searchOverlay =
  document.getElementById(
    "searchOverlay"
  );

const closeSearchButton =
  document.getElementById(
    "closeSearch"
  );

const storeSearchInput =
  document.getElementById(
    "storeSearchInput"
  );

const searchResults =
  document.getElementById(
    "searchResults"
  );

const cartButton =
  document.getElementById(
    "cartButton"
  );

const cartDrawer =
  document.getElementById(
    "cartDrawer"
  );

const drawerOverlay =
  document.getElementById(
    "drawerOverlay"
  );

const closeCartButton =
  document.getElementById(
    "closeCart"
  );

const cartItems =
  document.getElementById(
    "cartItems"
  );

const cartEmpty =
  document.getElementById(
    "cartEmpty"
  );

const cartFooter =
  document.getElementById(
    "cartFooter"
  );

const cartSubtotal =
  document.getElementById(
    "cartSubtotal"
  );

const featuredProducts =
  document.getElementById(
    "featuredProducts"
  );

const bestsellerProducts =
  document.getElementById(
    "bestsellerProducts"
  );

const newProducts =
  document.getElementById(
    "newProducts"
  );

const newsletterForm =
  document.getElementById(
    "newsletterForm"
  );

const checkoutButton =
  document.getElementById(
    "checkoutButton"
  );


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


function getAvailableProducts() {
  return products.filter(
    product =>
      product.available
  );
}


function getProductImageMarkup(
  product,
  imageClass =
    "home-product-real-image"
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
        imageClass
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


/* ==========================================
   PRODUCT CARD
========================================== */

function createProductCard(
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


  const availability =
    product.available
      ? "Disponible"
      : "Agotado";


  return `
    <article
      class="product-card"
      data-product-id="${store.escapeHtml(
        product.id
      )}"
    >

      <a
        class="product-image"
        href="producto.html?id=${encodeURIComponent(
          product.id
        )}"
        aria-label="Ver ${store.escapeHtml(
          product.name
        )}"
      >

        ${badge}

        ${getProductImageMarkup(
          product
        )}

      </a>


      <div class="product-details">

        <span class="product-brand">
          ${store.escapeHtml(
            product.brand
          )}
        </span>


        <div class="product-title-row">

          <a
            href="producto.html?id=${encodeURIComponent(
              product.id
            )}"
          >
            <h3>
              ${store.escapeHtml(
                product.name
              )}
            </h3>
          </a>


          <strong>
            ${store.formatCurrency(
              product.price
            )}
          </strong>

        </div>


        <span class="product-size">
          ${store.escapeHtml(
            product.size
          )}
          ·
          ${store.escapeHtml(
            product.category
          )}
          ·
          ${availability}
        </span>


        <button
          class="add-cart-button"
          type="button"
          data-add-to-cart="${store.escapeHtml(
            product.id
          )}"
          ${
            product.available
              ? ""
              : "disabled"
          }
        >
          ${
            product.available
              ? "Agregar al carrito"
              : "Agotado"
          }
        </button>

      </div>

    </article>
  `;
}


/* ==========================================
   FEATURED
========================================== */

function renderFeaturedProducts() {
  if (!featuredProducts) {
    return;
  }


  let items =
    products.filter(
      product =>
        product.featured &&
        product.available
    );


  if (!items.length) {
    items =
      getAvailableProducts();
  }


  items =
    items.slice(
      0,
      4
    );


  if (!items.length) {
    featuredProducts.innerHTML = `
      <div class="home-empty">
        No hay perfumes disponibles.
      </div>
    `;

    return;
  }


  featuredProducts.innerHTML =
    items
      .map(
        createProductCard
      )
      .join("");
}


/* ==========================================
   BESTSELLERS
========================================== */

function renderBestsellers() {
  if (!bestsellerProducts) {
    return;
  }


  let items =
    products.filter(
      product =>
        product.bestseller &&
        product.available
    );


  if (!items.length) {
    items =
      getAvailableProducts();
  }


  items =
    items.slice(
      0,
      4
    );


  if (!items.length) {
    bestsellerProducts.innerHTML = `
      <div class="home-empty">
        No hay perfumes disponibles.
      </div>
    `;

    return;
  }


  bestsellerProducts.innerHTML =
    items
      .map(
        createProductCard
      )
      .join("");
}


/* ==========================================
   NEW ARRIVALS
========================================== */

function renderNewProducts() {
  if (!newProducts) {
    return;
  }


  /*
   * Por ahora tomamos primero los productos
   * cuyo badge contiene "Nuevo".
   *
   * Más adelante podremos alimentar esta sección
   * directamente con created_at desde Supabase.
   */

  let items =
    products.filter(
      product =>
        product.available &&
        normalizeText(
          product.badge
        ).includes(
          "nuevo"
        )
    );


  if (items.length < 4) {
    const alreadySelected =
      new Set(
        items.map(
          product =>
            String(
              product.id
            )
        )
      );


    const fallback =
      getAvailableProducts()
        .filter(
          product =>
            !alreadySelected.has(
              String(
                product.id
              )
            )
        );


    items = [
      ...items,
      ...fallback
    ];
  }


  items =
    items.slice(
      0,
      4
    );


  if (!items.length) {
    newProducts.innerHTML = `
      <div class="home-empty">
        No hay perfumes disponibles.
      </div>
    `;

    return;
  }


  newProducts.innerHTML =
    items
      .map(
        createProductCard
      )
      .join("");
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
                  aria-label="Disminuir cantidad"
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
                  aria-label="Aumentar cantidad"
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
                class="remove-cart-item"
                type="button"
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


function increaseQuantity(
  productId
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


  store.updateQuantity(
    productId,
    Number(
      item.quantity
    ) + 1
  );
}


function decreaseQuantity(
  productId
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


  const nextQuantity =
    Number(
      item.quantity
    ) - 1;


  if (nextQuantity <= 0) {
    store.removeFromCart(
      productId
    );

    return;
  }


  store.updateQuantity(
    productId,
    nextQuantity
  );
}


/* ==========================================
   DRAWER
========================================== */

function openCart() {
  renderCart();


  cartDrawer?.classList.add(
    "open"
  );

  drawerOverlay?.classList.add(
    "open"
  );


  cartDrawer?.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "no-scroll"
  );
}


function closeCart() {
  cartDrawer?.classList.remove(
    "open"
  );

  drawerOverlay?.classList.remove(
    "open"
  );


  cartDrawer?.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "no-scroll"
  );
}


/* ==========================================
   MOBILE MENU
========================================== */

function openMobileMenu() {
  mobileMenu?.classList.add(
    "open"
  );


  mobileMenu?.setAttribute(
    "aria-hidden",
    "false"
  );


  mobileMenuButton?.setAttribute(
    "aria-expanded",
    "true"
  );


  document.body.classList.add(
    "no-scroll"
  );
}


function closeMobileMenu() {
  mobileMenu?.classList.remove(
    "open"
  );


  mobileMenu?.setAttribute(
    "aria-hidden",
    "true"
  );


  mobileMenuButton?.setAttribute(
    "aria-expanded",
    "false"
  );


  document.body.classList.remove(
    "no-scroll"
  );
}


/* ==========================================
   SEARCH
========================================== */

function openSearch() {
  searchOverlay?.classList.add(
    "open"
  );


  searchOverlay?.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "no-scroll"
  );


  window.setTimeout(
    () => {
      storeSearchInput?.focus();
    },
    100
  );
}


function closeSearch() {
  searchOverlay?.classList.remove(
    "open"
  );


  searchOverlay?.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "no-scroll"
  );
}


function renderSearchResults(
  value
) {
  if (!searchResults) {
    return;
  }


  const query =
    normalizeText(
      value
    );


  if (!query) {
    searchResults.innerHTML = `
      <p class="search-hint">
        Escribe el nombre de una fragancia o marca.
      </p>
    `;

    return;
  }


  const matches =
    products
      .filter(product => {
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
      })
      .slice(
        0,
        8
      );


  if (!matches.length) {
    searchResults.innerHTML = `
      <p class="search-hint">
        No encontramos perfumes para
        “${store.escapeHtml(
          value
        )}”.
      </p>
    `;

    return;
  }


  searchResults.innerHTML =
    matches
      .map(product => `
        <button
          class="search-result-item"
          type="button"
          data-search-product="${store.escapeHtml(
            product.id
          )}"
        >

          <div>

            <strong>
              ${store.escapeHtml(
                product.name
              )}
            </strong>

            <span>
              ${store.escapeHtml(
                product.brand
              )}
              ·
              ${store.escapeHtml(
                product.size
              )}
            </span>

          </div>


          <b>
            ${store.formatCurrency(
              product.price
            )}
          </b>

        </button>
      `)
      .join("");
}


/* ==========================================
   EVENTS
========================================== */

mobileMenuButton?.addEventListener(
  "click",
  openMobileMenu
);


closeMobileMenuButton?.addEventListener(
  "click",
  closeMobileMenu
);


mobileMenu
  ?.querySelectorAll(
    "a"
  )
  .forEach(link => {
    link.addEventListener(
      "click",
      closeMobileMenu
    );
  });


searchButton?.addEventListener(
  "click",
  openSearch
);


closeSearchButton?.addEventListener(
  "click",
  closeSearch
);


searchOverlay?.addEventListener(
  "click",
  event => {
    if (
      event.target ===
      searchOverlay
    ) {
      closeSearch();
    }
  }
);


storeSearchInput?.addEventListener(
  "input",
  event => {
    renderSearchResults(
      event.target.value
    );
  }
);


searchResults?.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-search-product]"
      );


    if (!button) {
      return;
    }


    window.location.href =
      `producto.html?id=${encodeURIComponent(
        button.dataset.searchProduct
      )}`;
  }
);


cartButton?.addEventListener(
  "click",
  openCart
);


closeCartButton?.addEventListener(
  "click",
  closeCart
);


drawerOverlay?.addEventListener(
  "click",
  closeCart
);


document.addEventListener(
  "click",
  event => {
    const addButton =
      event.target.closest(
        "[data-add-to-cart]"
      );


    if (addButton) {
      const product =
        store.getProductById(
          addButton.dataset.addToCart
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


      return;
    }


    const minus =
      event.target.closest(
        "[data-cart-minus]"
      );


    if (minus) {
      decreaseQuantity(
        minus.dataset.cartMinus
      );

      return;
    }


    const plus =
      event.target.closest(
        "[data-cart-plus]"
      );


    if (plus) {
      increaseQuantity(
        plus.dataset.cartPlus
      );

      return;
    }


    const remove =
      event.target.closest(
        "[data-cart-remove]"
      );


    if (remove) {
      store.removeFromCart(
        remove.dataset.cartRemove
      );

      return;
    }


    const scrollButton =
      event.target.closest(
        "[data-scroll-section]"
      );


    if (scrollButton) {
      document
        .getElementById(
          scrollButton.dataset
            .scrollSection
        )
        ?.scrollIntoView({
          behavior:
            "smooth"
        });
    }
  }
);


newsletterForm?.addEventListener(
  "submit",
  event => {
    event.preventDefault();


    const input =
      document.getElementById(
        "newsletterEmail"
      );


    if (
      !input ||
      !input.checkValidity()
    ) {
      input?.reportValidity();

      return;
    }


    store.showToast(
      "Gracias por unirte a DUVANT 12"
    );


    newsletterForm.reset();
  }
);


checkoutButton?.addEventListener(
  "click",
  () => {
    store.showToast(
      "El checkout será nuestra siguiente etapa."
    );
  }
);


window.addEventListener(
  "duvant-cart-updated",
  renderCart
);


window.addEventListener(
  "scroll",
  () => {
    siteHeader?.classList.toggle(
      "scrolled",
      window.scrollY > 20
    );
  },
  {
    passive:
      true
  }
);


window.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
      "Escape"
    ) {
      closeCart();

      closeSearch();

      closeMobileMenu();
    }
  }
);


/* ==========================================
   INITIALIZE
========================================== */

async function initializeStore() {
  try {
    await store.loadProducts();


    products =
      store.getProducts();


    renderBestsellers();

    renderNewProducts();

    renderFeaturedProducts();

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
      "DUVANT 12 Home: catálogo cargado:",
      products.length
    );

  } catch (error) {
    console.error(
      "DUVANT 12 Home: error cargando catálogo:",
      error
    );


    const errorMarkup = `
      <div class="home-empty">
        No pudimos cargar los perfumes.
      </div>
    `;


    if (featuredProducts) {
      featuredProducts.innerHTML =
        errorMarkup;
    }


    if (bestsellerProducts) {
      bestsellerProducts.innerHTML =
        errorMarkup;
    }


    if (newProducts) {
      newProducts.innerHTML =
        errorMarkup;
    }
  }
}


initializeStore();