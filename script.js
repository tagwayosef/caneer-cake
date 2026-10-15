
/* =====================================================
   Caneer Cake - Main Script
   Products: Supabase
   Admin: Supabase Auth + is_caneer_admin()
   Cart: Local Storage
   Language: Arabic RTL
===================================================== */

/* ---------- الإعدادات ---------- */

// اكتبي رقم واتساب المتجر مع مفتاح الدولة، بدون + أو مسافات.
// مثال توضيحي فقط: 9677XXXXXXXX
const WHATSAPP_NUMBER = "776014045";

// مفاتيح السلة المحلية
const CART_KEY = "caneer_cake_cart_v1";

// التصنيفات
const CATEGORY_NAMES = {
  events: "كيك المناسبات",
  daily: "كيك يومي",
  desserts: "حلويات",
};

// بيانات المنتجات تأتي من Supabase
let products = [];
let cart = loadCart();
let selectedCategory = "all";
let isAdminLoggedIn = false;
let isSavingProduct = false;


/* ---------- أدوات مساعدة ---------- */

function getDB() {
  return window.CaneerDB?.getClient?.() || null;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("ar")} ر.ي`;
}

function showToast(message) {
  let toast = document.getElementById("caneer-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "caneer-toast";

    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "99999",
      background: "#1e40af",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "12px",
      boxShadow: "0 5px 20px #0002",
      maxWidth: "90%",
      textAlign: "center",
      fontSize: "14px",
    });

    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = "block";

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}


/* ---------- تحميل المنتجات من Supabase ---------- */

async function loadProductsFromSupabase() {
  const db = getDB();
  const grid = document.getElementById("products-grid");

  if (!db) {
    console.error("تعذر الاتصال بـ Supabase.");
    if (grid) {
      grid.innerHTML =
        '<p>تعذر الاتصال بقاعدة البيانات. تحققي من إعدادات Supabase.</p>';
    }
    return;
  }

  if (grid) {
    grid.innerHTML = "<p>جارٍ تحميل المنتجات...</p>";
  }

  const { data, error } = await db
    .from("products")
    .select(
      "id, name, description, price, category, image_url, is_active, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("خطأ تحميل المنتجات:", error.message);

    if (grid) {
      grid.innerHTML =
        '<p>تعذر تحميل المنتجات. تحققي من اتصال قاعدة البيانات.</p>';
    }

    return;
  }

  products = (data || []).map((product) => ({
    ...product,
    image: product.image_url || "",
  }));

  renderProducts();
  renderCart();
}


/* ---------- عرض المنتجات ---------- */

function renderProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter(
          (product) => product.category === selectedCategory
        );

  if (!filteredProducts.length) {
    grid.innerHTML = "<p>لا توجد منتجات في هذا التصنيف حاليًا.</p>";
    return;
  }

  grid.innerHTML = filteredProducts.map((product) => {
    const image = product.image_url || product.image || "";

    return `
    <article class="product-card" data-aos="fade-up">
     
        <div class="product-image-wrapper">
          ${
            image
              ? `
                <img
                  class="product-image"
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(product.name)}"
                  loading="lazy"
                  onerror="this.style.display='none'"
                >
              `
              : `
                <div class="product-image-placeholder">
                  🎂
                </div>
              `
          }
        </div>

        <div class="product-info">
          <span class="product-category">
            ${escapeHTML(
              CATEGORY_NAMES[product.category] || "كيك وحلويات"
            )}
          </span>

          <h3>${escapeHTML(product.name)}</h3>

          <p>
            ${escapeHTML(product.description || "")}
          </p>

          <div class="product-bottom">
            <span class="product-price">
              ${formatPrice(product.price)}
            </span>

            <button
              type="button"
              class="add-to-cart-btn"
              onclick="addToCart('${String(product.id)}')"
            >
              أضيفي للسلة
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}


/* ---------- التصنيفات ---------- */

function selectCategory(category) {
  selectedCategory = category;
  renderProducts();
}

// يمكن ربط أزرار التصنيفات بهذه الدالة:
// onclick="selectCategory('events')"
// onclick="selectCategory('daily')"
// onclick="selectCategory('desserts')"
// onclick="selectCategory('all')"


/* ---------- السلة ---------- */

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("تعذر تحميل السلة:", error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId) {
  const product = products.find(
    (item) => String(item.id) === String(productId)
  );

  if (!product) {
    showToast("هذا المنتج غير متوفر حاليًا.");
    return;
  }

  const existing = cart.find(
    (item) => String(item.id) === String(productId)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image_url || product.image || "",
      quantity: 1,
    });
  }

  saveCart();
  renderCart();
  showToast("تمت إضافة المنتج إلى السلة 🧁");
}

