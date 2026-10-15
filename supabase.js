
// ==========================================
// Caneer Cake - Supabase Configuration
// ==========================================

const SUPABASE_URL =
  "https://sgiejsmympqsfsglefsh.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_XMFlp2mHme74_kagrfyASw_Z7lgHqIT";

let caneerSupabase = null;

function initSupabase() {
  if (caneerSupabase) return caneerSupabase;

  if (!window.supabase?.createClient) {
    console.error("مكتبة Supabase غير محمّلة.");
    return null;
  }

  caneerSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  return caneerSupabase;
}

window.CaneerDB = {
  init: initSupabase,

  getClient() {
    return initSupabase();
  },

  isConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
  }
};

// التحقق من إنشاء الاتصال عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  const client = initSupabase();

  if (client) {
    console.log("Caneer Cake: تم تجهيز اتصال Supabase بنجاح.");
  }
});
