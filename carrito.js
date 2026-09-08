"use strict";

/* ==========================================
   DUVANT 12 — CARRITO
========================================== */

const store = window.DuvantStore;

if (!store) {
  throw new Error(
    "DUVANT 12 Store Common no está disponible."
  );
}


/* ==========================================
   DOM
========================================== */

const cartLoading =
  document.getElementById(
    "cartLoading"
  );

const cartError =
  document.getElementById(
    "cartError"
  );

const cartEmptyPage =
  document.getElementById(
    "cartEmptyPage"
  );

const cartPageContent =
  document.getElementById(
    "cartPageContent"
  );

const cartPageItems =
  document.getElementById(
    "cartPageItems"
  );

const cartItemCountText =
  document.getElementById(
    "cartItemCountText"
  );

const cartSummaryCount =
  document.getElementById(
    "cartSummaryCount"
  );

const cartSummarySubtotal =
  document.getElementById(
    "cartSummarySubtotal"
  );

const cartSummaryTotal =
  document.getElementById(
    "cartSummaryTotal"
  );

const clearCartButton =
  document.getElementById(
    "clearCartButton"
  );

const goToCheckoutButton =
  document.getElementById(
    "goToCheckoutButton"
  );

const retryCartButton =
  document.getElementById(
    "retryCartButton"
  );


/* ==========================================
   MOBILE MENU
========================================== */

const mobileMenuButton =
  document.getElementById(
    "cartMobileMenuButton"
  );

const mobileMenu =
  document.getElementById(
    "cartMobileMenu"
  );

const closeMobileMenuButton =
  document.getElementById(
    "cartCloseMobileMenu"
  );


/* ==========================================
   PRODUCT CARD
========================================== */

