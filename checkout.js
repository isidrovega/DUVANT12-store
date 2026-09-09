"use strict";

/* ==========================================
   DUVANT 12 — CHECKOUT + MERCADO PAGO
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

const CART_STORAGE_KEY =
  "duvant12_store_cart_v2";

const CONFIRMED_ORDER_KEY =
  "duvant12_confirmed_order_v1";


/* ==========================================
   PAYMENT CONFIRMATION
========================================== */

const ORDER_STATUS_POLL_INTERVAL =
  1500;

const ORDER_STATUS_POLL_TIMEOUT =
  30000;

const BACKGROUND_POLL_INTERVAL =
  5000;

const BACKGROUND_POLL_TIMEOUT =
  30 * 60 * 1000;

const CONFIRMATION_REDIRECT_DELAY =
  650;


/* ==========================================
   STATE
========================================== */

let activeOrder = null;

let activeOrderClientRequestId = null;

let mercadoPago = null;

let creatingOrder = false;

let paymentConfirmationIsRunning = false;

let backgroundPaymentMonitorIsRunning = false;

let paymentWasConfirmed = false;

let confirmationRedirectScheduled = false;


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


/* ==========================================
   PAYMENT DOM
========================================== */

const checkoutPaymentSection =
  document.getElementById(
    "checkoutPaymentSection"
  );

const checkoutPaymentLoading =
  document.getElementById(
    "checkoutPaymentLoading"
  );

const checkoutPaymentError =
  document.getElementById(
    "checkoutPaymentError"
  );

const checkoutPaymentOrderNumber =
  document.getElementById(
    "checkoutPaymentOrderNumber"
  );

const checkoutPaymentTotal =
  document.getElementById(
    "checkoutPaymentTotal"
  );

const cardPaymentBrickContainer =
  document.getElementById(
    "cardPaymentBrick_container"
  );


/* ==========================================
   RESULT MODAL
========================================== */

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

