"use strict";

/* ==========================================
   DUVANT 12 — CHECKOUT
   Backend conectado a create-order
========================================== */

const store = window.DuvantStore;

if (!store) {
  throw new Error(
    "DUVANT 12 Store Common no está disponible."
  );
}

if (!window.storeSupabase) {
  throw new Error(
    "Supabase de Tienda no está configurado."
  );
}


/* ==========================================
   STORAGE KEYS
========================================== */

const CHECKOUT_DRAFT_KEY =
  "duvant12_checkout_draft";

const CHECKOUT_REQUEST_KEY =
  "duvant12_checkout_request_id";


/* ==========================================
   DOM
========================================== */

const checkoutLoading =
  document.getElementById(
    "checkoutLoading"
  );

const checkoutEmpty =
  document.getElementById(
    "checkoutEmpty"
  );

const checkoutError =
  document.getElementById(
    "checkoutError"
  );

const checkoutContent =
  document.getElementById(
    "checkoutContent"
  );

const checkoutForm =
  document.getElementById(
    "checkoutForm"
  );

const checkoutRetry =
  document.getElementById(
    "checkoutRetry"
  );

const checkoutSubmitButton =
  document.getElementById(
    "checkoutSubmitButton"
  );

const checkoutSummaryProducts =
  document.getElementById(
    "checkoutSummaryProducts"
  );

const checkoutSummaryCount =
  document.getElementById(
    "checkoutSummaryCount"
  );

const checkoutSubtotal =
  document.getElementById(
    "checkoutSubtotal"
  );

const checkoutTotal =
  document.getElementById(
    "checkoutTotal"
  );

const checkoutReadyOverlay =
  document.getElementById(
    "checkoutReadyOverlay"
  );

const closeReadyModal =
  document.getElementById(
    "closeReadyModal"
  );

const checkoutReadyTitle =
  document.getElementById(
    "checkoutReadyTitle"
  );

const checkoutReadyParagraph =
  document.querySelector(
    ".checkout-ready-card p"
  );


/* ==========================================
   BASIC HELPERS
========================================== */

function sanitizeText(value) {
  return String(
    value ?? ""
  ).trim();
}


function normalizePhone(value) {
  return sanitizeText(
    value
  ).replace(
    /\D/g,
    ""
  );
}


function normalizePostalCode(value) {
  return sanitizeText(
    value
  ).replace(
    /\D/g,
    ""
  );
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}


/* ==========================================
   REQUEST ID
   Evita crear/descontar el mismo pedido
   dos veces si el usuario hace doble clic
   o reintenta.
========================================== */

function createRequestId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {
    return window.crypto.randomUUID();
  }

  const template =
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

  return template.replace(
    /[xy]/g,
    character => {
      const random =
        Math.floor(
          Math.random() * 16
        );

      const value =
        character === "x"
          ? random
          : (
              random &
              0x3 |
              0x8
            );

      return value.toString(
        16
      );
    }
  );
}


function getCheckoutRequestId() {
  let requestId =
    localStorage.getItem(
      CHECKOUT_REQUEST_KEY
    );

  if (!requestId) {
    requestId =
      createRequestId();

    localStorage.setItem(
      CHECKOUT_REQUEST_KEY,
      requestId
    );
  }

  return requestId;
}


function resetCheckoutRequestId() {
  localStorage.removeItem(
    CHECKOUT_REQUEST_KEY
  );
}


/* ==========================================
   CHECKOUT DRAFT
========================================== */

function loadDraft() {
  try {
    const stored =
      localStorage.getItem(
        CHECKOUT_DRAFT_KEY
      );

    if (!stored) {
      return null;
    }

    const parsed =
      JSON.parse(
        stored
      );

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    return parsed;

  } catch (error) {
    console.error(
      "Error cargando borrador de checkout:",
      error
    );

    return null;
  }
}


function saveDraft(data) {
  try {
    localStorage.setItem(
      CHECKOUT_DRAFT_KEY,
      JSON.stringify(
        data
      )
    );

  } catch (error) {
    console.error(
      "Error guardando borrador de checkout:",
      error
    );
  }
}


