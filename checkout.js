"use strict";

/* ==========================================
   DUVANT 12 — CHECKOUT
   ENVIATODO + MERCADO PAGO
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
   SHIPPING
========================================== */

const ZIP_LOOKUP_DELAY =
  350;

const SHIPPING_QUOTE_DELAY =
  850;


/* ==========================================
   STATE
========================================== */

let activeOrder = null;

let activeOrderClientRequestId = null;

let mercadoPago = null;

let creatingOrder = false;

let paymentConfirmationIsRunning = false;

let backgroundPaymentMonitorIsRunning =
  false;

let paymentWasConfirmed = false;

let confirmationRedirectScheduled =
  false;


/* ==========================================
   SHIPPING STATE
========================================== */

let zipLookupTimer = null;

let shippingQuoteTimer = null;

let zipLookupSequence = 0;

let shippingQuoteSequence = 0;

let zipLookupIsRunning = false;

let shippingQuoteIsRunning = false;

let activeZipCode = "";

let activeShippingQuote = null;

let activeShippingFingerprint = "";

let selectedShippingRate = null;

let draftNeighborhoodToRestore = "";


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

const checkoutShippingTotal =
  document.getElementById(
    "checkoutShippingTotal"
  );

const checkoutTotal =
  document.getElementById(
    "checkoutTotal"
  );


/* ==========================================
   ADDRESS DOM
========================================== */

const postalCodeField =
  document.getElementById(
    "postalCode"
  );

const neighborhoodField =
  document.getElementById(
    "neighborhood"
  );

const cityField =
  document.getElementById(
    "city"
  );

const stateField =
  document.getElementById(
    "state"
  );

const stateCodeField =
  document.getElementById(
    "stateCode"
  );

const checkoutZipStatus =
  document.getElementById(
    "checkoutZipStatus"
  );


/* ==========================================
   SHIPPING DOM
========================================== */

const checkoutShippingSection =
  document.getElementById(
    "checkoutShippingSection"
  );

const checkoutShippingStatus =
  document.getElementById(
    "checkoutShippingStatus"
  );

const checkoutShippingRates =
  document.getElementById(
    "checkoutShippingRates"
  );