function createCartItemMarkup(
  item
) {
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
          class="cart-page-real-image"
          src="${store.escapeHtml(
            imageUrl
          )}"
          alt="${store.escapeHtml(
            `${product.name} ${product.brand}`
          )}"
          loading="lazy"
        >
      `
      : `
        <div class="cart-page-image-fallback">
          <span>D12</span>
        </div>
      `;

  const availabilityMarkup =
    product.available
      ? `
        <span class="cart-product-availability available">
          Disponible
        </span>
      `
      : `
        <span class="cart-product-availability unavailable">
          No disponible
        </span>
      `;

  return `
    <article
      class="cart-page-product"
      data-cart-product="${store.escapeHtml(
        product.id
      )}"
    >

      <a
        href="producto.html?id=${encodeURIComponent(
          product.id
        )}"
        class="cart-page-product-image"
        aria-label="Ver ${store.escapeHtml(
          product.name
        )}"
      >
        ${imageMarkup}
      </a>


      <div class="cart-page-product-info">

        <div class="cart-page-product-copy">

          <span class="cart-page-product-brand">
            ${store.escapeHtml(
              product.brand
            )}
          </span>

          <a
            href="producto.html?id=${encodeURIComponent(
              product.id
            )}"
            class="cart-page-product-name"
          >
            ${store.escapeHtml(
              product.name
            )}
          </a>

          <span class="cart-page-product-meta">
            ${store.escapeHtml(
              product.size
            )}

            ${
              product.category
                ? ` · ${store.escapeHtml(
                    product.category
                  )}`
                : ""
            }
          </span>

          ${availabilityMarkup}

        </div>


        <div class="cart-page-product-controls">

          <div
            class="cart-quantity"
            aria-label="Cantidad"
          >

            <button
              type="button"
              data-cart-minus="${store.escapeHtml(
                product.id
              )}"
              aria-label="Disminuir cantidad de ${store.escapeHtml(
                product.name
              )}"
            >
              −
            </button>

            <span>
              ${Number(
                item.quantity
              )}
            </span>

            <button
              type="button"
              data-cart-plus="${store.escapeHtml(
                product.id
              )}"
              aria-label="Aumentar cantidad de ${store.escapeHtml(
                product.name
              )}"
              ${
                product.available
                  ? ""
                  : "disabled"
              }
            >
              +
            </button>

          </div>


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

      </div>


      <div class="cart-page-product-price">

        <span>
          ${store.formatCurrency(
            item.unitPrice
          )}
        </span>

        <strong>
          ${store.formatCurrency(
            item.lineTotal
          )}
        </strong>

      </div>

    </article>
  `;
}


/* ==========================================
   RENDER
========================================== */

function renderCart() {
  const items =
    store.getCartItems();

  const count =
    store.getCartCount();

  const subtotal =
    store.getCartSubtotal();

  store.updateCartIndicators();


  /* ========================================
     EMPTY CART
  ======================================== */

  if (!items.length) {
    cartPageItems.innerHTML =
      "";

    cartPageContent.hidden =
      true;

    cartEmptyPage.hidden =
      false;

    cartError.hidden =
      true;

    cartItemCountText.textContent =
      "0 productos";

    cartSummaryCount.textContent =
      "0";

    cartSummarySubtotal.textContent =
      store.formatCurrency(
        0
      );

    cartSummaryTotal.textContent =
      store.formatCurrency(
        0
      );

    return;
  }


  /* ========================================
     CONTENT
  ======================================== */

  cartEmptyPage.hidden =
    true;

  cartError.hidden =
    true;

  cartPageContent.hidden =
    false;


  cartPageItems.innerHTML =
    items
      .map(
        createCartItemMarkup
      )
      .join("");


  cartItemCountText.textContent =
    count === 1
      ? "1 producto"
      : `${count} productos`;


  cartSummaryCount.textContent =
    String(
      count
    );


  cartSummarySubtotal.textContent =
    store.formatCurrency(
      subtotal
    );


  cartSummaryTotal.textContent =
    store.formatCurrency(
      subtotal
    );


  /* ========================================
     CHECKOUT AVAILABILITY
  ======================================== */

  const cartAvailable =
    store.cartIsAvailable();


  goToCheckoutButton.disabled =
    !cartAvailable;


  if (cartAvailable) {
    goToCheckoutButton.innerHTML = `
      Ir al checkout
      <span>→</span>
    `;
  } else {
    goToCheckoutButton.innerHTML = `
      Revisa la disponibilidad
      <span>!</span>
    `;
  }
}


/* ==========================================
   CHANGE QUANTITY
========================================== */

function changeCartQuantity(
  productId,
  delta
) {
  const item =
    store
      .getCart()
      .find(
        cartItem =>
          cartItem.id ===
          String(
            productId
          )
      );


  if (!item) {
    return;
  }


  const currentQuantity =
    Number(
      item.quantity
    ) || 1;


  const nextQuantity =
    currentQuantity +
    Number(
      delta
    );


  if (
    nextQuantity <= 0
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
   CART ITEM EVENTS
========================================== */

cartPageItems.addEventListener(
  "click",
  event => {
    const minusButton =
      event.target.closest(
        "[data-cart-minus]"
      );

    const plusButton =
      event.target.closest(
        "[data-cart-plus]"
      );

    const removeButton =
      event.target.closest(
        "[data-cart-remove]"
      );


    if (minusButton) {
      changeCartQuantity(
        minusButton.dataset
          .cartMinus,
        -1
      );

      return;
    }


    if (plusButton) {
      changeCartQuantity(
        plusButton.dataset
          .cartPlus,
        1
      );

      return;
    }


    if (removeButton) {
      const productId =
        removeButton.dataset
          .cartRemove;


      store.removeFromCart(
        productId
      );


      store.showToast(
        "Producto eliminado del carrito."
      );
    }
  }
);


/* ==========================================
   CLEAR CART
========================================== */

clearCartButton.addEventListener(
  "click",
  () => {
    if (
      store.isCartEmpty()
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "¿Quieres vaciar tu carrito?"
      );


    if (!confirmed) {
      return;
    }


    store.clearCart();


    store.showToast(
      "Tu carrito quedó vacío."
    );
  }
);


/* ==========================================
   GO TO CHECKOUT
========================================== */

goToCheckoutButton.addEventListener(
  "click",
  async () => {

    if (
      store.isCartEmpty()
    ) {
      store.showToast(
        "Tu carrito está vacío."
      );

      return;
    }


    goToCheckoutButton.disabled =
      true;


    const originalMarkup =
      goToCheckoutButton.innerHTML;


    goToCheckoutButton.innerHTML = `
      Verificando...
      <span>···</span>
    `;


    try {

      /*
        Volvemos a consultar Supabase antes
        de permitir entrar al checkout.
      */

      await store.loadProducts();


      if (
        store.isCartEmpty()
      ) {
        store.showToast(
          "Tu carrito ya no contiene productos disponibles."
        );

        renderCart();

        return;
      }


      if (
        !store.cartIsAvailable()
      ) {
        store.showToast(
          "Hay productos sin disponibilidad en tu carrito."
        );

        renderCart();

        return;
      }


      window.location.href =
        "checkout.html";


    } catch (error) {
      console.error(
        "Error verificando carrito:",
        error
      );


      store.showToast(
        "No fue posible verificar tu carrito."
      );


    } finally {

      /*
        Si navegamos a checkout, esta parte
        prácticamente no se verá.
      */

      if (
        document.body.contains(
          goToCheckoutButton
        )
      ) {
        goToCheckoutButton.disabled =
          false;

        goToCheckoutButton.innerHTML =
          originalMarkup;
      }
    }
  }
);


/* ==========================================
   RETRY
========================================== */

retryCartButton.addEventListener(
  "click",
  () => {
    initializeCart();
  }
);


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
  .forEach(
    link => {
      link.addEventListener(
        "click",
        closeMobileMenu
      );
    }
  );


/* ==========================================
   SHARED CART UPDATE EVENT
========================================== */

window.addEventListener(
  "duvant-cart-updated",
  () => {
    renderCart();
  }
);


/* ==========================================
   KEYBOARD
========================================== */

window.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
      "Escape"
    ) {
      closeMobileMenu();
    }
  }
);


/* ==========================================
   INITIALIZE
========================================== */

async function initializeCart() {
  cartLoading.hidden =
    false;

  cartError.hidden =
    true;

  cartEmptyPage.hidden =
    true;

  cartPageContent.hidden =
    true;


  try {

    /*
      Cargamos el catálogo actual del
      Supabase de Inventario.
    */

    await store.loadProducts();


    renderCart();


    cartLoading.hidden =
      true;


  } catch (error) {
    console.error(
      "Error inicializando carrito:",
      error
    );


    cartLoading.hidden =
      true;

    cartEmptyPage.hidden =
      true;

    cartPageContent.hidden =
      true;

    cartError.hidden =
      false;


    store.showToast(
      "No fue posible verificar tu carrito."
    );
  }
}


/* ==========================================
   START
========================================== */

initializeCart();