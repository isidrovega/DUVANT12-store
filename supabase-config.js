"use strict";

/* ==========================================
   DUVANT 12 — SUPABASE CONFIG
========================================== */


/* ==========================================
   1. SISTEMA DE INVENTARIO
   Fuente oficial de productos
========================================== */

const INVENTORY_SUPABASE_URL =
  "https://eazrmfpenscpmwnuyyhs.supabase.co";

const INVENTORY_SUPABASE_PUBLIC_KEY =
  "sb_publishable_XbetaS_5eFBSyb68L87F7Q_MC64GhW7";


/* ==========================================
   2. TIENDA ONLINE
   Pedidos / checkout / pagos
========================================== */

const STORE_SUPABASE_URL =
  "https://jqkmnoxqtoqzdbvrwgil.supabase.co";

const STORE_SUPABASE_PUBLIC_KEY =
  "sb_publishable_hpg9ndRj20lYPijJhnlWuw_Mdis-iIT";


/* ==========================================
   VALIDAR CONFIGURACIÓN
========================================== */

if (
  !INVENTORY_SUPABASE_URL ||
  INVENTORY_SUPABASE_URL.includes("PEGA_AQUI")
) {
  throw new Error(
    "Falta configurar el Project URL del Sistema de Inventario."
  );
}

if (
  !INVENTORY_SUPABASE_PUBLIC_KEY ||
  INVENTORY_SUPABASE_PUBLIC_KEY.includes("PEGA_AQUI")
) {
  throw new Error(
    "Falta configurar la Publishable Key del Sistema de Inventario."
  );
}

if (
  !STORE_SUPABASE_URL ||
  STORE_SUPABASE_URL.includes("PEGA_AQUI")
) {
  throw new Error(
    "Falta configurar el Project URL de la Tienda Online."
  );
}

if (
  !STORE_SUPABASE_PUBLIC_KEY ||
  STORE_SUPABASE_PUBLIC_KEY.includes("PEGA_AQUI")
) {
  throw new Error(
    "Falta configurar la Publishable Key de la Tienda Online."
  );
}


/* ==========================================
   CREAR CLIENTE DEL INVENTARIO
========================================== */

window.inventorySupabase =
  window.supabase.createClient(
    INVENTORY_SUPABASE_URL,
    INVENTORY_SUPABASE_PUBLIC_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );


/* ==========================================
   CREAR CLIENTE DE LA TIENDA
========================================== */

window.storeSupabase =
  window.supabase.createClient(
    STORE_SUPABASE_URL,
    STORE_SUPABASE_PUBLIC_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );


/* ==========================================
   CONFIRMACIÓN
========================================== */

console.log(
  "DUVANT 12: Supabase Inventario conectado:",
  Boolean(window.inventorySupabase)
);

console.log(
  "DUVANT 12: Supabase Tienda conectado:",
  Boolean(window.storeSupabase)
);