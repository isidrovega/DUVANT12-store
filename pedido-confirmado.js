"use strict";

const CONFIRMED_ORDER_KEY = "duvant12_confirmed_order_v1";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

const confirmationLoading = document.getElementById("confirmationLoading");
const confirmationSuccess = document.getElementById("confirmationSuccess");
const confirmationPending = document.getElementById("confirmationPending");
const confirmationError = document.getElementById("confirmationError");

const confirmationOrderNumber = document.getElementById(
  "confirmationOrderNumber"
);

const confirmationTotal = document.getElementById("confirmationTotal");
const confirmationStatus = document.getElementById("confirmationStatus");

const confirmationErrorMessage = document.getElementById(
  "confirmationErrorMessage"
);

const confirmationRetryButton = document.getElementById(
  "confirmationRetryButton"
);

let pollingIsRunning = false;

function showState(stateName) {
  confirmationLoading.hidden = stateName !== "loading";
  confirmationSuccess.hidden = stateName !== "success";
  confirmationPending.hidden = stateName !== "pending";
  confirmationError.hidden = stateName !== "error";
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function formatCurrency(value, currency = "MXN") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: sanitizeText(currency) || "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function readConfirmationData() {
  try {
    const raw = sessionStorage.getItem(CONFIRMED_ORDER_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    const orderId = sanitizeText(parsed?.order_id);
    const clientRequestId = sanitizeText(parsed?.client_request_id);

    if (!orderId || !clientRequestId) {
      return null;
    }

    return {
      order_id: orderId,
      client_request_id: clientRequestId
    };
  } catch (error) {
    console.error("Unable to read confirmed order data:", error);
    return null;
  }
}

async function getOrderStatus(orderId, clientRequestId) {
  if (!window.storeSupabase) {
    throw new Error("STORE_SUPABASE_NOT_AVAILABLE");
  }

  const { data, error } = await window.storeSupabase.functions.invoke(
    "get-order-status",
    {
      body: {
        order_id: orderId,
        client_request_id: clientRequestId
      }
    }
  );

  if (error) {
    console.error("get-order-status failed:", error);
    throw new Error("ORDER_STATUS_REQUEST_FAILED");
  }

  if (!data || data.ok !== true || !data.order) {
    throw new Error("INVALID_ORDER_STATUS_RESPONSE");
  }

  return data.order;
}

function getNormalizedState(order) {
  return {
    orderStatus: sanitizeText(order?.status).toLowerCase(),
    paymentStatus: sanitizeText(order?.payment_status).toLowerCase()
  };
}

function orderIsPaid(order) {
  const { orderStatus, paymentStatus } = getNormalizedState(order);

  return orderStatus === "paid" && paymentStatus === "paid";
}

function orderHasFailed(order) {
  const { orderStatus, paymentStatus } = getNormalizedState(order);

  return (
    paymentStatus === "failed" ||
    paymentStatus === "cancelled" ||
    paymentStatus === "canceled" ||
    orderStatus === "payment_failed" ||
    orderStatus === "failed_inventory" ||
    orderStatus === "cancelled" ||
    orderStatus === "canceled"
  );
}

function renderConfirmedOrder(order) {
  confirmationOrderNumber.textContent =
    sanitizeText(order?.order_number) || "—";

  confirmationTotal.textContent = formatCurrency(
    order?.total,
    order?.currency
  );

  confirmationStatus.textContent = "Pedido confirmado";

  showState("success");
}

function renderPendingOrder() {
  showState("pending");
}

function renderError(message) {
  confirmationErrorMessage.textContent =
    sanitizeText(message) ||
    "No pudimos consultar la información de tu pedido.";

  showState("error");
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function checkOrderOnce() {
  const confirmationData = readConfirmationData();

  if (!confirmationData) {
    renderError(
      "No encontramos la información de confirmación de este pedido."
    );

    return {
      finished: true,
      paid: false
    };
  }

  const order = await getOrderStatus(
    confirmationData.order_id,
    confirmationData.client_request_id
  );

  if (orderIsPaid(order)) {
    renderConfirmedOrder(order);

    return {
      finished: true,
      paid: true
    };
  }

  if (orderHasFailed(order)) {
    renderError(
      "El pago no pudo ser confirmado. No realices otro pago sin revisar primero el estado de tu pedido."
    );

    return {
      finished: true,
      paid: false
    };
  }

  renderPendingOrder();

  return {
    finished: false,
    paid: false
  };
}

async function startConfirmationPolling() {
  if (pollingIsRunning) {
    return;
  }

  pollingIsRunning = true;

  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      try {
        const result = await checkOrderOnce();

        if (result.finished) {
          return;
        }
      } catch (error) {
        console.error("Confirmation polling error:", error);

        renderPendingOrder();
      }

      await wait(POLL_INTERVAL_MS);
    }

    renderPendingOrder();
  } finally {
    pollingIsRunning = false;
  }
}

async function handleManualRetry() {
  confirmationRetryButton.disabled = true;
  confirmationRetryButton.textContent = "Verificando...";

  try {
    await checkOrderOnce();
  } catch (error) {
    console.error("Manual confirmation retry failed:", error);

    renderPendingOrder();
  } finally {
    confirmationRetryButton.disabled = false;
    confirmationRetryButton.textContent = "Verificar nuevamente";
  }
}

async function initializeConfirmationPage() {
  showState("loading");

  const confirmationData = readConfirmationData();

  if (!confirmationData) {
    renderError(
      "No encontramos un pedido confirmado asociado a esta pestaña."
    );

    return;
  }

  await startConfirmationPolling();
}

confirmationRetryButton?.addEventListener(
  "click",
  handleManualRetry
);

document.addEventListener(
  "DOMContentLoaded",
  initializeConfirmationPage
);