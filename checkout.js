"use strict";

/* ==========================================
   DUVANT 12 — CHECKOUT + MERCADO PAGO
========================================== */

const store =
  window.DuvantStore;

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
   STATE
========================================== */

let activeOrder =
  null;

let mercadoPago =
  null;

let cardForm =
  null;

let paymentIsProcessing =
  false;

let creatingOrder =
  false;


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

const checkoutPaymentForm =
  document.getElementById(
    "form-checkout"
  );

const checkoutPaymentButton =
  document.getElementById(
    "checkoutPaymentButton"
  );

const checkoutPaymentError =
  document.getElementById(
    "checkoutPaymentError"
  );

const checkoutPaymentProgress =
  document.getElementById(
    "checkoutPaymentProgress"
  );

const checkoutPaymentOrderNumber =
  document.getElementById(
    "checkoutPaymentOrderNumber"
  );

const checkoutPaymentTotal =
  document.getElementById(
    "checkoutPaymentTotal"
  );

const checkoutPaymentEmail =
  document.getElementById(
    "form-checkout__cardholderEmail"
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
    behavior:
      "smooth",

    block:
      "start"
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
    .forEach(
      element => {
        element.disabled =
          true;
      }
    );

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
   PAYMENT BUTTON STATE
========================================== */

function setPaymentProcessing(
  processing
) {
  paymentIsProcessing =
    processing;

  checkoutPaymentButton.disabled =
    processing;

  if (processing) {
    checkoutPaymentButton.textContent =
      "Procesando pago...";
  } else {
    checkoutPaymentButton.textContent =
      "Pagar ahora";
  }
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


  /*
    No declaramos el pedido como "pagado"
    aquí.

    La confirmación definitiva debe llegar
    por webhook de Mercado Pago.
  */

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
   CREATE MP PAYMENT
========================================== */

async function processMercadoPagoPayment(
  cardData
) {
  if (!activeOrder) {
    throw new Error(
      "NO_ACTIVE_ORDER"
    );
  }


  const token =
    sanitizeText(
      cardData?.token
    );

  const paymentMethodId =
    sanitizeText(
      cardData?.paymentMethodId
    );

  const installments =
    Math.max(
      1,
      Number(
        cardData?.installments ||
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


  /*
    ETAPA INICIAL DUVANT 12:
    solamente tarjeta de crédito.

    Esto encaja con la reserva de inventario
    de 15 minutos que ya tenemos.
  */

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
    "DUVANT 12 — Procesando pago Mercado Pago:",
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
      "create-mp-order invoke:",
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
      "Mercado Pago rechazó la solicitud:",
      data
    );

    const backendMessage =
      sanitizeText(
        data.error
      );

    throw new Error(
      backendMessage ||
      "MP_PAYMENT_ERROR"
    );
  }


  return data;
}


/* ==========================================
   INIT CARD FORM
========================================== */

async function initializeMercadoPago(
  order,
  customerData
) {
  checkoutPaymentLoading.hidden =
    false;

  checkoutPaymentForm.hidden =
    true;

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


  mercadoPago =
    new window.MercadoPago(
      publicKey,
      {
        locale:
          "es-MX"
      }
    );


  checkoutPaymentEmail.value =
    customerData.email;


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


  cardForm =
    mercadoPago.cardForm({
      amount:
        amount.toFixed(
          2
        ),

      iframe:
        true,

      form: {
        id:
          "form-checkout",

        cardNumber: {
          id:
            "form-checkout__cardNumber",

          placeholder:
            "Número de tarjeta"
        },

        expirationDate: {
          id:
            "form-checkout__expirationDate",

          placeholder:
            "MM/AA"
        },

        securityCode: {
          id:
            "form-checkout__securityCode",

          placeholder:
            "CVV"
        },

        cardholderName: {
          id:
            "form-checkout__cardholderName",

          placeholder:
            "Titular de la tarjeta"
        },

        issuer: {
          id:
            "form-checkout__issuer",

          placeholder:
            "Banco emisor"
        },

        installments: {
          id:
            "form-checkout__installments",

          placeholder:
            "Mensualidades"
        },

        cardholderEmail: {
          id:
            "form-checkout__cardholderEmail",

          placeholder:
            "Correo electrónico"
        }
      },


      callbacks: {

        /* ==================================
           FORM MOUNTED
        ================================== */

        onFormMounted:
          error => {
            if (error) {
              console.error(
                "Mercado Pago CardForm mount:",
                error
              );

              checkoutPaymentLoading.hidden =
                true;

              showPaymentError(
                "No fue posible cargar el formulario seguro de pago."
              );

              return;
            }


            checkoutPaymentLoading.hidden =
              true;

            checkoutPaymentForm.hidden =
              false;
          },


        /* ==================================
           PAYMENT SUBMIT
        ================================== */

        onSubmit:
          async event => {
            event.preventDefault();


            if (
              paymentIsProcessing
            ) {
              return;
            }


            clearPaymentError();


            try {
              setPaymentProcessing(
                true
              );


              const cardData =
                cardForm.getCardFormData();


              if (
                !cardData ||
                !cardData.token
              ) {
                throw new Error(
                  "CARD_DATA_INVALID"
                );
              }


              const result =
                await processMercadoPagoPayment(
                  cardData
                );


              console.log(
                "DUVANT 12 — Mercado Pago:",
                result
              );


              /*
                IMPORTANTE:
                NO vaciamos el carrito aquí.

                Tampoco reiniciamos el request ID.

                El webhook será la autoridad
                definitiva para aprobar el pago,
                confirmar la reserva y registrar
                Venta Online.
              */


              openPaymentResultModal(
                result.order ||
                  activeOrder,

                result.mercado_pago ||
                  {}
              );


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
                "CARD_DATA_INVALID" ||
                error?.message ===
                "CARD_TOKEN_MISSING"
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

            } finally {
              setPaymentProcessing(
                false
              );
            }
          },


        /* ==================================
           MP FETCHING
        ================================== */

        onFetching:
          resource => {
            console.log(
              "Mercado Pago fetching:",
              resource
            );


            checkoutPaymentProgress.removeAttribute(
              "value"
            );


            return () => {
              checkoutPaymentProgress.setAttribute(
                "value",
                "0"
              );
            };
          }
      }
    });
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

    /* ========================================
       REFRESH CATALOG
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
       AVAILABILITY
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
       SAVE DRAFT
    ======================================== */

    saveDraft(
      customerData
    );


    /* ========================================
       CREATE / GET IDEMPOTENT ORDER
    ======================================== */

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


    /* ========================================
       START PAYMENT
    ======================================== */

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


    /* ========================================
       LOAD LIVE INVENTORY
    ======================================== */

    await store.loadProducts();


    const items =
      store.getCartItems();


    /* ========================================
       EMPTY
    ======================================== */

    if (!items.length) {
      checkoutLoading.hidden =
        true;

      checkoutEmpty.hidden =
        false;

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