"use strict";

/* ==========================================
   DUVANT 12 — PRODUCT PAGE V2
========================================== */

const store =
  window.DuvantStore;

if (!store) {
  throw new Error(
    "DUVANT 12 Store Common no está disponible."
  );
}


/* ==========================================
   PARAMS / STATE
========================================== */

const params =
  new URLSearchParams(
    window.location.search
  );

const productId =
  params.get("id");

let product =
  null;

let quantity =
  1;


/* ==========================================
   DOM
========================================== */

const pageContent =
  document.getElementById(
    "productPageContent"
  );

const notFound =
  document.getElementById(
    "productNotFound"
  );

const relatedSection =
  document.getElementById(
    "relatedSection"
  );

const breadcrumbName =
  document.getElementById(
    "breadcrumbName"
  );

const productCategory =
  document.getElementById(
    "productCategory"
  );

const productBrand =
  document.getElementById(
    "productBrand"
  );

const productName =
  document.getElementById(
    "productName"
  );

const productSize =
  document.getElementById(
    "productSize"
  );

const productCode =
  document.getElementById(
    "productCode"
  );

const productAvailability =
  document.getElementById(
    "productAvailability"
  );

const productPrice =
  document.getElementById(
    "productPrice"
  );

const productDescription =
  document.getElementById(
    "productDescription"
  );

const productNotes =
  document.getElementById(
    "productNotes"
  );

const productBadge =
  document.getElementById(
    "productBadge"
  );

const productImageWrapper =
  document.getElementById(
    "productImageWrapper"
  );

const productBottleFallback =
  document.getElementById(
    "productBottleFallback"
  );

const bottleBrand =
  document.getElementById(
    "bottleBrand"
  );

const quantityMinus =
  document.getElementById(
    "quantityMinus"
  );

const quantityPlus =
  document.getElementById(
    "quantityPlus"
  );

const quantityDisplay =
  document.getElementById(
    "productQuantity"
  );

const addToCartButton =
  document.getElementById(
    "productAddToCart"
  );

const addButtonPrice =
  document.getElementById(
    "addButtonPrice"
  );

const relatedProducts =
  document.getElementById(
    "relatedProducts"
  );


/* ==========================================
   CART
========================================== */

const cartButton =
  document.getElementById(
    "productCartButton"
  );

const cartDrawer =
  document.getElementById(
    "productCartDrawer"
  );

const drawerOverlay =
  document.getElementById(
    "productDrawerOverlay"
  );

const closeCartButton =
  document.getElementById(
    "productCloseCart"
  );

const cartItems =
  document.getElementById(
    "productCartItems"
  );

const cartEmpty =
  document.getElementById(
    "productCartEmpty"
  );

const cartFooter =
  document.getElementById(
    "productCartFooter"
  );

const cartSubtotal =
  document.getElementById(
    "productCartSubtotal"
  );

const checkoutButton =
  document.getElementById(
    "productCheckoutButton"
  );


/* ==========================================
   MOBILE MENU
========================================== */

const mobileMenuButton =
  document.getElementById(
    "productMobileMenuButton"
  );

const mobileMenu =
  document.getElementById(
    "productMobileMenu"
  );

const closeMobileMenuButton =
  document.getElementById(
    "productCloseMobileMenu"
  );


/* ==========================================
   HELPERS
========================================== */