const checkoutShippingError =
  document.getElementById(
    "checkoutShippingError"
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


function moneyValue(value) {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Number(
    number.toFixed(
      2
    )
  );
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
        order_id:
          orderId,

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
    return null;
  }

  const fields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "street",
    "extNumber",
    "address2",
    "postalCode",
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

  draftNeighborhoodToRestore =
    sanitizeText(
      draft.neighborhood
    );

  return draft;
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


function getSelectedShippingPrice() {
  if (!selectedShippingRate) {
    return 0;
  }

  return moneyValue(
    selectedShippingRate.price
  );
}


function renderSummary() {
  const items =
    store.getCartItems();

  const count =
    store.getCartCount();

  const subtotal =
    moneyValue(
      store.getCartSubtotal()
    );

  const shipping =
    getSelectedShippingPrice();

  const total =
    Number(
      (
        subtotal +
        shipping
      ).toFixed(
        2
      )
    );

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

  if (selectedShippingRate) {
    checkoutShippingTotal.textContent =
      store.formatCurrency(
        shipping
      );

  } else {
    checkoutShippingTotal.textContent =
      "Por calcular";
  }

  checkoutTotal.textContent =
    store.formatCurrency(
      total
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

  checkoutShippingError.textContent =
    "";
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

    street:
      sanitizeText(
        formData.get(
          "street"
        )
      ),

    extNumber:
      sanitizeText(
        formData.get(
          "extNumber"
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

    stateCode:
      sanitizeText(
        formData.get(
          "stateCode"
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
   SHIPPING FINGERPRINT
========================================== */

function getCartShippingFingerprint() {
  const items =
    store.getCartItems();

  return items
    .map(
      item => ({
        id:
          sanitizeText(
            item.product?.id
          ),

        quantity:
          Number(
            item.quantity
          )
      })
    )
    .sort(
      (a, b) =>
        a.id.localeCompare(
          b.id
        )
    );
}


function createShippingFingerprint(
  data
) {
  return JSON.stringify({
    firstName:
      data.firstName,

    lastName:
      data.lastName,

    email:
      data.email,

    phone:
      data.phone,

    street:
      data.street,

    extNumber:
      data.extNumber,

    address2:
      data.address2,

    neighborhood:
      data.neighborhood,

    postalCode:
      data.postalCode,

    city:
      data.city,

    state:
      data.state,

    stateCode:
      data.stateCode,

    items:
      getCartShippingFingerprint()
  });
}


/* ==========================================
   SHIPPING UI HELPERS
========================================== */

function setZipStatus(
  message,
  type = ""
) {
  checkoutZipStatus.textContent =
    message;

  checkoutZipStatus.classList.remove(
    "loading",
    "success",
    "error"
  );

  if (type) {
    checkoutZipStatus.classList.add(
      type
    );
  }
}


function setShippingStatus(
  message,
  type = ""
) {
  checkoutShippingStatus.textContent =
    message;

  checkoutShippingStatus.classList.remove(
    "loading",
    "success",
    "error"
  );

  if (type) {
    checkoutShippingStatus.classList.add(
      type
    );
  }
}


function setShippingError(
  message = ""
) {
  checkoutShippingError.textContent =
    message;
}


/* ==========================================
   SHIPPING RESET
========================================== */

function resetShippingSelection({
  clearRates = true,
  clearQuote = true
} = {}) {
  selectedShippingRate =
    null;

  if (clearQuote) {
    activeShippingQuote =
      null;

    activeShippingFingerprint =
      "";
  }

  if (clearRates) {
    checkoutShippingRates.innerHTML =
      "";
  }

  setShippingError(
    ""
  );

  renderSummary();
}


function invalidateShippingQuote(
  message =
    "Completa tu dirección para calcular el envío."
) {
  shippingQuoteSequence +=
    1;

  shippingQuoteIsRunning =
    false;

  if (shippingQuoteTimer) {
    window.clearTimeout(
      shippingQuoteTimer
    );

    shippingQuoteTimer =
      null;
  }

  resetShippingSelection();

  setShippingStatus(
    message
  );
}


/* ==========================================
   ZIP RESET
========================================== */

function clearLocationFields() {
  neighborhoodField.innerHTML = `
    <option value="">
      Primero ingresa tu código postal
    </option>
  `;

  neighborhoodField.disabled =
    true;

  cityField.value =
    "";

  stateField.value =
    "";

  stateCodeField.value =
    "";

  activeZipCode =
    "";
}


/* ==========================================
   ZIP LOOKUP
========================================== */

async function lookupPostalCode(
  postalCode,
  {
    restoreNeighborhood = ""
  } = {}
) {
  const normalizedPostalCode =
    normalizePostalCode(
      postalCode
    );

  if (
    normalizedPostalCode.length !==
    5
  ) {
    clearLocationFields();

    setZipStatus(
      ""
    );

    invalidateShippingQuote();

    return false;
  }

  const sequence =
    ++zipLookupSequence;

  zipLookupIsRunning =
    true;

  neighborhoodField.disabled =
    true;

  setZipStatus(
    "Buscando código postal...",
    "loading"
  );

  try {
    const {
      data,
      error
    } =
      await window.storeSupabase
        .functions
        .invoke(
          "enviatodo-zipcode",
          {
            body: {
              zip_code:
                normalizedPostalCode
            }
          }
        );

    if (
      sequence !==
      zipLookupSequence
    ) {
      return false;
    }

    if (error) {
      console.error(
        "enviatodo-zipcode:",
        error
      );

      throw new Error(
        "ZIP_LOOKUP_ERROR"
      );
    }

    if (
      !data ||
      data.success !== true ||
      !data.location
    ) {
      console.error(
        "Respuesta enviatodo-zipcode:",
        data
      );

      throw new Error(
        "ZIP_LOOKUP_INVALID"
      );
    }

    const location =
      data.location;

    const suburbs =
      Array.isArray(
        data.suburbs
      )
        ? data.suburbs
        : [];

    cityField.value =
      sanitizeText(
        location.municipality ||
        location.city
      );

    stateField.value =
      sanitizeText(
        location.state
      );

    stateCodeField.value =
      sanitizeText(
        location.state_code
      );

    activeZipCode =
      normalizedPostalCode;

    neighborhoodField.innerHTML =
      "";

    const defaultOption =
      document.createElement(
        "option"
      );

    defaultOption.value =
      "";

    defaultOption.textContent =
      suburbs.length
        ? "Selecciona tu colonia"
        : "No se encontraron colonias";

    neighborhoodField.appendChild(
      defaultOption
    );

    suburbs.forEach(
      suburb => {
        const name =
          sanitizeText(
            typeof suburb === "string"
              ? suburb
              : suburb?.name
          );

        if (!name) {
          return;
        }

        const option =
          document.createElement(
            "option"
          );

        option.value =
          name;

        option.textContent =
          name;

        neighborhoodField.appendChild(
          option
        );
      }
    );

    neighborhoodField.disabled =
      suburbs.length === 0;

    const neighborhoodToRestore =
      sanitizeText(
        restoreNeighborhood ||
        draftNeighborhoodToRestore
      );

    if (
      neighborhoodToRestore &&
      suburbs.some(
        suburb =>
          sanitizeText(
            typeof suburb === "string"
              ? suburb
              : suburb?.name
          ) ===
          neighborhoodToRestore
      )
    ) {
      neighborhoodField.value =
        neighborhoodToRestore;
    }

    draftNeighborhoodToRestore =
      "";

    setZipStatus(
      `${cityField.value}, ${stateField.value}`,
      "success"
    );

    saveCurrentDraft();

    scheduleShippingQuote();

    return true;

  } catch (error) {
    console.error(
      "Error consultando código postal:",
      error
    );

    if (
      sequence !==
      zipLookupSequence
    ) {
      return false;
    }

    clearLocationFields();

    setZipStatus(
      "No pudimos validar ese código postal.",
      "error"
    );

    invalidateShippingQuote(
      "Verifica tu código postal para calcular el envío."
    );

    return false;

  } finally {
    if (
      sequence ===
      zipLookupSequence
    ) {
      zipLookupIsRunning =
        false;
    }
  }
}


function schedulePostalCodeLookup() {
  if (zipLookupTimer) {
    window.clearTimeout(
      zipLookupTimer
    );
  }

  const postalCode =
    normalizePostalCode(
      postalCodeField.value
    );

  if (
    postalCode.length !==
    5
  ) {
    zipLookupSequence +=
      1;

    clearLocationFields();

    setZipStatus(
      ""
    );

    invalidateShippingQuote();

    return;
  }

  if (
    postalCode ===
      activeZipCode &&
    cityField.value &&
    stateField.value
  ) {
    scheduleShippingQuote();

    return;
  }

  clearLocationFields();

  invalidateShippingQuote(
    "Validando código postal..."
  );

  zipLookupTimer =
    window.setTimeout(
      () => {
        void lookupPostalCode(
          postalCode
        );
      },
      ZIP_LOOKUP_DELAY
    );
}


/* ==========================================
   RATE NORMALIZATION
========================================== */

function getRatePrice(
  rate
) {
  const candidates = [
    rate?.price,
    rate?.shipping_total,
    rate?.total,
    rate?.amount,
    rate?.charge_total,
    rate?.charges?.total,
    rate?.charges?.base?.total
  ];

  for (
    const candidate of candidates
  ) {
    const value =
      Number(
        candidate
      );

    if (
      Number.isFinite(
        value
      ) &&
      value >= 0
    ) {
      return Number(
        value.toFixed(
          2
        )
      );
    }
  }

  return NaN;
}


function normalizeShippingRate(
  rawRate
) {
  const providerId =
    sanitizeText(
      rawRate?.provider_id
    );

  const providerServiceId =
    sanitizeText(
      rawRate?.provider_service_id
    );

  const price =
    getRatePrice(
      rawRate
    );

  if (
    !providerId ||
    !providerServiceId ||
    !Number.isFinite(
      price
    )
  ) {
    return null;
  }

  return {
    provider_id:
      providerId,

    provider_service_id:
      providerServiceId,

    provider_name:
      sanitizeText(
        rawRate?.provider_name ||
        rawRate?.provider
      ),

    service_name:
      sanitizeText(
        rawRate?.service_name ||
        rawRate?.service
      ),

    via_transport:
      sanitizeText(
        rawRate?.via_transport
      ),

    delivery_mode:
      sanitizeText(
        rawRate?.delivery_mode
      ),

    estimated_date:
      sanitizeText(
        rawRate?.estimated_date
      ),

    status:
      sanitizeText(
        rawRate?.status
      ),

    price
  };
}


/* ==========================================
   ESTIMATED DATE
========================================== */

function formatEstimatedDate(
  value
) {
  const text =
    sanitizeText(
      value
    );

  if (!text) {
    return "";
  }

  const timestamp =
    Date.parse(
      text
    );

  if (
    Number.isNaN(
      timestamp
    )
  ) {
    return text;
  }

  try {
    return new Intl.DateTimeFormat(
      "es-MX",
      {
        day: "numeric",
        month: "short"
      }
    ).format(
      new Date(
        timestamp
      )
    );

  } catch {
    return text;
  }
}


/* ==========================================
   RENDER SHIPPING RATES
========================================== */

function renderShippingRates(
  quote
) {
  checkoutShippingRates.innerHTML =
    "";

  selectedShippingRate =
    null;

  const rates =
    Array.isArray(
      quote?.rates
    )
      ? quote.rates
          .map(
            normalizeShippingRate
          )
          .filter(
            Boolean
          )
          .sort(
            (a, b) =>
              a.price -
              b.price
          )
      : [];

  if (!rates.length) {
    setShippingStatus(
      "No encontramos métodos de envío disponibles para esta dirección.",
      "error"
    );

    setShippingError(
      "Prueba verificando tu dirección o intenta nuevamente."
    );

    renderSummary();

    return;
  }

  rates.forEach(
    (
      rate,
      index
    ) => {
      const label =
        document.createElement(
          "label"
        );

      label.className =
        "checkout-shipping-rate";

      const input =
        document.createElement(
          "input"
        );

      input.type =
        "radio";

      input.name =
        "shippingRate";

      input.value =
        `${rate.provider_id}:${rate.provider_service_id}`;

      input.dataset.index =
        String(
          index
        );

      const card =
        document.createElement(
          "span"
        );

      card.className =
        "checkout-shipping-rate-card";

      const info =
        document.createElement(
          "span"
        );

      info.className =
        "checkout-shipping-rate-info";

      const title =
        document.createElement(
          "strong"
        );

      title.textContent =
        rate.service_name ||
        rate.provider_name ||
        "Envío";

      const details =
        document.createElement(
          "span"
        );

      const detailParts =
        [];

      if (
        rate.provider_name &&
        rate.provider_name !==
          rate.service_name
      ) {
        detailParts.push(
          rate.provider_name
        );
      }

      if (rate.delivery_mode) {
        detailParts.push(
          rate.delivery_mode
        );
      }

      if (rate.via_transport) {
        detailParts.push(
          rate.via_transport
        );
      }

      const estimatedDate =
        formatEstimatedDate(
          rate.estimated_date
        );

      if (estimatedDate) {
        detailParts.push(
          `Entrega estimada: ${estimatedDate}`
        );
      }

      details.textContent =
        detailParts.join(
          " · "
        ) ||
        "Servicio disponible";

      const price =
        document.createElement(
          "strong"
        );

      price.className =
        "checkout-shipping-rate-price";

      price.textContent =
        store.formatCurrency(
          rate.price
        );

      info.append(
        title,
        details
      );

      card.append(
        info,
        price
      );

      label.append(
        input,
        card
      );

      input.addEventListener(
        "change",
        () => {
          if (!input.checked) {
            return;
          }

          selectedShippingRate =
            rate;

          setShippingError(
            ""
          );

          setShippingStatus(
            "Método de envío seleccionado.",
            "success"
          );

          renderSummary();

          saveCurrentDraft();
        }
      );

      checkoutShippingRates.appendChild(
        label
      );
    }
  );

  setShippingStatus(
    "Selecciona el método de envío que prefieras.",
    "success"
  );

  renderSummary();
}


/* ==========================================
   SHIPPING DATA READY
========================================== */

function shippingDataIsComplete(
  data
) {
  return (
    data.firstName.length >= 2 &&
    data.lastName.length >= 2 &&
    isValidEmail(
      data.email
    ) &&
    data.phone.length === 10 &&
    data.street.length >= 2 &&
    data.extNumber.length >= 1 &&
    data.neighborhood.length >= 2 &&
    data.postalCode.length === 5 &&
    data.city.length >= 2 &&
    data.state.length >= 2 &&
    data.stateCode.length >= 2
  );
}


/* ==========================================
   SHIPPING RATE REQUEST
========================================== */

function buildShippingRateRequest(
  data
) {
  const fullName =
    `${data.firstName} ${data.lastName}`
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return {
    destination: {
      full_name:
        fullName,

      email:
        data.email,

      telephone:
        data.phone,

      street:
        data.street,

      ext_number:
        data.extNumber,

      int_number:
        data.address2,

      zip_code:
        data.postalCode,

      suburb:
        data.neighborhood,

      municipality:
        data.city,

      town:
        data.city,

      state:
        data.state,

      state_code:
        data.stateCode,

      country_code:
        "MX",

      reference:
        data.notes,

      default_addr:
        "false"
    },

    /*
      El frontend NO envía shipping_total.

      Los items se incluyen para que el backend
      pueda utilizarlos posteriormente para
      determinar paquete/valor declarado de
      forma autoritativa.
    */

    items:
      store
        .getCartItems()
        .map(
          item => ({
            perfume_id:
              item.product.id,

            quantity:
              Number(
                item.quantity
              )
          })
        )
  };
}


/* ==========================================
   REQUEST SHIPPING RATES
========================================== */

async function requestShippingRates({
  force = false
} = {}) {
  if (
    activeOrder ||
    creatingOrder
  ) {
    return false;
  }

  const customerData =
    getFormData();

  if (
    customerData.postalCode !==
      activeZipCode ||
    !shippingDataIsComplete(
      customerData
    )
  ) {
    invalidateShippingQuote(
      "Completa tus datos y dirección para calcular el envío."
    );

    return false;
  }

  const fingerprint =
    createShippingFingerprint(
      customerData
    );

  if (
    !force &&
    activeShippingQuote &&
    activeShippingFingerprint ===
      fingerprint
  ) {
    return true;
  }

  const sequence =
    ++shippingQuoteSequence;

  shippingQuoteIsRunning =
    true;

  selectedShippingRate =
    null;

  checkoutShippingRates.innerHTML =
    "";

  renderSummary();

  setShippingError(
    ""
  );

  setShippingStatus(
    "Calculando opciones de envío...",
    "loading"
  );

  try {
    const requestBody =
      buildShippingRateRequest(
        customerData
      );

    const {
      data,
      error
    } =
      await window.storeSupabase
        .functions
        .invoke(
          "enviatodo-rates",
          {
            body:
              requestBody
          }
        );

    if (
      sequence !==
      shippingQuoteSequence
    ) {
      return false;
    }

    if (error) {
      console.error(
        "enviatodo-rates:",
        error
      );

      throw new Error(
        "SHIPPING_RATES_ERROR"
      );
    }

    if (
      !data ||
      data.success !== true ||
      !data.quote ||
      !sanitizeText(
        data.quote.uuid
      )
    ) {
      console.error(
        "Respuesta enviatodo-rates:",
        data
      );

      throw new Error(
        "SHIPPING_RATES_INVALID"
      );
    }

    const currentData =
      getFormData();

    const currentFingerprint =
      createShippingFingerprint(
        currentData
      );

    /*
      Si el cliente cambió la dirección
      mientras la API respondía, ignoramos
      completamente esta cotización.
    */

    if (
      currentFingerprint !==
      fingerprint
    ) {
      return false;
    }

    activeShippingQuote = {
      uuid:
        sanitizeText(
          data.quote.uuid
        ),

      timestamp:
        data.quote.timestamp ||
        null,

      rates:
        Array.isArray(
          data.quote.rates
        )
          ? data.quote.rates
          : []
    };

    activeShippingFingerprint =
      fingerprint;

    renderShippingRates(
      activeShippingQuote
    );

    return true;

  } catch (error) {
    console.error(
      "Error calculando envío:",
      error
    );

    if (
      sequence !==
      shippingQuoteSequence
    ) {
      return false;
    }

    activeShippingQuote =
      null;

    activeShippingFingerprint =
      "";

    selectedShippingRate =
      null;

    checkoutShippingRates.innerHTML =
      "";

    setShippingStatus(
      "No fue posible calcular el envío.",
      "error"
    );

    setShippingError(
      "Verifica los datos de entrega e inténtalo nuevamente."
    );

    renderSummary();

    return false;

  } finally {
    if (
      sequence ===
      shippingQuoteSequence
    ) {
      shippingQuoteIsRunning =
        false;
    }
  }
}


/* ==========================================
   SCHEDULE SHIPPING
========================================== */

function scheduleShippingQuote() {
  if (
    activeOrder ||
    creatingOrder
  ) {
    return;
  }

  if (shippingQuoteTimer) {
    window.clearTimeout(
      shippingQuoteTimer
    );
  }

  const data =
    getFormData();

  if (
    data.postalCode !==
      activeZipCode ||
    !shippingDataIsComplete(
      data
    )
  ) {
    invalidateShippingQuote(
      "Completa tus datos y dirección para calcular el envío."
    );

    return;
  }

  const fingerprint =
    createShippingFingerprint(
      data
    );

  if (
    activeShippingQuote &&
    activeShippingFingerprint ===
      fingerprint
  ) {
    return;
  }

  invalidateShippingQuote(
    "Actualizando cotización de envío..."
  );

  shippingQuoteTimer =
    window.setTimeout(
      () => {
        void requestShippingRates();
      },
      SHIPPING_QUOTE_DELAY
    );
}


/* ==========================================
   ENSURE SHIPPING BEFORE ORDER
========================================== */

async function ensureShippingSelection() {
  const data =
    getFormData();

  if (
    !shippingDataIsComplete(
      data
    )
  ) {
    return false;
  }

  const fingerprint =
    createShippingFingerprint(
      data
    );

  if (
    !activeShippingQuote ||
    activeShippingFingerprint !==
      fingerprint
  ) {
    const success =
      await requestShippingRates({
        force: true
      });

    if (!success) {
      return false;
    }
  }

  if (!selectedShippingRate) {
    setShippingError(
      "Selecciona un método de envío antes de continuar."
    );

    scrollToElement(
      checkoutShippingSection
    );

    return false;
  }

  return true;
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
    data.postalCode.length !==
    5
  ) {
    errors.postalCode =
      "El código postal debe tener 5 dígitos.";
  }

  if (
    data.neighborhood.length <
    2
  ) {
    errors.neighborhood =
      "Selecciona tu colonia.";
  }

  if (
    data.street.length <
    2
  ) {
    errors.street =
      "Ingresa tu calle.";
  }

  if (
    data.extNumber.length <
    1
  ) {
    errors.extNumber =
      "Ingresa el número exterior.";
  }

  if (
    data.city.length <
    2
  ) {
    errors.city =
      "No pudimos determinar tu ciudad o municipio.";
  }

  if (
    data.state.length <
    2
  ) {
    errors.state =
      "No pudimos determinar tu estado.";
  }

  if (
    !data.stateCode
  ) {
    errors.postalCode =
      "Vuelve a validar tu código postal.";
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
  if (
    !activeShippingQuote ||
    !selectedShippingRate
  ) {
    throw new Error(
      "SHIPPING_NOT_SELECTED"
    );
  }

  const items =
    store.getCartItems();

  /*
    create-order todavía almacena el domicilio
    en el formato legacy "address".

    Conservamos calle + número exterior juntos
    ahí, mientras EnviaTodo recibe ambos campos
    por separado al cotizar.
  */

  const combinedAddress =
    `${customerData.street} ${customerData.extNumber}`
      .replace(
        /\s+/g,
        " "
      )
      .trim();

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
        combinedAddress,

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

    shipping_quote: {
      uuid:
        activeShippingQuote.uuid,

      provider_id:
        selectedShippingRate
          .provider_id,

      provider_service_id:
        selectedShippingRate
          .provider_service_id
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

    case "INVALID_SHIPPING_QUOTE":
      return (
        "La opción de envío seleccionada no es válida."
      );

    case "SHIPPING_QUOTE_NOT_FOUND":
      return (
        "La cotización de envío ya no está disponible. Vuelve a calcularla."
      );

    case "SHIPPING_QUOTE_EXPIRED":
      return (
        "La cotización de envío expiró. Vuelve a seleccionar tu envío."
      );

    case "SHIPPING_QUOTE_ADDRESS_MISMATCH":
      return (
        "La dirección cambió después de calcular el envío. Vuelve a cotizar."
      );

    case "ORDER_SHIPPING_QUOTE_MISMATCH":
    case "ORDER_ALREADY_PREPARED":
      return (
        "Este intento de compra ya estaba asociado a otra cotización. Actualiza el checkout."
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
   FINALIZE CONFIRMED PAYMENT
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

  const confirmationSaved =
    saveConfirmedOrderForRedirect(
      confirmedOrder
    );

  clearCheckoutAfterPayment();

  showConfirmedPaymentModal(
    confirmedOrder
  );

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

    installments
  };

  console.log(
    "DUVANT 12 — Enviando pago:",
    {
      order_id:
        activeOrder.id,

      payment_method_id:
        paymentMethodId,

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

  /*
    Mostramos también los valores
    autoritativos devueltos por create-order.
  */

  if (
    Number.isFinite(
      Number(
        order.shipping_total
      )
    )
  ) {
    checkoutShippingTotal.textContent =
      store.formatCurrency(
        Number(
          order.shipping_total
        )
      );
  }

  if (
    Number.isFinite(
      Number(
        order.total
      )
    )
  ) {
    checkoutTotal.textContent =
      store.formatCurrency(
        Number(
          order.total
        )
      );
  }

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

  /*
    No imprimimos datos completos del
    cliente ni dirección en producción.
  */

  console.log(
    "DUVANT 12 — Preparando pedido:",
    {
      client_request_id:
        requestBody.client_request_id,

      shipping_quote:
        requestBody.shipping_quote,

      item_count:
        requestBody.items.length
    }
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

      return null;
    }

    if (
      data.error ===
        "SHIPPING_QUOTE_NOT_FOUND" ||
      data.error ===
        "SHIPPING_QUOTE_EXPIRED" ||
      data.error ===
        "SHIPPING_QUOTE_ADDRESS_MISMATCH" ||
      data.error ===
        "INVALID_SHIPPING_QUOTE"
    ) {
      /*
        Fuerza una nueva cotización.
      */

      invalidateShippingQuote(
        "La cotización cambió. Calculando nuevamente..."
      );

      await requestShippingRates({
        force: true
      });

      scrollToElement(
        checkoutShippingSection
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

  /*
    Primero aseguramos una cotización válida
    y que el cliente haya seleccionado tarifa.
  */

  const shippingReady =
    await ensureShippingSelection();

  if (!shippingReady) {
    store.showToast(
      selectedShippingRate
        ? "No fue posible validar el envío."
        : "Selecciona un método de envío."
    );

    return;
  }

  /*
    Volvemos a leer los datos después de
    cualquier proceso asíncrono.
  */

  const finalCustomerData =
    getFormData();

  const finalFingerprint =
    createShippingFingerprint(
      finalCustomerData
    );

  if (
    finalFingerprint !==
      activeShippingFingerprint
  ) {
    invalidateShippingQuote(
      "La información cambió. Vuelve a seleccionar el envío."
    );

    scheduleShippingQuote();

    store.showToast(
      "Actualizamos tu dirección. Vuelve a seleccionar el envío."
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

    /*
      loadProducts pudo modificar el carrito.
      Si cambió, la cotización deja de ser válida.
    */

    const refreshedFingerprint =
      createShippingFingerprint(
        finalCustomerData
      );

    if (
      refreshedFingerprint !==
        activeShippingFingerprint
    ) {
      invalidateShippingQuote(
        "El carrito cambió. Calculando nuevamente el envío..."
      );

      await requestShippingRates({
        force: true
      });

      store.showToast(
        "El carrito cambió. Selecciona nuevamente tu envío."
      );

      scrollToElement(
        checkoutShippingSection
      );

      return;
    }

    saveDraft(
      finalCustomerData
    );

    const order =
      await createStoreOrder(
        finalCustomerData
      );

    if (!order) {
      return;
    }

    console.log(
      "DUVANT 12 — Pedido reservado:",
      {
        id:
          order.id,

        order_number:
          order.order_number,

        subtotal:
          order.subtotal,

        shipping_total:
          order.shipping_total,

        total:
          order.total
      }
    );

    await showPaymentStage(
      order,
      finalCustomerData
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
   ADDRESS CHANGE HANDLING
========================================== */

const SHIPPING_RELEVANT_FIELDS =
  new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    "street",
    "extNumber",
    "address2",
    "neighborhood"
  ]);


function handleShippingRelevantChange(
  fieldName
) {
  if (
    !SHIPPING_RELEVANT_FIELDS.has(
      fieldName
    )
  ) {
    return;
  }

  if (
    fieldName ===
      "neighborhood"
  ) {
    scheduleShippingQuote();

    return;
  }

  scheduleShippingQuote();
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

    if (field.name) {
      const errorElement =
        checkoutForm.querySelector(
          `[data-error-for="${field.name}"]`
        );

      if (errorElement) {
        errorElement.textContent =
          "";
      }
    }

    if (
      field.name ===
        "postalCode"
    ) {
      /*
        Solo números y máximo 5.
      */

      field.value =
        normalizePostalCode(
          field.value
        ).slice(
          0,
          5
        );

      schedulePostalCodeLookup();

    } else {
      handleShippingRelevantChange(
        field.name
      );
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

    if (field.name) {
      const errorElement =
        checkoutForm.querySelector(
          `[data-error-for="${field.name}"]`
        );

      if (errorElement) {
        errorElement.textContent =
          "";
      }
    }

    if (
      field.name ===
        "postalCode"
    ) {
      schedulePostalCodeLookup();

    } else {
      handleShippingRelevantChange(
        field.name
      );
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
      checkoutContent.hidden
    ) {
      return;
    }

    renderSummary();

    if (
      !activeOrder
    ) {
      invalidateShippingQuote(
        "El carrito cambió. Calculando nuevamente el envío..."
      );

      scheduleShippingQuote();
    }
  }
);


/* ==========================================
   RESET SHIPPING STATE
========================================== */

function resetShippingState() {
  if (zipLookupTimer) {
    window.clearTimeout(
      zipLookupTimer
    );
  }

  if (shippingQuoteTimer) {
    window.clearTimeout(
      shippingQuoteTimer
    );
  }

  zipLookupTimer =
    null;

  shippingQuoteTimer =
    null;

  zipLookupSequence +=
    1;

  shippingQuoteSequence +=
    1;

  zipLookupIsRunning =
    false;

  shippingQuoteIsRunning =
    false;

  activeZipCode =
    "";

  activeShippingQuote =
    null;

  activeShippingFingerprint =
    "";

  selectedShippingRate =
    null;

  checkoutShippingRates.innerHTML =
    "";

  setZipStatus(
    ""
  );

  setShippingStatus(
    "Completa tu dirección para calcular el envío."
  );

  setShippingError(
    ""
  );

  checkoutShippingTotal.textContent =
    "Por calcular";
}


/* ==========================================
   RESTORE DRAFT LOCATION
========================================== */

async function restoreDraftLocation(
  draft
) {
  if (!draft) {
    return;
  }

  const postalCode =
    normalizePostalCode(
      draft.postalCode
    );

  if (
    postalCode.length !==
    5
  ) {
    return;
  }

  postalCodeField.value =
    postalCode;

  await lookupPostalCode(
    postalCode,
    {
      restoreNeighborhood:
        sanitizeText(
          draft.neighborhood
        )
    }
  );
}


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

    resetShippingState();

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

    const draft =
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

    /*
      Restauramos CP/colonia DESPUÉS de
      mostrar el checkout, porque la colonia
      depende de la API de EnviaTodo.
    */

    await restoreDraftLocation(
      draft
    );

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