const checkoutReadyEyebrow =
  document.getElementById(
    "checkoutReadyEyebrow"
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


function scrollToElement(element) {
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function wait(milliseconds) {
  return new Promise(resolve => {
    window.setTimeout(
      resolve,
      milliseconds
    );
  });
}


/* ==========================================
   REQUEST ID
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


function createNewCheckoutRequestId() {
  const requestId =
    createRequestId();

  localStorage.setItem(
    CHECKOUT_REQUEST_KEY,
    requestId
  );

  return requestId;
}


function getCheckoutRequestId() {
  let requestId =
    localStorage.getItem(
      CHECKOUT_REQUEST_KEY
    );

  if (!requestId) {
    requestId =
      createNewCheckoutRequestId();
  }

  return requestId;
}


function resetCheckoutRequestId() {
  localStorage.removeItem(
    CHECKOUT_REQUEST_KEY
  );
}


/* ==========================================
   CONFIRMATION PAGE DATA
========================================== */

function saveConfirmedOrderForRedirect(
  order
) {
  const orderId =
    sanitizeText(
      order?.id
    );

  const clientRequestId =
    sanitizeText(
      activeOrderClientRequestId
    );

  if (
    !orderId ||
    !clientRequestId
  ) {
    console.error(
      "DUVANT 12 — No fue posible guardar la confirmación del pedido:",
      {
        order_id: orderId,
        has_client_request_id:
          Boolean(
            clientRequestId
          )
      }
    );

    return false;
  }

  try {
    sessionStorage.setItem(
      CONFIRMED_ORDER_KEY,
      JSON.stringify({
        order_id:
          orderId,

        client_request_id:
          clientRequestId
      })
    );

    return true;

  } catch (error) {
    console.error(
      "DUVANT 12 — Error guardando datos de confirmación:",
      error
    );

    return false;
  }
}


function redirectToConfirmationPage() {
  if (
    confirmationRedirectScheduled
  ) {
    return;
  }

  confirmationRedirectScheduled =
    true;

  window.setTimeout(
    () => {
      window.location.href =
        "pedido-confirmado.html";
    },
    CONFIRMATION_REDIRECT_DELAY
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
      typeof parsed !==
        "object"
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
   SUMMARY
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
   FORM ERRORS
========================================== */

function clearFieldErrors() {
  checkoutForm
    .querySelectorAll(
      ".checkout-field.invalid"
    )
    .forEach(field => {
      field.classList.remove(
        "invalid"
      );
    });

  checkoutForm
    .querySelectorAll(
      "[data-error-for]"
    )
    .forEach(element => {
      element.textContent =
        "";
    });
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
   CUSTOMER DATA
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
   ORDER REQUEST
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

    website:
      ""
  };
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
   PAYMENT ERROR UI
========================================== */

function clearPaymentError() {
  checkoutPaymentError.textContent =
    "";

  checkoutPaymentError.classList.remove(
    "visible"
  );
}


function showPaymentError(
  message
) {
  checkoutPaymentError.textContent =
    message;

  checkoutPaymentError.classList.add(
    "visible"
  );
}


/* ==========================================
   LOCK CUSTOMER FORM
========================================== */

function lockCustomerForm() {
  checkoutForm
    .querySelectorAll(
      "input, select, textarea, button"
    )
    .forEach(element => {
      element.disabled =
        true;
    });

  checkoutForm.classList.add(
    "checkout-customer-locked"
  );
}


/* ==========================================
   MERCADO PAGO CONFIG
========================================== */

async function getMercadoPagoPublicKey() {
  const {
    data,
    error
  } =
    await window.storeSupabase
      .functions
      .invoke(
        "get-mp-config",
        {
          body: {}
        }
      );

  if (error) {
    console.error(
      "get-mp-config:",
      error
    );

    throw new Error(
      "MP_CONFIG_ERROR"
    );
  }

  if (
    !data ||
    data.ok !== true ||
    !data.public_key
  ) {
    console.error(
      "Respuesta get-mp-config:",
      data
    );

    throw new Error(
      "MP_CONFIG_INVALID"
    );
  }

  return sanitizeText(
    data.public_key
  );
}


/* ==========================================
   ORDER STATUS
========================================== */

async function getOrderStatus(
  orderId,
  clientRequestId
) {
  const {
    data,
    error
  } =
    await window.storeSupabase
      .functions
      .invoke(
        "get-order-status",
        {
          body: {
            order_id:
              orderId,

            client_request_id:
              clientRequestId
          }
        }
      );

  if (error) {
    console.error(
      "get-order-status:",
      error
    );

    throw new Error(
      "ORDER_STATUS_ERROR"
    );
  }

  if (
    !data ||
    data.ok !== true ||
    !data.order
  ) {
    console.error(
      "Respuesta get-order-status:",
      data
    );

    throw new Error(
      "ORDER_STATUS_INVALID"
    );
  }

  return data.order;
}


/* ==========================================
   ORDER STATUS HELPERS
========================================== */

function getNormalizedOrderState(
  order
) {
  return {
    paymentStatus:
      sanitizeText(
        order?.payment_status
      ).toLowerCase(),

    orderStatus:
      sanitizeText(
        order?.status
      ).toLowerCase()
  };
}


function orderIsPaid(order) {
  const {
    paymentStatus,
    orderStatus
  } =
    getNormalizedOrderState(
      order
    );

  return (
    paymentStatus ===
      "paid" &&
    orderStatus ===
      "paid"
  );
}


function orderPaymentFailed(order) {
  const {
    paymentStatus,
    orderStatus
  } =
    getNormalizedOrderState(
      order
    );

  return (
    paymentStatus ===
      "failed" ||
    paymentStatus ===
      "cancelled" ||
    paymentStatus ===
      "canceled" ||
    orderStatus ===
      "payment_failed" ||
    orderStatus ===
      "cancelled" ||
    orderStatus ===
      "canceled"
  );
}


function logOrderStatus(order) {
  const {
    paymentStatus,
    orderStatus
  } =
    getNormalizedOrderState(
      order
    );

  console.log(
    "DUVANT 12 — Estado del pedido:",
    {
      order_number:
        order?.order_number,

      status:
        orderStatus,

      payment_status:
        paymentStatus
    }
  );
}


/* ==========================================
   INITIAL PAYMENT POLLING
========================================== */

async function waitForPaymentConfirmation(
  order
) {
  if (
    paymentConfirmationIsRunning
  ) {
    return null;
  }

  paymentConfirmationIsRunning =
    true;

  const clientRequestId =
    activeOrderClientRequestId ||
    getCheckoutRequestId();

  const startedAt =
    Date.now();

  try {
    while (
      Date.now() -
        startedAt <
      ORDER_STATUS_POLL_TIMEOUT
    ) {
      let currentOrder;

      try {
        currentOrder =
          await getOrderStatus(
            order.id,
            clientRequestId
          );

      } catch (error) {
        console.warn(
          "No fue posible consultar temporalmente el pedido:",
          error
        );

        await wait(
          ORDER_STATUS_POLL_INTERVAL
        );

        continue;
      }

      logOrderStatus(
        currentOrder
      );

      if (
        orderIsPaid(
          currentOrder
        )
      ) {
        return currentOrder;
      }

      if (
        orderPaymentFailed(
          currentOrder
        )
      ) {
        throw new Error(
          "PAYMENT_FAILED"
        );
      }

      await wait(
        ORDER_STATUS_POLL_INTERVAL
      );
    }

    throw new Error(
      "PAYMENT_CONFIRMATION_TIMEOUT"
    );

  } finally {
    paymentConfirmationIsRunning =
      false;
  }
}


/* ==========================================
   SUCCESSFUL CHECKOUT
========================================== */

function clearCheckoutAfterPayment() {
  localStorage.removeItem(
    CART_STORAGE_KEY
  );

  localStorage.removeItem(
    CHECKOUT_DRAFT_KEY
  );

  resetCheckoutRequestId();

  if (
    typeof store.updateCartIndicators ===
      "function"
  ) {
    store.updateCartIndicators();
  }

  window.dispatchEvent(
    new CustomEvent(
      "duvant-cart-updated"
    )
  );
}


/* ==========================================
   PAYMENT RESULT MODAL
========================================== */

function openPaymentResultModal(
  order,
  mercadoPagoResult
) {
  const status =
    sanitizeText(
      mercadoPagoResult?.status
    ).toLowerCase();

  const statusDetail =
    sanitizeText(
      mercadoPagoResult?.status_detail
    ).toLowerCase();

  if (checkoutReadyEyebrow) {
    checkoutReadyEyebrow.textContent =
      "PAGO ENVIADO";
  }

  if (
    status === "approved" ||
    status === "processed" ||
    statusDetail === "accredited"
  ) {
    checkoutReadyTitle.textContent =
      `Pedido ${order.order_number}`;

    checkoutReadyParagraph.textContent =
      "Mercado Pago recibió correctamente tu pago. Estamos confirmando la operación para finalizar tu pedido.";

  } else if (
    status === "pending" ||
    status === "processing" ||
    status === "in_process"
  ) {
    checkoutReadyTitle.textContent =
      `Pedido ${order.order_number}`;

    checkoutReadyParagraph.textContent =
      "Tu pago está siendo procesado por Mercado Pago. El pedido quedará confirmado cuando recibamos la aprobación.";

  } else {
    checkoutReadyTitle.textContent =
      `Pedido ${order.order_number}`;

    checkoutReadyParagraph.textContent =
      "La solicitud de pago fue enviada a Mercado Pago. Estamos esperando la confirmación definitiva de la operación.";
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


function showConfirmedPaymentModal(
  order
) {
  if (checkoutReadyEyebrow) {
    checkoutReadyEyebrow.textContent =
      "PAGO CONFIRMADO";
  }

  checkoutReadyTitle.textContent =
    `Pedido ${order.order_number}`;

  checkoutReadyParagraph.textContent =
    "Tu pago fue confirmado correctamente. Estamos abriendo la confirmación de tu pedido.";

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


function showPendingConfirmationModal(
  order
) {
  if (checkoutReadyEyebrow) {
    checkoutReadyEyebrow.textContent =
      "CONFIRMANDO PAGO";
  }

  checkoutReadyTitle.textContent =
    `Pedido ${order.order_number}`;

  checkoutReadyParagraph.textContent =
    "Mercado Pago recibió la operación, pero la confirmación está tardando más de lo esperado. No realices otro pago. Seguiremos verificando automáticamente tu pedido.";

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


function showFailedPaymentModal(
  order
) {
  if (checkoutReadyEyebrow) {
    checkoutReadyEyebrow.textContent =
      "PAGO NO CONFIRMADO";
  }

  checkoutReadyTitle.textContent =
    `Pedido ${order.order_number}`;

  checkoutReadyParagraph.textContent =
    "Mercado Pago no pudo confirmar el pago. No se realizará otro cobro automáticamente.";

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
   FINALIZE CONFIRMED PAYMENT IN FRONTEND
========================================== */

function handleConfirmedPayment(
  confirmedOrder
) {
  if (paymentWasConfirmed) {
    return;
  }

  paymentWasConfirmed =
    true;

  console.log(
    "DUVANT 12 — Pago confirmado por backend:",
    confirmedOrder
  );

  /*
    Primero guardamos el ID del pedido y
    client_request_id ANTES de limpiar
    localStorage.
  */

  const confirmationSaved =
    saveConfirmedOrderForRedirect(
      confirmedOrder
    );

  /*
    Únicamente ahora vaciamos carrito,
    borrador y request ID.
  */

  clearCheckoutAfterPayment();

  /*
    Mostramos confirmación visual breve.
  */

  showConfirmedPaymentModal(
    confirmedOrder
  );

  /*
    Si la información necesaria para
    pedido-confirmado.html fue guardada,
    redirigimos automáticamente.
  */

  if (confirmationSaved) {
    redirectToConfirmationPage();
  } else {
    console.error(
      "DUVANT 12 — Pago confirmado, pero no se pudo preparar la redirección."
    );
  }
}


/* ==========================================
   BACKGROUND PAYMENT MONITOR
========================================== */

async function startBackgroundPaymentMonitor(
  order
) {
  if (
    backgroundPaymentMonitorIsRunning ||
    paymentWasConfirmed
  ) {
    return;
  }

  backgroundPaymentMonitorIsRunning =
    true;

  const clientRequestId =
    activeOrderClientRequestId ||
    getCheckoutRequestId();

  const startedAt =
    Date.now();

  console.log(
    "DUVANT 12 — Iniciando confirmación de pago en segundo plano:",
    {
      order_id:
        order.id,

      order_number:
        order.order_number
    }
  );

  try {
    while (
      !paymentWasConfirmed &&
      Date.now() -
        startedAt <
        BACKGROUND_POLL_TIMEOUT
    ) {
      let currentOrder;

      try {
        currentOrder =
          await getOrderStatus(
            order.id,
            clientRequestId
          );

      } catch (error) {
        console.warn(
          "DUVANT 12 — Consulta de pago en segundo plano falló temporalmente:",
          error
        );

        await wait(
          BACKGROUND_POLL_INTERVAL
        );

        continue;
      }

      logOrderStatus(
        currentOrder
      );

      if (
        orderIsPaid(
          currentOrder
        )
      ) {
        handleConfirmedPayment(
          currentOrder
        );

        return;
      }

      if (
        orderPaymentFailed(
          currentOrder
        )
      ) {
        console.warn(
          "DUVANT 12 — El backend marcó el pago como no confirmado:",
          currentOrder
        );

        showFailedPaymentModal(
          currentOrder
        );

        showPaymentError(
          "Mercado Pago no pudo confirmar el pago."
        );

        return;
      }

      await wait(
        BACKGROUND_POLL_INTERVAL
      );
    }

    if (
      !paymentWasConfirmed
    ) {
      console.warn(
        "DUVANT 12 — Monitor de pago detenido por tiempo máximo:",
        {
          order_id:
            order.id,

          order_number:
            order.order_number
        }
      );
    }

  } finally {
    backgroundPaymentMonitorIsRunning =
      false;
  }
}


/* ==========================================
   PAYMENT CONFIRMATION
========================================== */

async function confirmPaymentAfterSubmission(
  order
) {
  try {
    const confirmedOrder =
      await waitForPaymentConfirmation(
        order
      );

    if (!confirmedOrder) {
      return;
    }

    handleConfirmedPayment(
      confirmedOrder
    );

  } catch (error) {
    console.error(
      "Confirmación del pago:",
      error
    );

    if (
      error?.message ===
        "PAYMENT_FAILED"
    ) {
      showFailedPaymentModal(
        order
      );

      showPaymentError(
        "Mercado Pago no pudo confirmar el pago."
      );

      return;
    }

    if (
      error?.message ===
        "PAYMENT_CONFIRMATION_TIMEOUT"
    ) {
      showPendingConfirmationModal(
        order
      );

      void startBackgroundPaymentMonitor(
        order
      );

      return;
    }

    showPaymentError(
      "No pudimos consultar temporalmente la confirmación del pago. Seguiremos verificando tu pedido."
    );

    showPendingConfirmationModal(
      order
    );

    void startBackgroundPaymentMonitor(
      order
    );
  }
}


/* ==========================================
   CREATE MP PAYMENT
========================================== */

async function processMercadoPagoPayment(
  formData
) {
  if (!activeOrder) {
    throw new Error(
      "NO_ACTIVE_ORDER"
    );
  }

  const token =
    sanitizeText(
      formData?.token
    );

  const paymentMethodId =
    sanitizeText(
      formData?.payment_method_id ||
      formData?.paymentMethodId
    );

  const installments =
    Math.max(
      1,
      Number(
        formData?.installments ||
        1
      )
    );

  if (!token) {
    throw new Error(
      "CARD_TOKEN_MISSING"
    );
  }

  if (!paymentMethodId) {
    throw new Error(
      "PAYMENT_METHOD_MISSING"
    );
  }

  const requestBody = {
    order_id:
      activeOrder.id,

    card_token:
      token,

    payment_method_id:
      paymentMethodId,

    payment_method_type:
      "credit_card",

    installments:
      installments
  };

  console.log(
    "DUVANT 12 — Enviando pago:",
    {
      order_id:
        activeOrder.id,

      payment_method_id:
        paymentMethodId,

      installments:
        installments
    }
  );

  const {
    data,
    error
  } =
    await window.storeSupabase
      .functions
      .invoke(
        "create-mp-order",
        {
          body:
            requestBody
        }
      );

  if (error) {
    console.error(
      "create-mp-order:",
      error
    );

    throw new Error(
      "MP_FUNCTION_ERROR"
    );
  }

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    throw new Error(
      "MP_INVALID_RESPONSE"
    );
  }

  if (
    data.ok !== true
  ) {
    console.error(
      "Mercado Pago:",
      data
    );

    throw new Error(
      sanitizeText(
        data.error
      ) ||
      "MP_PAYMENT_ERROR"
    );
  }

  return data;
}


/* ==========================================
   INIT CARD PAYMENT BRICK
========================================== */

async function initializeMercadoPago(
  order,
  customerData
) {
  checkoutPaymentLoading.hidden =
    false;

  clearPaymentError();

  if (
    typeof window.MercadoPago !==
      "function"
  ) {
    throw new Error(
      "MP_SDK_NOT_AVAILABLE"
    );
  }

  const publicKey =
    await getMercadoPagoPublicKey();

  const amount =
    Number(
      order.total
    );

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "INVALID_ORDER_TOTAL"
    );
  }

  if (
    window.cardPaymentBrickController &&
    typeof window
      .cardPaymentBrickController
      .unmount ===
      "function"
  ) {
    try {
      await window
        .cardPaymentBrickController
        .unmount();

    } catch (error) {
      console.warn(
        "No fue posible desmontar Brick anterior:",
        error
      );
    }
  }

  cardPaymentBrickContainer.innerHTML =
    "";

  mercadoPago =
    new window.MercadoPago(
      publicKey,
      {
        locale:
          "es-MX"
      }
    );

  const bricksBuilder =
    mercadoPago.bricks();

  const settings = {

    initialization: {
      amount:
        amount,

      payer: {
        email:
          customerData.email
      }
    },

    customization: {

      visual: {

        style: {

          customVariables: {

            textPrimaryColor:
              "#E7E7E7",

            textSecondaryColor:
              "#BEBEBE",

            inputBackgroundColor:
              "#111111",

            formBackgroundColor:
              "#0B0B0B",

            baseColor:
              "#D6D6D6",

            baseColorFirstVariant:
              "#BDBDBD",

            baseColorSecondVariant:
              "#8F8F8F",

            outlinePrimaryColor:
              "#CFCFCF",

            outlineSecondaryColor:
              "#555555",

            buttonTextColor:
              "#090909",

            errorColor:
              "#E88A8A",

            successColor:
              "#D2D2D2",

            successSecondaryColor:
              "#9E9E9E",

            inputBorderWidth:
              "1px",

            inputFocusedBorderWidth:
              "1px",

            inputVerticalPadding:
              "12px",

            inputHorizontalPadding:
              "14px",

            borderRadiusSmall:
              "0px",

            borderRadiusMedium:
              "0px",

            borderRadiusLarge:
              "0px",

            inputFocusedBoxShadow:
              "0 0 0 1px rgba(210,210,210,0.25)",

            inputErrorFocusedBoxShadow:
              "0 0 0 1px rgba(232,138,138,0.25)"
          }
        },

        texts: {

          formTitle:
            "Tarjeta",

          cardNumber: {
            label:
              "Número de tarjeta",

            placeholder:
              "Número de tarjeta"
          },

          cardExpirationDate: {
            label:
              "Vencimiento",

            placeholder:
              "MM/AA"
          },

          cardSecurityCode: {
            label:
              "Código de seguridad",

            placeholder:
              "CVV"
          },

          cardholderName: {
            label:
              "Nombre del titular",

            placeholder:
              "Como aparece en la tarjeta"
          },

          installmentsSectionTitle:
            "Mensualidades",

          selectInstallments:
            "Selecciona las mensualidades",

          formSubmit:
            "Pagar ahora"
        }
      },

      paymentMethods: {
        minInstallments:
          1
      }
    },

    callbacks: {

      onReady:
        () => {
          checkoutPaymentLoading.hidden =
            true;

          clearPaymentError();

          console.log(
            "DUVANT 12 — Card Payment Brick listo."
          );
        },

      onSubmit:
        async formData => {

          clearPaymentError();

          try {
            const result =
              await processMercadoPagoPayment(
                formData
              );

            console.log(
              "DUVANT 12 — Resultado Mercado Pago:",
              result
            );

            const submittedOrder =
              result.order ||
              activeOrder;

            activeOrder =
              submittedOrder;

            openPaymentResultModal(
              submittedOrder,
              result.mercado_pago ||
                {}
            );

            void confirmPaymentAfterSubmission(
              submittedOrder
            );

            return Promise.resolve();

          } catch (error) {
            console.error(
              "Payment error:",
              error
            );

            let message =
              "No fue posible procesar el pago. Revisa los datos de tu tarjeta e inténtalo nuevamente.";

            if (
              error?.message ===
              "MP_FUNCTION_ERROR"
            ) {
              message =
                "Mercado Pago no pudo procesar la operación en este momento.";
            }

            if (
              error?.message ===
                "CARD_TOKEN_MISSING" ||
              error?.message ===
                "PAYMENT_METHOD_MISSING"
            ) {
              message =
                "Revisa los datos de tu tarjeta antes de continuar.";
            }

            showPaymentError(
              message
            );

            store.showToast(
              "No fue posible procesar el pago."
            );

            return Promise.reject(
              error
            );
          }
        },

      onError:
        error => {

          console.error(
            "Mercado Pago Brick:",
            error
          );

          checkoutPaymentLoading.hidden =
            true;

          showPaymentError(
            "Ocurrió un problema con el formulario seguro de Mercado Pago."
          );
        }
    }
  };

  window.cardPaymentBrickController =
    await bricksBuilder.create(
      "cardPayment",
      "cardPaymentBrick_container",
      settings
    );
}


/* ==========================================
   SHOW PAYMENT STAGE
========================================== */

async function showPaymentStage(
  order,
  customerData
) {
  activeOrder =
    order;

  /*
    Guardamos el request ID exacto de este
    pedido antes de cualquier limpieza.
  */

  activeOrderClientRequestId =
    getCheckoutRequestId();

  checkoutPaymentOrderNumber.textContent =
    order.order_number;

  checkoutPaymentTotal.textContent =
    store.formatCurrency(
      Number(
        order.total
      )
    );

  checkoutPaymentSection.hidden =
    false;

  lockCustomerForm();

  scrollToElement(
    checkoutPaymentSection
  );

  try {
    await initializeMercadoPago(
      order,
      customerData
    );

  } catch (error) {
    console.error(
      "Error inicializando Mercado Pago:",
      error
    );

    checkoutPaymentLoading.hidden =
      true;

    showPaymentError(
      "No fue posible iniciar Mercado Pago. Actualiza la página e inténtalo nuevamente."
    );
  }
}


/* ==========================================
   CREATE STORE ORDER
========================================== */

async function createStoreOrder(
  customerData
) {
  const requestBody =
    buildOrderRequest(
      customerData
    );

  console.log(
    "DUVANT 12 — Enviando pedido:",
    requestBody
  );

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

  if (error) {
    console.error(
      "Error invocando create-order:",
      error
    );

    throw error;
  }

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    throw new Error(
      "INVALID_SERVER_RESPONSE"
    );
  }

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

    return null;
  }

  const order =
    (
      data.order &&
      typeof data.order ===
        "object"
    )
      ? data.order
      : data;

  if (
    !order ||
    !order.id ||
    !order.order_number
  ) {
    console.error(
      "Respuesta inesperada create-order:",
      data
    );

    throw new Error(
      "INVALID_ORDER_RESPONSE"
    );
  }

  return order;
}


/* ==========================================
   CUSTOMER SUBMIT
========================================== */

async function handleSubmit(
  event
) {
  event.preventDefault();

  if (
    creatingOrder ||
    activeOrder
  ) {
    return;
  }

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

  creatingOrder =
    true;

  checkoutSubmitButton.disabled =
    true;

  checkoutSubmitButton.innerHTML = `
    Preparando pago...
    <span>···</span>
  `;

  try {

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

    saveDraft(
      customerData
    );

    const order =
      await createStoreOrder(
        customerData
      );

    if (!order) {
      return;
    }

    console.log(
      "DUVANT 12 — Pedido reservado:",
      order
    );

    await showPaymentStage(
      order,
      customerData
    );

  } catch (error) {
    console.error(
      "Checkout order error:",
      error
    );

    store.showToast(
      "No fue posible preparar el pedido. Inténtalo nuevamente."
    );

  } finally {
    creatingOrder =
      false;

    if (!activeOrder) {
      checkoutSubmitButton.disabled =
        false;

      checkoutSubmitButton.innerHTML = `
        Continuar al pago
        <span>→</span>
      `;
    }
  }
}


/* ==========================================
   AUTOSAVE
========================================== */

function saveCurrentDraft() {
  if (activeOrder) {
    return;
  }

  const data =
    getFormData();

  saveDraft(
    data
  );
}


/* ==========================================
   CUSTOMER FORM EVENTS
========================================== */

checkoutForm.addEventListener(
  "submit",
  handleSubmit
);


checkoutForm.addEventListener(
  "input",
  event => {
    if (activeOrder) {
      return;
    }

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
    if (activeOrder) {
      return;
    }

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
   MODAL
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
   INITIALIZE
========================================== */

async function initializeCheckout() {
  try {
    activeOrder =
      null;

    activeOrderClientRequestId =
      null;

    paymentConfirmationIsRunning =
      false;

    backgroundPaymentMonitorIsRunning =
      false;

    paymentWasConfirmed =
      false;

    confirmationRedirectScheduled =
      false;

    /*
      Limpiamos cualquier confirmación vieja.
      Solamente una compra nueva confirmada
      puede volver a crear este valor.
    */

    sessionStorage.removeItem(
      CONFIRMED_ORDER_KEY
    );

    checkoutLoading.hidden =
      false;

    checkoutEmpty.hidden =
      true;

    checkoutError.hidden =
      true;

    checkoutContent.hidden =
      true;

    checkoutPaymentSection.hidden =
      true;

    await store.loadProducts();

    const items =
      store.getCartItems();

    if (!items.length) {
      checkoutLoading.hidden =
        true;

      checkoutEmpty.hidden =
        false;

      resetCheckoutRequestId();

      return;
    }

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

    renderSummary();

    populateDraft();

    /*
      Nueva entrada al checkout =
      nueva intención de compra.
    */

    createNewCheckoutRequestId();

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