function removeFromCart(productId) {
  cart = cart.filter(
    (item) => String(item.id) !== String(productId)
  );

  saveCart();
  renderCart();
}

function changeQuantity(productId, change) {
  const item = cart.find(
    (entry) => String(entry.id) === String(productId)
  );

  if (!item) return;

  item.quantity += Number(change);

  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  renderCart();
}

function getCartTotal() {
  return cart.reduce(
    (total, item) =>
      total + Number(item.price) * Number(item.quantity),
    0
  );
}

function renderCart() {
  const countElement = document.getElementById("cart-count");
  const itemsElement = document.getElementById("cart-items");
  const totalElement = document.getElementById("cart-total");

  const count = cart.reduce(
    (total, item) => total + Number(item.quantity),
    0
  );

  if (countElement) {
    countElement.textContent = count;
  }

  if (itemsElement) {
    if (!cart.length) {
      itemsElement.innerHTML = "<p>سلتك فارغة حاليًا 🍰</p>";
    } else {
      itemsElement.innerHTML = cart.map((item) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <strong>${escapeHTML(item.name)}</strong>
            <p>${formatPrice(item.price)}</p>
          </div>

          <div class="quantity-controls">
            <button
              type="button"
              onclick="changeQuantity('${String(item.id)}', 1)"
              aria-label="زيادة الكمية"
            >+</button>

            <span>${Number(item.quantity)}</span>

            <button
              type="button"
              onclick="changeQuantity('${String(item.id)}', -1)"
              aria-label="تقليل الكمية"
            >−</button>
          </div>

          <button
            type="button"
            class="remove-cart-item"
            onclick="removeFromCart('${String(item.id)}')"
          >
            حذف
          </button>
        </div>
      `).join("");
    }
  }

  if (totalElement) {
    totalElement.textContent = formatPrice(getCartTotal());
  }
}

function openCart() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeCart() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}


/* ---------- إتمام الطلب عبر واتساب ---------- */

function checkout() {
  if (!cart.length) {
    showToast("أضيفي منتجًا إلى السلة أولًا.");
    return;
  }

  if (!WHATSAPP_NUMBER.trim()) {
    showToast("يجب إضافة رقم واتساب المتجر داخل script.js أولًا.");
    return;
  }

  const lines = cart.map((item) =>
    `• ${item.name} × ${item.quantity} = ${formatPrice(
      item.price * item.quantity
    )}`
  );

  const message = [
    "مرحبًا Caneer Cake 🎂",
    "",
    "أرغب في طلب المنتجات التالية:",
    ...lines,
    "",
    `الإجمالي: ${formatPrice(getCartTotal())}`,
    "",
    "يرجى تأكيد الطلب وموعد الاستلام.",
  ].join("\n");

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}` +
    `?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}


/* ---------- نافذة المدير وتسجيل الدخول ---------- */

async function openAdmin() {
  console.log("1. تم استدعاء openAdmin");

  const modal = document.getElementById("admin-modal");
  const content = document.getElementById("admin-content");
  const db = getDB();

  console.log("2. نافذة الإدارة:", modal);
  console.log("3. محتوى الإدارة:", content);
  console.log("4. اتصال Supabase:", !!db);

  if (!modal || !content) {
    alert("لم يتم العثور على نافذة الإدارة أو محتواها في index.html");
    return;
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  if (!db) {
    alert("تعذر الاتصال بـ Supabase.");
    return;
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  content.innerHTML = "<p>جارٍ التحقق من صلاحيات المدير...</p>";

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError) {
    console.error(sessionError);
    content.innerHTML = "<p>تعذر التحقق من جلسة الدخول.</p>";
    return;
  }

  if (sessionData.session) {
    const { data: isAdmin, error } =
      await db.rpc("is_caneer_admin");

    if (!error && isAdmin === true) {
      isAdminLoggedIn = true;
      await renderAdmin();
      return;
    }

    await db.auth.signOut();
  }

  isAdminLoggedIn = false;

  content.innerHTML = `
    <div class="admin-login">
      <h2>دخول المدير</h2>
      <p>سجلي الدخول لإدارة منتجات Caneer Cake.</p>

      <form id="caneer-admin-login">
        <label for="admin-email">البريد الإلكتروني</label>
        <input
          id="admin-email"
          type="email"
          autocomplete="username"
          required
          placeholder="البريد الإلكتروني"
        >

        <label for="admin-password">كلمة المرور</label>
        <input
          id="admin-password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="كلمة المرور"
        >

        <button type="submit" class="admin-save-btn">
          تسجيل الدخول
        </button>

        <p id="admin-login-message" role="status"></p>
      </form>
    </div>
  `;

  const form = document.getElementById("caneer-admin-login");
  const message = document.getElementById("admin-login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email =
      document.getElementById("admin-email").value.trim();

    const password =
      document.getElementById("admin-password").value;

    const button = form.querySelector('button[type="submit"]');

    button.disabled = true;
    message.textContent = "جارٍ التحقق من الحساب...";

    try {
      const { error: loginError } =
        await db.auth.signInWithPassword({ email, password });

      if (loginError) {
        message.textContent =
          "تعذر تسجيل الدخول. تحققي من البريد وكلمة المرور.";
        return;
      }

      const { data: isAdmin, error: roleError } =
        await db.rpc("is_caneer_admin");

      if (roleError || isAdmin !== true) {
        await db.auth.signOut();

        message.textContent =
          "هذا الحساب ليس لديه صلاحية المدير.";
        return;
      }

      isAdminLoggedIn = true;
      showToast("تم تسجيل الدخول بنجاح 🧁");
      await renderAdmin();

    } catch (error) {
      console.error("خطأ تسجيل الدخول:", error);
      message.textContent =
        "حدث خطأ في الاتصال. حاولي مرة أخرى.";
    } finally {
      button.disabled = false;
    }
  });
}

function closeAdmin() {
  const modal = document.getElementById("admin-modal");
  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

async function adminLogout() {
  const db = getDB();

  if (db) {
    const { error } = await db.auth.signOut();

    if (error) {
      console.error("تعذر تسجيل الخروج:", error);
      showToast("تعذر تسجيل الخروج. حاولي مرة أخرى.");
      return;
    }
  }

  isAdminLoggedIn = false;
  showToast("تم تسجيل الخروج.");
  await openAdmin();
}


/* ---------- لوحة إدارة المنتجات ---------- */


async function renderAdmin() {
  const content = document.getElementById("admin-content");
  const db = getDB();

  if (!content || !db || !isAdminLoggedIn) return;

  content.innerHTML = "<p>جارٍ تحميل لوحة الإدارة...</p>";

  // التحقق من صلاحية المدير
  const { data: isAdmin, error: roleError } =
    await db.rpc("is_caneer_admin");

  if (roleError || isAdmin !== true) {
    isAdminLoggedIn = false;
    content.innerHTML = "<p>ليس لديكِ صلاحية إدارة المنتجات.</p>";
    return;
  }

  // تحميل جميع المنتجات للمدير
  const { data: allProducts, error } = await db
    .from("products")
    .select(
      "id, name, description, price, category, image_url, is_active, sort_order"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("خطأ تحميل لوحة الإدارة:", error);
    content.innerHTML =
      "<p>تعذر تحميل المنتجات. تحققي من صلاحيات قاعدة البيانات.</p>";
    return;
  }

  content.innerHTML = `
    <div class="admin-header">
      <h2>إدارة منتجات Caneer Cake 🎂</h2>
      <button type="button" id="admin-logout-btn">
        تسجيل الخروج
      </button>
    </div>

    <p>أضيفي منتجات الكيك والحلويات والمشروبات والبوفيه من هنا.</p>

    <form id="product-form" class="admin-product-form">
      <label for="product-name">اسم المنتج *</label>
      <input
        id="product-name"
        type="text"
        required
        maxlength="150"
        placeholder="مثال: كيكة الشوكولاتة"
      >

      <label for="product-description">وصف المنتج</label>
      <textarea
        id="product-description"
        rows="3"
        maxlength="2000"
        placeholder="اكتبي وصف المنتج"
      ></textarea>

      <label for="product-price">السعر بالريال اليمني *</label>
      <input
        id="product-price"
        type="number"
        min="0"
        step="0.01"
        required
        placeholder="السعر"
      >

      <label for="product-category">التصنيف *</label>
      <select id="product-category" required>
        <option value="events">كيك المناسبات</option>
        <option value="daily">كيك يومي</option>
        <option value="desserts">حلويات</option>
        <option value="drinks">مشروبات</option>
        <option value="buffet">بوفيه</option>
      </select>

      <label for="product-image-file">صورة المنتج</label>
      <input
        id="product-image-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
      >

      <p class="admin-image-note">
        اختاري الصورة من جهازك. الحد الأقصى 5 ميجابايت.
      </p>

      <button
        type="submit"
        class="admin-save-btn"
        id="product-save-btn"
      >
        إضافة المنتج
      </button>

      <p id="product-form-message" role="status"></p>
    </form>

    <hr>

    <h3>المنتجات الحالية</h3>

    <div id="admin-products-list">
      ${
        !allProducts?.length
          ? "<p>لا توجد منتجات حاليًا.</p>"
          : allProducts.map((product) => `
            <div class="admin-product-row">
              <div class="admin-product-details">
                ${
                  product.image_url
                    ? `<img
                        src="${escapeHTML(product.image_url)}"
                        alt="${escapeHTML(product.name)}"
                        loading="lazy"
                        style="width:80px;height:80px;object-fit:cover;border-radius:10px;"
                      >`
                    : ""
                }

                <strong>${escapeHTML(product.name)}</strong>
                <p>${formatPrice(product.price)}</p>

                <small>
                  التصنيف:
                  ${escapeHTML(CATEGORY_NAMES[product.category] || product.category)}
                </small>

                <br>

                <small>
                  ${product.is_active ? "ظاهر في الموقع" : "مخفي من الموقع"}
                </small>
              </div>

              <div class="admin-product-actions">
                <button
                  type="button"
                  class="admin-toggle-btn"
                  onclick="toggleProduct('${String(product.id)}', ${!product.is_active})"
                >
                  ${product.is_active ? "إخفاء" : "إظهار"}
                </button>

                <button
                  type="button"
                  class="admin-delete-btn"
                  onclick="deleteProduct('${String(product.id)}')"
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          `).join("")
      }
    </div>
  `;

  document
    .getElementById("admin-logout-btn")
    ?.addEventListener("click", adminLogout);

  document
    .getElementById("product-form")
    ?.addEventListener("submit", saveProduct);
}



/* ---------- إضافة منتج إلى Supabase ---------- */


async function saveProduct(event) {
  event.preventDefault();

  if (isSavingProduct) return;

  const db = getDB();

  if (!db || !isAdminLoggedIn) {
    showToast("سجلي الدخول بصلاحية المدير أولًا.");
    return;
  }

  const name = document.getElementById("product-name").value.trim();
  const description = document.getElementById("product-description").value.trim();
  const price = Number(document.getElementById("product-price").value);
  const category = document.getElementById("product-category").value;

  const imageInput = document.getElementById("product-image-file");
  const imageFile = imageInput?.files?.[0] || null;

  const message = document.getElementById("product-form-message");
  const button = document.getElementById("product-save-btn");

  if (!name || !Number.isFinite(price) || price < 0) {
    message.textContent = "تحققي من اسم المنتج والسعر.";
    return;
  }

  if (!["events", "daily", "desserts", "drinks", "buffet"].includes(category)) {
    message.textContent = "اختاري تصنيفًا صحيحًا.";
    return;
  }

  if (imageFile) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(imageFile.type)) {
      message.textContent = "اختاري صورة بصيغة JPG أو PNG أو WEBP أو GIF.";
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      message.textContent = "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.";
      return;
    }
  }

  isSavingProduct = true;
  if (button) button.disabled = true;
  message.textContent = "جارٍ التحقق من الصلاحيات...";

  let uploadedPath = null;

  try {
    const { data: isAdmin, error: roleError } =
      await db.rpc("is_caneer_admin");

    if (roleError || isAdmin !== true) {
      isAdminLoggedIn = false;
      message.textContent = "لا توجد صلاحية لإضافة المنتجات.";
      return;
    }

    let imageUrl = null;

    if (imageFile) {
      message.textContent = "جارٍ رفع الصورة...";

      const extension = imageFile.name.split(".").pop().toLowerCase();
      const filePath =
        `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { data: uploadedFile, error: uploadError } =
        await db.storage
          .from("products")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imageFile.type,
          });

      if (uploadError) {
        console.error("خطأ رفع الصورة:", uploadError);
        message.textContent =
          "فشل رفع الصورة. تحققي من إعدادات Storage وصلاحيات المدير.";
        return;
      }

      uploadedPath = uploadedFile.path;

      const { data: publicImage } = db.storage
        .from("products")
        .getPublicUrl(uploadedFile.path);

      imageUrl = publicImage.publicUrl;
    }

    message.textContent = "جارٍ حفظ المنتج...";

    const { error: insertError } = await db
      .from("products")
      .insert({
        name,
        description,
        price,
        category,
        image_url: imageUrl,
        is_active: true,
        sort_order: 0,
      });

    if (insertError) {
      console.error("خطأ حفظ المنتج:", insertError);
      message.textContent = "تعذر حفظ المنتج في قاعدة البيانات.";
      
      // تنظيف الصورة إذا فشل حفظ المنتج
      if (uploadedPath) {
        const { error: cleanupError } = await db.storage
          .from("products")
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error("تعذر حذف الصورة المرفوعة:", cleanupError);
        }
      }
      return;
    }

    showToast("تمت إضافة المنتج بنجاح 🎂");

    await loadProductsFromSupabase();
    await renderAdmin();

  } catch (error) {
    console.error("خطأ أثناء إضافة المنتج:", error);
    message.textContent = "حدث خطأ أثناء إضافة المنتج. راجعي Console.";
  } finally {
    isSavingProduct = false;

    const saveButton = document.getElementById("product-save-btn");
    if (saveButton) saveButton.disabled = false;
  }
}


