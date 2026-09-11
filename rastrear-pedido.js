"use strict";

/* =========================================================
   DUVANT12
   PUBLIC ORDER TRACKING
========================================================= */

const STORE_SUPABASE_URL =
  "https://jqkmnoxqtoqzdbvrwgil.supabase.co";

const TRACK_ORDER_ENDPOINT =
  `${STORE_SUPABASE_URL}/functions/v1/track-order`;


/* =========================================================
   HELPERS
========================================================= */

function trackingFormatCurrency(
  value,
  currency = "MXN"
) {
  const amount =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency:
        currency || "MXN"
    }
  ).format(amount);
}


function trackingFormatDate(
  value
) {
  if (!value) {
    return "Pendiente";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short"
    }
  ).format(date);
}


function trackingNormalizeOrderNumber(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}


function trackingNormalizeEmail(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function trackingSetText(
  id,
  value
) {
  const element =
    document.getElementById(
      id
    );

  if (element) {
    element.textContent =
      value ?? "";
  }
}


/* =========================================================
   MESSAGE
========================================================= */

function showTrackingMessage(
  message,
  type = "info"
) {
  const container =
    document.getElementById(
      "trackingMessage"
    );

  if (!container) {
    return;
  }

  container.hidden =
    false;

  container.textContent =
    message;

  container.classList.toggle(
    "is-error",
    type === "error"
  );
}


function hideTrackingMessage() {
  const container =
    document.getElementById(
      "trackingMessage"
    );

  if (!container) {
    return;
  }

  container.hidden =
    true;

  container.textContent =
    "";

  container.classList.remove(
    "is-error"
  );
}


/* =========================================================
   STATUS
========================================================= */

function getTrackingStatusLabel(
  order
) {
  if (
    order.payment_status !==
    "paid"
  ) {
    if (
      order.payment_status ===
      "failed"
    ) {
      return "Pago no completado";
    }

    if (
      order.payment_status ===
      "cancelled"
    ) {
      return "Pedido cancelado";
    }

    return "Pago pendiente";
  }


  const labels = {
    pending:
      "Pago confirmado",

    preparing:
      "Preparando",

    shipped:
      "Enviado",

    delivered:
      "Entregado",

    cancelled:
      "Cancelado"
  };


  return (
    labels[
      order.fulfillment_status
    ] ||
    "Pago confirmado"
  );
}


function getTrackingProgressIndex(
  order
) {
  if (
    order.payment_status !==
    "paid"
  ) {
    return -1;
  }


  const indexes = {
    pending:
      0,

    preparing:
      1,

    shipped:
      2,

    delivered:
      3
  };


  return indexes[
    order.fulfillment_status
  ] ?? 0;
}


/* =========================================================
   PROGRESS
========================================================= */

function renderTrackingProgress(
  order
) {
  const progressIndex =
    getTrackingProgressIndex(
      order
    );


  document
    .querySelectorAll(
      "[data-tracking-step]"
    )
    .forEach(
      (
        element,
        index
      ) => {
        element.classList.remove(
          "is-complete",
          "is-current"
        );


        if (
          progressIndex < 0
        ) {
          return;
        }


        if (
          index <=
          progressIndex
        ) {
          element.classList.add(
            "is-complete"
          );
        }


        if (
          index ===
          progressIndex
        ) {
          element.classList.add(
            "is-current"
          );
        }
      }
    );


  trackingSetText(
    "trackingPaidDate",

    order.payment_status ===
      "paid"
      ? trackingFormatDate(
          order.created_at
        )
      : "Pendiente"
  );


  trackingSetText(
    "trackingPreparingDate",

    order.preparing_at
      ? trackingFormatDate(
          order.preparing_at
        )
      : "Pendiente"
  );


  trackingSetText(
    "trackingShippedDate",

    order.shipped_at
      ? trackingFormatDate(
          order.shipped_at
        )
      : "Pendiente"
  );


  trackingSetText(
    "trackingDeliveredDate",

    order.delivered_at
      ? trackingFormatDate(
          order.delivered_at
        )
      : "Pendiente"
  );
}


/* =========================================================
   RESULT
========================================================= */

function renderTrackingResult(
  order
) {
  const result =
    document.getElementById(
      "trackingResult"
    );

  const shippingCard =
    document.getElementById(
      "trackingShippingCard"
    );


  if (!result) {
    return;
  }


  trackingSetText(
    "trackingResultOrderNumber",
    order.order_number ||
    "—"
  );


  trackingSetText(
    "trackingStatusBadge",
    getTrackingStatusLabel(
      order
    )
  );


  trackingSetText(
    "trackingPaymentStatus",

    order.payment_status ===
      "paid"
      ? "Pago confirmado"
      : order.payment_status ===
          "failed"
        ? "Pago no completado"
        : order.payment_status ===
            "cancelled"
          ? "Cancelado"
          : "Pendiente"
  );


  trackingSetText(
    "trackingOrderTotal",

    trackingFormatCurrency(
      order.total,
      order.currency
    )
  );


  renderTrackingProgress(
    order
  );


  const hasShippingInfo =
    Boolean(
      String(
        order.shipping_carrier ||
        ""
      ).trim()
    ) ||
    Boolean(
      String(
        order.tracking_number ||
        ""
      ).trim()
    );


  if (shippingCard) {
    shippingCard.hidden =
      !hasShippingInfo;
  }


  trackingSetText(
    "trackingCarrier",
    order.shipping_carrier ||
    "—"
  );


  trackingSetText(
    "trackingNumber",
    order.tracking_number ||
    "—"
  );


  result.hidden =
    false;


  result.scrollIntoView({
    behavior:
      "smooth",

    block:
      "start"
  });
}


/* =========================================================
   REQUEST
========================================================= */

async function requestOrderTracking(
  orderNumber,
  email
) {
  const response =
    await fetch(
      TRACK_ORDER_ENDPOINT,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        cache:
          "no-store",

        body:
          JSON.stringify({
            order_number:
              orderNumber,

            email:
              email
          })
      }
    );


  let result =
    null;


  try {
    result =
      await response.json();
  } catch {
    result =
      null;
  }


  if (!response.ok) {
    const errorCode =
      result?.error ||
      "REQUEST_FAILED";


    if (
      errorCode ===
      "ORDER_NOT_FOUND"
    ) {
      throw new Error(
        "No encontramos un pedido con esos datos. Revisa el número de pedido y el correo electrónico."
      );
    }


    if (
      errorCode ===
      "INVALID_ORDER_NUMBER"
    ) {
      throw new Error(
        "El número de pedido no tiene un formato válido."
      );
    }


    if (
      errorCode ===
      "INVALID_EMAIL"
    ) {
      throw new Error(
        "Escribe un correo electrónico válido."
      );
    }


    if (
      errorCode ===
      "ORDER_NUMBER_AND_EMAIL_REQUIRED"
    ) {
      throw new Error(
        "Escribe el número de pedido y el correo electrónico."
      );
    }


    throw new Error(
      "No pudimos consultar tu pedido en este momento. Inténtalo nuevamente."
    );
  }


  if (
    !result?.ok ||
    !result.order
  ) {
    throw new Error(
      "No pudimos consultar tu pedido en este momento."
    );
  }


  return result.order;
}