function getProductImageMarkup(
  item,
  className = ""
) {
  const imageUrl =
    store.getProductImageUrl(
      item
    );


  if (!imageUrl) {
    return null;
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
        `${item.name} ${item.brand}`
      )}"
      loading="lazy"
    >
  `;
}


/* ==========================================
   NOT FOUND
========================================== */

function showNotFound() {
  pageContent.hidden =
    true;

  notFound.hidden =
    false;

  relatedSection.hidden =
    true;

  breadcrumbName.textContent =
    "No encontrado";

  document.title =
    "Perfume no encontrado | DUVANT 12";
}


/* ==========================================
   MAIN IMAGE
========================================== */

function renderMainImage() {
  if (!product) {
    return;
  }


  const imageUrl =
    store.getProductImageUrl(
      product
    );


  if (!imageUrl) {
    productBottleFallback.hidden =
      false;

    return;
  }


  productBottleFallback.hidden =
    true;


  const existingImage =
    productImageWrapper
      .querySelector(
        ".product-main-real-image"
      );


  if (existingImage) {
    existingImage.remove();
  }


  const image =
    document.createElement(
      "img"
    );


  image.className =
    "product-main-real-image";

  image.src =
    imageUrl;

  image.alt =
    `${product.name} ${product.brand}`;

  image.loading =
    "eager";


  image.addEventListener(
    "error",
    () => {
      image.remove();

      productBottleFallback.hidden =
        false;
    }
  );


  productImageWrapper.appendChild(
    image
  );
}


/* ==========================================
   PRODUCT
========================================== */

function renderProduct() {
  if (!product) {
    showNotFound();

    return;
  }


  pageContent.hidden =
    false;

  notFound.hidden =
    true;


  document.title =
    `${product.name} · ${product.brand} | DUVANT 12`;


  breadcrumbName.textContent =
    product.name;


  productCategory.textContent =
    product.category ||
    "Perfume";


  productBrand.textContent =
    product.brand ||
    "DUVANT 12";


  productName.textContent =
    product.name;


  productSize.textContent =
    product.size ||
    "—";


  productCode.textContent =
    product.code ||
    "DUVANT 12";


  productPrice.textContent =
    store.formatCurrency(
      product.price
    );


  productDescription.textContent =
    product.description ||
    "Fragancia seleccionada por DUVANT 12.";


  bottleBrand.textContent =
    product.brand ||
    "DUVANT";


  if (product.badge) {
    productBadge.hidden =
      false;

    productBadge.textContent =
      product.badge;
  } else {
    productBadge.hidden =
      true;

    productBadge.textContent =
      "";
  }


  if (product.available) {
    productAvailability.classList.remove(
      "unavailable"
    );

    productAvailability.classList.add(
      "available"
    );

    productAvailability.innerHTML = `
      <i></i>
      Disponible
    `;
  } else {
    productAvailability.classList.remove(
      "available"
    );

    productAvailability.classList.add(
      "unavailable"
    );

    productAvailability.innerHTML = `
      <i></i>
      Agotado
    `;
  }


  const notes =
    Array.isArray(
      product.notes
    )
      ? product.notes
      : [];


  productNotes.innerHTML =
    notes.length
      ? notes
          .map(
            note => `
              <span>
                ${store.escapeHtml(
                  note
                )}
              </span>
            `
          )
          .join("")
      : `
          <span>
            Selección D12
          </span>
        `;


  addToCartButton.disabled =
    !product.available;


  quantityMinus.disabled =
    !product.available;

  quantityPlus.disabled =
    !product.available;


  if (!product.available) {
    addToCartButton.innerHTML = `
      <span>
        Agotado
      </span>

      <strong>
        —
      </strong>
    `;
  }


  renderMainImage();

  updateQuantityDisplay();

  renderRelatedProducts();
}


/* ==========================================
   QUANTITY
========================================== */

function updateQuantityDisplay() {
  if (!product) {
    return;
  }


  quantityDisplay.textContent =
    String(
      quantity
    );


  if (!product.available) {
    return;
  }


  addButtonPrice.textContent =
    store.formatCurrency(
      product.price *
      quantity
    );
}


/* ==========================================
   RELATED
========================================== */

function renderRelatedProducts() {
  if (!product) {
    return;
  }


  const allProducts =
    store.getProducts();


  const sameCategory =
    allProducts.filter(
      item =>
        String(
          item.id
        ) !==
        String(
          product.id
        ) &&
        item.category ===
          product.category &&
        item.available
    );


  const sameBrand =
    allProducts.filter(
      item =>
        String(
          item.id
        ) !==
        String(
          product.id
        ) &&
        item.brand ===
          product.brand &&
        item.category !==
          product.category &&
        item.available
    );


  const others =
    allProducts.filter(
      item =>
        String(
          item.id
        ) !==
        String(
          product.id
        ) &&
        item.brand !==
          product.brand &&
        item.category !==
          product.category &&
        item.available
    );


  const unique =
    new Map();


  [
    ...sameCategory,
    ...sameBrand,
    ...others
  ].forEach(item => {
    unique.set(
      String(
        item.id
      ),
      item
    );
  });


  const related =
    [
      ...unique.values()
    ].slice(
      0,
      4
    );


  if (!related.length) {
    relatedSection.hidden =
      true;

    return;
  }


  relatedSection.hidden =
    false;


  relatedProducts.innerHTML =
    related
      .map(item => {
        const badge =
          item.badge
            ? `
              <span class="product-badge">
                ${store.escapeHtml(
                  item.badge
                )}
              </span>
            `
            : "";


        const imageMarkup =
          getProductImageMarkup(
            item,
            "related-real-product-image"
          ) ||
          store.createBottleMarkup(
            "D12"
          );


        return `
          <article
            class="product-card"
            data-product-id="${store.escapeHtml(
              item.id
            )}"
          >

            <a
              href="producto.html?id=${encodeURIComponent(
                item.id
              )}"
              class="product-image"
              aria-label="Ver ${store.escapeHtml(
                item.name
              )}"
            >

              ${badge}

              ${imageMarkup}

            </a>


            <div class="product-details">

              <span class="product-brand">
                ${store.escapeHtml(
                  item.brand
                )}
              </span>


              <div class="product-title-row">

                <a
                  href="producto.html?id=${encodeURIComponent(
                    item.id
                  )}"
                >

                  <h3>
                    ${store.escapeHtml(
                      item.name
                    )}
                  </h3>

                </a>


                <strong>
                  ${store.formatCurrency(
                    item.price
                  )}
                </strong>

              </div>


              <span class="product-size">
                ${store.escapeHtml(
                  item.size
                )}
                ·
                ${store.escapeHtml(
                  item.category
                )}
              </span>


              <button
                type="button"
                class="add-cart-button"
                data-related-add="${store.escapeHtml(
                  item.id
                )}"
              >
                Agregar al carrito
              </button>

            </div>

          </article>
        `;
      })
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
        const cartProduct =
          store.getProductById(
            item.id
          );


        if (!cartProduct) {
          return null;
        }


        return {
          ...item,
          product:
            cartProduct
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
        const cartProduct =
          item.product;


        const imageUrl =
          store.getProductImageUrl(
            cartProduct
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
                  cartProduct.name
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
                  cartProduct.brand
                )}
              </span>


              <strong>
                ${store.escapeHtml(
                  cartProduct.name
                )}
              </strong>


              <small>
                ${store.escapeHtml(
                  cartProduct.size
                )}
              </small>


              <div class="cart-quantity">

                <button
                  type="button"
                  data-cart-minus="${store.escapeHtml(
                    cartProduct.id
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
                    cartProduct.id
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
                  cartProduct.price *
                  item.quantity
                )}
              </strong>


              <button
                type="button"
                class="remove-cart-item"
                data-cart-remove="${store.escapeHtml(
                  cartProduct.id
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

quantityMinus.addEventListener(
  "click",
  () => {
    if (
      !product ||
      !product.available
    ) {
      return;
    }


    quantity =
      Math.max(
        1,
        quantity - 1
      );


    updateQuantityDisplay();
  }
);


quantityPlus.addEventListener(
  "click",
  () => {
    if (
      !product ||
      !product.available
    ) {
      return;
    }


    quantity +=
      1;


    updateQuantityDisplay();
  }
);


addToCartButton.addEventListener(
  "click",
  () => {
    if (
      !product ||
      !product.available
    ) {
      return;
    }


    const added =
      store.addToCart(
        product.id,
        quantity
      );


    if (
      added ===
      false
    ) {
      return;
    }


    store.showToast(
      `${quantity} × ${product.name} agregado al carrito`
    );


    openCart();
  }
);


relatedProducts.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-related-add]"
      );


    if (!button) {
      return;
    }


    const relatedProduct =
      store.getProductById(
        button.dataset.relatedAdd
      );


    if (
      !relatedProduct ||
      !relatedProduct.available
    ) {
      return;
    }


    const added =
      store.addToCart(
        relatedProduct.id
      );


    if (
      added !==
      false
    ) {
      store.showToast(
        `${relatedProduct.name} agregado al carrito`
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

      closeMobileMenu();
    }
  }
);


/* ==========================================
   INITIALIZE
========================================== */

async function initializeProductPage() {
  if (!productId) {
    showNotFound();

    return;
  }


  try {
    product =
      await store.loadProduct(
        productId
      );


    if (!product) {
      showNotFound();

      return;
    }


    await store.loadProducts();


    product =
      store.getProductById(
        productId
      ) ||
      product;


    renderProduct();

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
      "DUVANT 12 Producto cargado:",
      product.id,
      product.name
    );

  } catch (error) {
    console.error(
      "Error cargando producto:",
      error
    );


    showNotFound();


    store.showToast(
      "No fue posible cargar este perfume."
    );
  }
}


initializeProductPage();