/* ---------- إظهار أو إخفاء المنتج ---------- */

async function toggleProduct(productId, shouldActivate) {
  const db = getDB();

  if (!db || !isAdminLoggedIn) {
    showToast("يجب تسجيل الدخول كمدير.");
    return;
  }

  const { data: isAdmin, error: roleError } =
    await db.rpc("is_caneer_admin");

  if (roleError || isAdmin !== true) {
    showToast("ليس لديكِ صلاحية تعديل المنتجات.");
    return;
  }

  const { error } = await db
    .from("products")
    .update({ is_active: Boolean(shouldActivate) })
    .eq("id", productId);

  if (error) {
    console.error("خطأ تغيير حالة المنتج:", error);
    showToast("تعذر تحديث المنتج.");
    return;
  }

  showToast(shouldActivate ? "تم إظهار المنتج." : "تم إخفاء المنتج.");

  await loadProductsFromSupabase();
  await renderAdmin();
}


/* ---------- حذف المنتج نهائيًا ---------- */

async function deleteProduct(productId) {
  const confirmed = confirm(
    "هل أنتِ متأكدة من حذف المنتج نهائيًا؟ لا يمكن التراجع عن هذا الإجراء."
  );

  if (!confirmed) return;

  const db = getDB();

  if (!db || !isAdminLoggedIn) {
    showToast("يجب تسجيل الدخول كمدير.");
    return;
  }

  const { data: isAdmin, error: roleError } =
    await db.rpc("is_caneer_admin");

  if (roleError || isAdmin !== true) {
    showToast("ليس لديكِ صلاحية حذف المنتجات.");
    return;
  }

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("خطأ حذف المنتج:", error);
    showToast(
      "تعذر الحذف. قد يكون المنتج مرتبطًا بطلبات سابقة."
    );
    return;
  }

  // إزالة المنتج من السلة المحلية أيضًا
  cart = cart.filter(
    (item) => String(item.id) !== String(productId)
  );

  saveCart();
  showToast("تم حذف المنتج.");

  await loadProductsFromSupabase();
  await renderAdmin();
}


/* ---------- توافق مع الأزرار القديمة ---------- */

// لا نعيد المنتجات التجريبية إلى الموقع؛ مصدر المنتجات هو Supabase.
function resetDemoProducts() {
  showToast("المنتجات تُدار من قاعدة بيانات Supabase.");
}


/* ---------- بدء الموقع ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("current-year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  renderCart();
  loadProductsFromSupabase();
});

// السماح باستدعاء الدوال من أزرار HTML
window.renderProducts = renderProducts;
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changeQuantity = changeQuantity;
window.renderCart = renderCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.openAdmin = openAdmin;

window.closeAdmin = closeAdmin;
window.adminLogout = adminLogout;
window.toggleProduct = toggleProduct;
window.deleteProduct = deleteProduct;
window.resetDemoProducts = resetDemoProducts;
window.loadProductsFromSupabase = loadProductsFromSupabase;

console.log("script.js loaded:", typeof window.openAdmin);

document.querySelectorAll(".admin-button").forEach((button) => {
  button.addEventListener("click", () => {
    console.log("تم الضغط على زر الإدارة");
    console.log("openAdmin:", typeof window.openAdmin);
  });
});