function populateDraft() {
  const draft =
    loadDraft();

  if (!draft) {
    return;
  }

  const fields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "address2",
    "neighborhood",
    "postalCode",
    "city",
    "state",
    "notes"
  ];

  fields.forEach(
    fieldName => {
      const field =
        checkoutForm.elements[
          fieldName
        ];

      if (
        field &&
        draft[fieldName] !==
          undefined
      ) {
        field.value =
          draft[fieldName];
      }
    }
  );
}


/* ==========================================
   CHECKOUT SUMMARY
========================================== */

function createSummaryItem(item) {
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
        <div class="checkout-summary-fallback">
          D12
        </div>
      `;

  return `
    <article class="checkout-summary-product">

      <div class="checkout-summary-image">

        ${imageMarkup}

        <span>
          ${item.quantity}
        </span>

      </div>


      <div class="checkout-summary-product-info">

        <small>
          ${store.escapeHtml(
            product.brand
          )}
        </small>

        <strong>
          ${store.escapeHtml(
            product.name
          )}
        </strong>

        <span>
          ${store.escapeHtml(
            product.size
          )}
        </span>

      </div>


      <strong class="checkout-summary-product-price">
        ${store.formatCurrency(
          item.lineTotal
        )}
      </strong>

    </article>
  `;
}


function renderSummary() {
  const items =
    store.getCartItems();

  const count =
    store.getCartCount();

  const subtotal =
    store.getCartSubtotal();

  checkoutSummaryProducts.innerHTML =
    items
      .map(
        createSummaryItem
      )
      .join("");

  checkoutSummaryCount.textContent =
    String(
      count
    );

  checkoutSubtotal.textContent =
    store.formatCurrency(
      subtotal
    );

  checkoutTotal.textContent =
    store.formatCurrency(
      subtotal
    );

  store.updateCartIndicators();
}


/* ==========================================
   FORM ERROR UI
========================================== */

function clearFieldErrors() {
  checkoutForm
    .querySelectorAll(
      ".checkout-field.invalid"
    )
    .forEach(
      field => {
        field.classList.remove(
          "invalid"
        );
      }
    );

  checkoutForm
    .querySelectorAll(
      "[data-error-for]"
    )
    .forEach(
      element => {
        element.textContent =
          "";
      }
    );
}


function setFieldError(
  fieldName,
  message
) {
  const field =
    checkoutForm.elements[
      fieldName
    ];

  const errorElement =
    checkoutForm.querySelector(
      `[data-error-for="${fieldName}"]`
    );

  if (field) {
    const wrapper =
      field.closest(
        ".checkout-field"
      );

    if (wrapper) {
      wrapper.classList.add(
        "invalid"
      );
    }
  }

  if (errorElement) {
    errorElement.textContent =
      message;
  }
}


/* ==========================================
   FORM DATA
========================================== */

function getFormData() {
  const formData =
    new FormData(
      checkoutForm
    );

  return {
    firstName:
      sanitizeText(
        formData.get(
          "firstName"
        )
      ),

    lastName:
      sanitizeText(
        formData.get(
          "lastName"
        )
      ),

    email:
      sanitizeText(
        formData.get(
          "email"
        )
      ).toLowerCase(),

    phone:
      normalizePhone(
        formData.get(
          "phone"
        )
      ),

    address:
      sanitizeText(
        formData.get(
          "address"
        )
      ),

    address2:
      sanitizeText(
        formData.get(
          "address2"
        )
      ),

    neighborhood:
      sanitizeText(
        formData.get(
          "neighborhood"
        )
      ),

    postalCode:
      normalizePostalCode(
        formData.get(
          "postalCode"
        )
      ),

    city:
      sanitizeText(
        formData.get(
          "city"
        )
      ),

    state:
      sanitizeText(
        formData.get(
          "state"
        )
      ),

    notes:
      sanitizeText(
        formData.get(
          "notes"
        )
      ),

    terms:
      formData.get(
        "terms"
      ) === "on"
  };
}


/* ==========================================
   VALIDATION
========================================== */

function validateForm(data) {
  clearFieldErrors();

  const errors = {};

  if (
    data.firstName.length <
    2
  ) {
    errors.firstName =
      "Ingresa tu nombre.";
  }

  if (
    data.lastName.length <
    2
  ) {
    errors.lastName =
      "Ingresa tus apellidos.";
  }

  if (
    !isValidEmail(
      data.email
    )
  ) {
    errors.email =
      "Ingresa un correo válido.";
  }

  if (
    data.phone.length !==
    10
  ) {
    errors.phone =
      "Ingresa un teléfono de 10 dígitos.";
  }

  if (
    data.address.length <
    5
  ) {
    errors.address =
      "Ingresa calle y número.";
  }

  if (
    data.neighborhood.length <
    2
  ) {
    errors.neighborhood =
      "Ingresa tu colonia.";
  }

  if (
    data.postalCode.length !==
    5
  ) {
    errors.postalCode =
      "El código postal debe tener 5 dígitos.";
  }

  if (
    data.city.length <
    2
  ) {
    errors.city =
      "Ingresa tu ciudad o municipio.";
  }

  if (!data.state) {
    errors.state =
      "Selecciona tu estado.";
  }

  if (!data.terms) {
    errors.terms =
      "Confirma que tus datos son correctos.";
  }

  Object.entries(
    errors
  ).forEach(
    ([field, message]) => {
      setFieldError(
        field,
        message
      );
    }
  );

  const firstError =
    Object.keys(
      errors
    )[0];

  if (firstError) {
    const field =
      checkoutForm.elements[
        firstError
      ];

    if (field) {
      field.focus();

      field.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });
    }
  }

  return (
    Object.keys(
      errors
    ).length === 0
  );
}


/* ==========================================
   BACKEND PAYLOAD
========================================== */

function buildOrderRequest(
  customerData
) {
  const items =
    store.getCartItems();

  return {
    client_request_id:
      getCheckoutRequestId(),

    customer: {
      first_name:
        customerData.firstName,

      last_name:
        customerData.lastName,

      email:
        customerData.email,

      phone:
        customerData.phone
    },

    shipping_address: {
      address:
        customerData.address,

      address2:
        customerData.address2,

      neighborhood:
        customerData.neighborhood,

      postal_code:
        customerData.postalCode,

      city:
        customerData.city,

      state:
        customerData.state,

      country:
        "México"
    },

    notes:
      customerData.notes,

    items:
      items.map(
        item => ({
          perfume_id:
            item.product.id,

          quantity:
            Number(
              item.quantity
            )
        })
      ),

    /*
      Honeypot anti-bot.
      Siempre debe permanecer vacío.
    */
    website:
      ""
  };
}


/* ==========================================
   SUCCESS MODAL
========================================== */

function openReadyModal(
  order
) {
  if (
    checkoutReadyTitle
  ) {
    checkoutReadyTitle.textContent =
      `Pedido ${order.order_number}`;
  }

  if (
    checkoutReadyParagraph
  ) {
    checkoutReadyParagraph.textContent =
      `Tu pedido fue creado correctamente por ${store.formatCurrency(
        Number(
          order.total
        )
      )}. El inventario fue procesado y el pedido quedó listo para la siguiente etapa de pago.`;
  }

  checkoutReadyOverlay.hidden =
    false;

  requestAnimationFrame(
    () => {
      checkoutReadyOverlay.classList.add(
        "open"
      );
    }
  );

  document.body.classList.add(
    "no-scroll"
  );
}


function closeReadyModalWindow() {
  checkoutReadyOverlay.classList.remove(
    "open"
  );

  document.body.classList.remove(
    "no-scroll"
  );

  window.setTimeout(
    () => {
      checkoutReadyOverlay.hidden =
        true;
    },
    220
  );
}


/* ==========================================
   BACKEND ERROR MESSAGE
========================================== */

function getBackendErrorMessage(
  errorCode
) {
  switch (
    errorCode
  ) {
    case "INVENTORY_UNAVAILABLE":
      return (
        "Uno o más perfumes ya no tienen suficiente existencia."
      );

    case "INVALID_CUSTOMER":
      return (
        "Los datos del cliente no son válidos."
      );

    case "INVALID_ADDRESS":
      return (
        "La dirección de entrega no es válida."
      );

    case "INVALID_PRODUCT":
      return (
        "Uno de los productos del carrito no es válido."
      );

    case "INVALID_QUANTITY":
      return (
        "La cantidad solicitada no es válida."
      );

    case "INVALID_ITEMS":
      return (
        "No fue posible validar los productos del carrito."
      );

    default:
      return (
        "No fue posible crear el pedido. Inténtalo nuevamente."
      );
  }
}


/* ==========================================
   SUBMIT
========================================== */

async function handleSubmit(
  event
) {
  event.preventDefault();

  const customerData =
    getFormData();

  if (
    !validateForm(
      customerData
    )
  ) {
    store.showToast(
      "Revisa los campos marcados."
    );

    return;
  }

  const initialItems =
    store.getCartItems();

  if (
    !initialItems.length
  ) {
    store.showToast(
      "Tu carrito está vacío."
    );

    return;
  }

  checkoutSubmitButton.disabled =
    true;

  checkoutSubmitButton.innerHTML = `
    Procesando pedido...
    <span>···</span>
  `;

  try {

    /* ========================================
       REFRESH PUBLIC CATALOG
    ======================================== */

    await store.loadProducts();

    const refreshedItems =
      store.getCartItems();

    if (
      !refreshedItems.length
    ) {
      store.showToast(
        "Tu carrito ya no contiene productos disponibles."
      );

      window.setTimeout(
        () => {
          window.location.href =
            "carrito.html";
        },
        900
      );

      return;
    }


    /* ========================================
       BASIC FRONTEND AVAILABILITY
    ======================================== */

    if (
      !store.cartIsAvailable()
    ) {
      store.showToast(
        "La disponibilidad de tu carrito cambió."
      );

      window.setTimeout(
        () => {
          window.location.href =
            "carrito.html";
        },
        1000
      );

      return;
    }


    /* ========================================
       SAVE CUSTOMER DRAFT
    ======================================== */

    saveDraft(
      customerData
    );


    /* ========================================
       CREATE REQUEST
    ======================================== */

    const requestBody =
      buildOrderRequest(
        customerData
      );

    console.log(
      "DUVANT 12 — Enviando pedido:",
      requestBody
    );


    /* ========================================
       CALL EDGE FUNCTION
    ======================================== */

    const {
      data,
      error
    } =
      await window.storeSupabase
        .functions
        .invoke(
          "create-order",
          {
            body:
              requestBody
          }
        );


    /* ========================================
       SUPABASE INVOCATION ERROR
    ======================================== */

    if (error) {
      console.error(
        "Error invocando create-order:",
        error
      );

      /*
        En algunas respuestas HTTP no-2xx,
        Supabase JS puede entregar el detalle
        principalmente dentro de error.

        No generamos un nuevo request ID:
        así el usuario puede reintentar de
        forma idempotente.
      */

      throw error;
    }


    /* ========================================
       INVALID RESPONSE
    ======================================== */

    if (
      !data ||
      typeof data !==
        "object"
    ) {
      throw new Error(
        "INVALID_SERVER_RESPONSE"
      );
    }


/* ========================================
   NORMALIZE BACKEND RESPONSE
======================================== */

if (
  data.ok === false
) {
  const message =
    getBackendErrorMessage(
      data.error
    );

  store.showToast(
    message
  );

  if (
    data.error ===
    "INVENTORY_UNAVAILABLE"
  ) {
    window.setTimeout(
      () => {
        window.location.href =
          "carrito.html";
      },
      1300
    );
  }

  return;
}


/*
  create-order puede responder:

  {
    ok: true,
    order: {...}
  }

  o directamente:

  {
    id: "...",
    order_number: "...",
    total: ...
  }
*/

const order =
  (
    data.order &&
    typeof data.order === "object"
  )
    ? data.order
    : data;


/* ========================================
   VALIDATE ORDER
======================================== */

if (
  !order ||
  !order.id ||
  !order.order_number
) {
  console.error(
    "DUVANT 12 — Respuesta inesperada de create-order:",
    data
  );

  throw new Error(
    "INVALID_ORDER_RESPONSE"
  );
}


/* ========================================
   SUCCESS
======================================== */

console.log(
  "DUVANT 12 — Pedido creado:",
  order
);


/*
  Todavía NO vaciamos el carrito.

  Se hará cuando implementemos y
  confirmemos correctamente el pago.
*/

openReadyModal(
  order
);

  } catch (error) {
    console.error(
      "Checkout error:",
      error
    );

    store.showToast(
      "No fue posible crear el pedido. Inténtalo nuevamente."
    );

  } finally {
    checkoutSubmitButton.disabled =
      false;

    checkoutSubmitButton.innerHTML = `
      Continuar al pago
      <span>→</span>
    `;
  }
}


/* ==========================================
   AUTOSAVE
========================================== */

function saveCurrentDraft() {
  const data =
    getFormData();

  saveDraft(
    data
  );
}


/* ==========================================
   FORM EVENTS
========================================== */

checkoutForm.addEventListener(
  "submit",
  handleSubmit
);


checkoutForm.addEventListener(
  "input",
  event => {
    const field =
      event.target;

    const wrapper =
      field.closest(
        ".checkout-field"
      );

    if (wrapper) {
      wrapper.classList.remove(
        "invalid"
      );
    }

    if (
      field.name
    ) {
      const errorElement =
        checkoutForm.querySelector(
          `[data-error-for="${field.name}"]`
        );

      if (errorElement) {
        errorElement.textContent =
          "";
      }
    }

    saveCurrentDraft();
  }
);


checkoutForm.addEventListener(
  "change",
  event => {
    const field =
      event.target;

    if (
      field.name
    ) {
      const errorElement =
        checkoutForm.querySelector(
          `[data-error-for="${field.name}"]`
        );

      if (errorElement) {
        errorElement.textContent =
          "";
      }
    }

    saveCurrentDraft();
  }
);


/* ==========================================
   RETRY
========================================== */

checkoutRetry.addEventListener(
  "click",
  () => {
    initializeCheckout();
  }
);


/* ==========================================
   MODAL EVENTS
========================================== */

closeReadyModal.addEventListener(
  "click",
  closeReadyModalWindow
);


checkoutReadyOverlay.addEventListener(
  "click",
  event => {
    if (
      event.target ===
      checkoutReadyOverlay
    ) {
      closeReadyModalWindow();
    }
  }
);


window.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
        "Escape" &&
      !checkoutReadyOverlay.hidden
    ) {
      closeReadyModalWindow();
    }
  }
);


/* ==========================================
   CART UPDATE
========================================== */

window.addEventListener(
  "duvant-cart-updated",
  () => {
    if (
      !checkoutContent.hidden
    ) {
      renderSummary();
    }
  }
);


/* ==========================================
   INITIALIZE CHECKOUT
========================================== */

async function initializeCheckout() {
  try {
    checkoutLoading.hidden =
      false;

    checkoutEmpty.hidden =
      true;

    checkoutError.hidden =
      true;

    checkoutContent.hidden =
      true;


    /* ========================================
       LOAD LIVE INVENTORY
    ======================================== */

    await store.loadProducts();


    const items =
      store.getCartItems();


    /* ========================================
       EMPTY CART
    ======================================== */

    if (!items.length) {
      checkoutLoading.hidden =
        true;

      checkoutEmpty.hidden =
        false;

      /*
        Si el carrito quedó vacío,
        el próximo pedido deberá obtener
        un request ID nuevo.
      */

      resetCheckoutRequestId();

      return;
    }


    /* ========================================
       AVAILABILITY
    ======================================== */

    if (
      !store.cartIsAvailable()
    ) {
      checkoutLoading.hidden =
        true;

      store.showToast(
        "La disponibilidad de tu carrito cambió."
      );

      window.setTimeout(
        () => {
          window.location.href =
            "carrito.html";
        },
        900
      );

      return;
    }


    /* ========================================
       RENDER
    ======================================== */

    renderSummary();

    populateDraft();

    /*
      Generamos el ID antes del submit.
      Todos los reintentos de este mismo
      checkout utilizan exactamente el
      mismo ID.
    */

    getCheckoutRequestId();


    checkoutLoading.hidden =
      true;

    checkoutContent.hidden =
      false;

  } catch (error) {
    console.error(
      "Error inicializando checkout:",
      error
    );

    checkoutLoading.hidden =
      true;

    checkoutContent.hidden =
      true;

    checkoutEmpty.hidden =
      true;

    checkoutError.hidden =
      false;
  }
}


/* ==========================================
   START
========================================== */

initializeCheckout();