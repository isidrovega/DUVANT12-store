"use strict";

/* ==========================================
   DUVANT 12 — SHARED STORE
   Supabase + carrito compartido
========================================== */

window.DuvantStore = (() => {
  const CART_KEY = "duvant12_store_cart_v2";

  const currencyFormatter =
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  let products = [];
  let cart = loadCart();
  let toastTimer = null;


  /* ========================================
     FORMAT
  ======================================== */

  function formatCurrency(value) {
    return currencyFormatter.format(
      Number(value) || 0
    );
  }


  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* ========================================
     PRODUCTS
  ======================================== */

  function normalizeProduct(row) {
    return {
      id: String(row.id),

      code: String(
        row.code ?? ""
      ),

      name: String(
        row.name ?? ""
      ),

      brand: String(
        row.brand ?? ""
      ),

      category: String(
        row.category ?? ""
      ),

      size: String(
        row.size ?? ""
      ),

      price:
        Number(row.price) || 0,

      description: String(
        row.description ?? ""
      ),

      notes:
        Array.isArray(row.notes)
          ? row.notes.map(
              note => String(note)
            )
          : [],

      badge: String(
        row.badge ?? ""
      ),

      imagePath:
        row.image_path
          ? String(row.image_path)
          : null,

      available:
        row.available === true,

      featured:
        row.featured === true,

      bestseller:
        row.bestseller === true,

      displayOrder:
        Number(row.display_order) || 0
    };
  }


  async function loadProducts() {
    if (!window.inventorySupabase) {
      throw new Error(
        "Supabase de inventario no está configurado."
      );
    }


    const { data, error } =
      await window.inventorySupabase.rpc(
        "get_public_store_catalog"
      );


    if (error) {
      console.error(
        "Error cargando catálogo:",
        error
      );

      throw new Error(
        "No fue posible cargar el catálogo."
      );
    }


    products =
      Array.isArray(data)
        ? data.map(normalizeProduct)
        : [];


    validateCartAgainstCatalog();


    return getProducts();
  }


  async function loadProduct(
    productId
  ) {
    if (!productId) {
      return null;
    }


    if (!window.inventorySupabase) {
      throw new Error(
        "Supabase de inventario no está configurado."
      );
    }


    const { data, error } =
      await window.inventorySupabase.rpc(
        "get_public_store_product",
        {
          p_id: String(
            productId
          )
        }
      );


    if (error) {
      console.error(
        "Error cargando producto:",
        error
      );

      throw new Error(
        "No fue posible cargar el producto."
      );
    }


    const row =
      Array.isArray(data) &&
      data.length
        ? data[0]
        : null;


    if (!row) {
      return null;
    }


    const loadedProduct =
      normalizeProduct(row);


    const existingIndex =
      products.findIndex(
        item =>
          item.id ===
          loadedProduct.id
      );


    if (existingIndex >= 0) {
      products[
        existingIndex
      ] = loadedProduct;
    } else {
      products.push(
        loadedProduct
      );
    }


    return cloneProduct(
      loadedProduct
    );
  }


  function cloneProduct(product) {
    return {
      ...product,
      notes: [
        ...product.notes
      ]
    };
  }


  function getProducts() {
    return products.map(
      cloneProduct
    );
  }


  function getProductById(
    productId
  ) {
    const id =
      String(
        productId ?? ""
      );


    const product =
      products.find(
        item =>
          item.id === id
      );


    return product || null;
  }


  function getProductImageUrl(
    product
  ) {
    if (
      !product ||
      !product.imagePath ||
      !window.inventorySupabase
    ) {
      return null;
    }


    const { data } =
      window.inventorySupabase.storage
        .from(
          "perfume-images"
        )
        .getPublicUrl(
          product.imagePath
        );


    return (
      data?.publicUrl ||
      null
    );
  }


  /* ========================================
     CART STORAGE
  ======================================== */

  function loadCart() {
    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            CART_KEY
          )
        );


      if (
        !Array.isArray(
          stored
        )
      ) {
        return [];
      }


      return stored
        .map(item => ({
          id: String(
            item.id ?? ""
          ),

          quantity:
            Math.max(
              1,
              Number.parseInt(
                item.quantity,
                10
              ) || 1
            )
        }))
        .filter(
          item =>
            item.id
        );

    } catch (error) {
      console.error(
        "Error cargando carrito:",
        error
      );

      return [];
    }
  }


  function saveCart() {
    try {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify(
          cart
        )
      );

    } catch (error) {
      console.error(
        "Error guardando carrito:",
        error
      );
    }
  }


  /* ========================================
     CART GETTERS
  ======================================== */

  function getCart() {
    return cart.map(
      item => ({
        ...item
      })
    );
  }


  function getCartItems() {
    return cart
      .map(item => {
        const product =
          getProductById(
            item.id
          );


        if (!product) {
          return null;
        }


        return {
          id: item.id,
          quantity:
            item.quantity,

          product:
            cloneProduct(
              product
            ),

          unitPrice:
            product.price,

          lineTotal:
            product.price *
            item.quantity
        };
      })
      .filter(Boolean);
  }


  function getCartCount() {
    return cart.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );
  }


  function getCartSubtotal() {
    return getCartItems()
      .reduce(
        (
          total,
          item
        ) =>
          total +
          item.lineTotal,
        0
      );
  }


  function isCartEmpty() {
    return (
      cart.length === 0
    );
  }


  /* ========================================
     CART VALIDATION
  ======================================== */

  function validateCartAgainstCatalog() {
    if (!products.length) {
      return;
    }


    const validProductIds =
      new Set(
        products.map(
          product =>
            product.id
        )
      );


    const previousLength =
      cart.length;


    cart =
      cart.filter(
        item =>
          validProductIds.has(
            item.id
          )
      );


    if (
      cart.length !==
      previousLength
    ) {
      saveCart();

      updateCartIndicators();

      dispatchCartUpdate();
    }
  }


  function getUnavailableCartItems() {
    return getCartItems()
      .filter(
        item =>
          !item.product.available
      );
  }


  function cartIsAvailable() {
    return (
      getUnavailableCartItems()
        .length === 0
    );
  }


  /* ========================================
     CART ACTIONS
  ======================================== */

  function addToCart(
    productId,
    quantity = 1
  ) {
    const product =
      getProductById(
        productId
      );


    if (!product) {
      showToast(
        "Este producto ya no está disponible."
      );

      return false;
    }


    if (
      !product.available
    ) {
      showToast(
        "Este perfume no está disponible actualmente."
      );

      return false;
    }


    const amount =
      Math.max(
        1,
        Number.parseInt(
          quantity,
          10
        ) || 1
      );


    const existing =
      cart.find(
        item =>
          item.id ===
          product.id
      );


    if (existing) {
      existing.quantity +=
        amount;
    } else {
      cart.push({
        id:
          product.id,

        quantity:
          amount
      });
    }


    persistCartChange();


    return true;
  }


  function setCartQuantity(
    productId,
    quantity
  ) {
    const id =
      String(
        productId ?? ""
      );


    const amount =
      Number.parseInt(
        quantity,
        10
      );


    const item =
      cart.find(
        cartItem =>
          cartItem.id === id
      );


    if (!item) {
      return false;
    }


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      removeFromCart(id);

      return true;
    }


    item.quantity =
      amount;


    persistCartChange();


    return true;
  }


  function updateQuantity(
    productId,
    change
  ) {
    const id =
      String(
        productId ?? ""
      );


    const item =
      cart.find(
        cartItem =>
          cartItem.id === id
      );


    if (!item) {
      return false;
    }


    const delta =
      Number.parseInt(
        change,
        10
      ) || 0;


    const nextQuantity =
      item.quantity +
      delta;


    if (
      nextQuantity <= 0
    ) {
      removeFromCart(id);

      return true;
    }


    item.quantity =
      nextQuantity;


    persistCartChange();


    return true;
  }


  function removeFromCart(
    productId
  ) {
    const id =
      String(
        productId ?? ""
      );


    const previousLength =
      cart.length;


    cart =
      cart.filter(
        item =>
          item.id !== id
      );


    if (
      cart.length ===
      previousLength
    ) {
      return false;
    }


    persistCartChange();


    return true;
  }


  function clearCart() {
    cart = [];

    persistCartChange();
  }


  function persistCartChange() {
    saveCart();

    updateCartIndicators();

    dispatchCartUpdate();
  }


  /* ========================================
     EVENTS
  ======================================== */

  function dispatchCartUpdate() {
    window.dispatchEvent(
      new CustomEvent(
        "duvant-cart-updated",
        {
          detail: {
            cart:
              getCart(),

            count:
              getCartCount(),

            subtotal:
              getCartSubtotal()
          }
        }
      )
    );
  }


  function updateCartIndicators() {
    const count =
      getCartCount();


    document
      .querySelectorAll(
        "[data-cart-count]"
      )
      .forEach(
        element => {
          element.textContent =
            String(count);
        }
      );
  }


  /* ========================================
     UI HELPERS
  ======================================== */

  function showToast(
    message
  ) {
    let toast =
      document.getElementById(
        "globalStoreToast"
      ) ||
      document.getElementById(
        "storeToast"
      );


    if (!toast) {
      toast =
        document.createElement(
          "div"
        );


      toast.id =
        "globalStoreToast";


      toast.className =
        "store-toast";


      toast.setAttribute(
        "role",
        "status"
      );


      toast.setAttribute(
        "aria-live",
        "polite"
      );


      document.body.appendChild(
        toast
      );
    }


    window.clearTimeout(
      toastTimer
    );


    toast.textContent =
      String(message);


    toast.classList.add(
      "show"
    );


    toastTimer =
      window.setTimeout(
        () => {
          toast.classList.remove(
            "show"
          );
        },
        2400
      );
  }


  function createBottleMarkup(
    label = "D12"
  ) {
    return `
      <div class="mini-bottle">
        <div class="mini-cap"></div>
        <div class="mini-neck"></div>

        <div class="mini-body">
          <span>
            ${escapeHtml(
              label
            )}
          </span>
        </div>
      </div>
    `;
  }


  /* ========================================
     INITIALIZE
  ======================================== */

  function initialize() {
    updateCartIndicators();


    document
      .querySelectorAll(
        "[data-current-year]"
      )
      .forEach(
        element => {
          element.textContent =
            String(
              new Date()
                .getFullYear()
            );
        }
      );
  }


  initialize();


  return {
    formatCurrency,
    escapeHtml,

    loadProducts,
    loadProduct,
    getProducts,
    getProductById,
    getProductImageUrl,

    getCart,
    getCartItems,
    getCartCount,
    getCartSubtotal,
    isCartEmpty,

    validateCartAgainstCatalog,
    getUnavailableCartItems,
    cartIsAvailable,

    addToCart,
    setCartQuantity,
    updateQuantity,
    removeFromCart,
    clearCart,

    updateCartIndicators,

    showToast,
    createBottleMarkup
  };
})();