/* =========================================================
   SUBMIT
========================================================= */

async function handleTrackingSubmit(
  event
) {
  event.preventDefault();


  const orderInput =
    document.getElementById(
      "trackingOrderNumber"
    );

  const emailInput =
    document.getElementById(
      "trackingEmail"
    );

  const button =
    document.getElementById(
      "trackingSubmitButton"
    );

  const result =
    document.getElementById(
      "trackingResult"
    );


  const orderNumber =
    trackingNormalizeOrderNumber(
      orderInput?.value
    );

  const email =
    trackingNormalizeEmail(
      emailInput?.value
    );


  hideTrackingMessage();


  if (result) {
    result.hidden =
      true;
  }


  if (!orderNumber) {
    showTrackingMessage(
      "Escribe tu número de pedido.",
      "error"
    );

    orderInput?.focus();

    return;
  }


  if (!email) {
    showTrackingMessage(
      "Escribe el correo electrónico utilizado en tu compra.",
      "error"
    );

    emailInput?.focus();

    return;
  }


  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    showTrackingMessage(
      "Escribe un correo electrónico válido.",
      "error"
    );

    emailInput?.focus();

    return;
  }


  const originalText =
    button?.textContent ||
    "Rastrear pedido";


  if (button) {
    button.disabled =
      true;

    button.textContent =
      "Buscando pedido...";
  }


  try {
    const order =
      await requestOrderTracking(
        orderNumber,
        email
      );


    renderTrackingResult(
      order
    );

  } catch (error) {
    console.error(
      "Tracking error:",
      error
    );


    showTrackingMessage(
      error.message ||
      "No pudimos consultar tu pedido.",
      "error"
    );

  } finally {
    if (button) {
      button.disabled =
        false;

      button.textContent =
        originalText;
    }
  }
}


/* =========================================================
   AUTO FORMAT
========================================================= */

function initializeTrackingInputs() {
  const orderInput =
    document.getElementById(
      "trackingOrderNumber"
    );


  orderInput?.addEventListener(
    "input",
    () => {
      orderInput.value =
        orderInput.value
          .toUpperCase()
          .replace(/\s+/g, "");
    }
  );
}


/* =========================================================
   INITIALIZE
========================================================= */

function initializeTrackingPage() {
  const form =
    document.getElementById(
      "trackingForm"
    );


  if (!form) {
    return;
  }


  initializeTrackingInputs();


  form.addEventListener(
    "submit",
    handleTrackingSubmit
  );
}


document.addEventListener(
  "DOMContentLoaded",
  initializeTrackingPage
);