// Sidebar
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const content = document.getElementById('content');

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    content.classList.toggle('withSidebar');
  });
}

function handleResize() {
  if (window.innerWidth >= 768) {
    sidebar.classList.add('active');
    content.classList.add('withSidebar');
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    sidebar.classList.remove('active');
    content.classList.remove('withSidebar');
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
  }
}
window.addEventListener('load', handleResize);
window.addEventListener('resize', handleResize);
let products = [];
let dataTableInstance = null;

// =======================
// إضافة منتج جديد
// =======================
async function addProduct(newProductData) {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newProductData),
    });

    if (!res.ok) throw new Error('Failed to add product');

    const addedProduct = await res.json();
    addedProduct._isNew = true; // Highlight the new product

    // Add the new product to the local array
    products.unshift(addedProduct);

    // Sort and update localStorage
    products = products.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );
    localStorage.setItem('productsData', JSON.stringify(products));

    renderProducts(products);

    console.log(`✅ تم إضافة منتج جديد بنجاح: ${addedProduct.name}`);
  } catch (err) {
    console.error("❌ Erreur lors de l'ajout du produit:", err);
  }
}

// =======================
// تحميل المنتجات من localStorage أو السيرفر
// =======================
async function loadProducts(forceReload = false) {
  try {
    let localProducts = JSON.parse(localStorage.getItem('productsData')) || [];

    if (!forceReload && localProducts.length > 0) {
      products = localProducts.sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );
      renderProducts(products);
      return;
    }

    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const serverProducts = await res.json();

    products = serverProducts.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );

    localStorage.setItem('productsData', JSON.stringify(products));
    localStorage.setItem('lastSync', new Date().toISOString());

    renderProducts(products);

    console.log(`✅ جميع المنتجات تم تحميلها (${products.length})`);
  } catch (err) {
    console.error('❌ Erreur lors du chargement des produits:', err);
  }
}

// =======================
// مزامنة المنتجات (الحذف والإضافة والتعديل)
// =======================
async function syncProducts() {
  try {
    const lastSync = localStorage.getItem('lastSync') || new Date(0).toISOString();
    const res = await fetch(`/api/products/updates?lastSync=${encodeURIComponent(lastSync)}`);
    if (!res.ok) throw new Error('Failed to fetch updates');

    const updates = await res.json();
    if (updates.length > 0) {
      let products = JSON.parse(localStorage.getItem('productsData')) || [];
      updates.forEach((p) => {
        const index = products.findIndex((prod) => prod._id === p._id);
        if (index !== -1) products[index] = p;
        else products.unshift(p);
      });

      localStorage.setItem('productsData', JSON.stringify(products));
      renderProducts(products);
    }

    localStorage.setItem('lastSync', new Date().toISOString());
    console.log(`✅ ${updates.length} produits mis à jour.`);
  } catch (err) {
    console.error('❌ Error during sync:', err);
  }
}

// استدعاء أولي ومتابعة كل 30 ثانية
syncProducts();
setInterval(syncProducts, 30 * 1000);

// استدعاء أولي عند تحميل الصفحة
syncProducts();

// =======================
// عرض المنتجات
// =======================
// =======================
// عرض المنتجات
// =======================
function renderProducts(list) {
  const tbody = document.getElementById('productsBody');
  // بناء محتوى الصفوف كـ HTML واحد
  const rowsHtml = list
    .map((p) => {
      const expiryDate = p.expiry ? new Date(p.expiry).toLocaleDateString() : '—';
      const highlightClass = p._isNew ? 'table-success' : '';
      return `<tr class="${highlightClass}">
              <td>${p.name}</td>
              <td>${p.price} DH</td>
              <td>${p.quantity}</td>
              <td>${expiryDate}</td>
              <td>${p.barcode}</td>
            </tr>`;
    })
    .join('');
  tbody.innerHTML = rowsHtml;

  // إعادة تهيئة DataTables فقط إذا كانت غير مهيأة
  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }

  dataTableInstance = $('#productsTable').DataTable({
    responsive: true,
    pageLength: 20,
    lengthMenu: [10, 20, 50, 100],
    dom: 'Bflrtip',
    buttons: [
      {
        extend: 'excelHtml5',
        text: '<i class="bi bi-file-earmark-spreadsheet"></i> Excel',
        className: 'btn btn-success',
      },
      {
        extend: 'csvHtml5',
        text: '<i class="bi bi-filetype-csv"></i> CSV',
        className: 'btn btn-info',
      },
      {
        extend: 'pdfHtml5',
        text: '<i class="bi bi-file-earmark-pdf-fill"></i> PDF',
        className: 'btn btn-danger',
      },
      {
        extend: 'print',
        text: '<i class="bi bi-printer-fill"></i>️ Print',
        className: 'btn btn-secondary',
      },
      {
        text: '<i class="bi bi-trash3-fill"></i> Clear & Reload', // نص الزر
        className: 'btn btn-warning', // لون الزر
        action: function (e, dt, node, config) {
          // مسح بيانات محددة من localStorage
          localStorage.removeItem('productsData'); // أو localStorage.clear() لمسح الكل

          // إعادة تحميل الصفحة
          location.reload();
        },
      },
    ],
    language: {
      url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json',
    },
  });

  // إزالة وسم المنتجات الجديدة بعد العرض
  list.forEach((p) => delete p._isNew);
}

// =======================
// فلترة المنتجات
// =======================
function filterProducts() {
  const query = searchQuery.value.toLowerCase().trim();
  const expiryVal = searchExpiry.value;

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query || p.name.toLowerCase().includes(query) || p.barcode.toLowerCase().includes(query);
    const matchesExpiry = expiryVal
      ? new Date(p.expiry).toISOString().slice(0, 10) === expiryVal
      : true;
    return matchesQuery && matchesExpiry;
  });

  renderProducts(filtered);
}

// =======================
// زر لتحديث البيانات يدوياً
// =======================
function reloadProducts() {
  loadProducts(true);
}

// =======================
// التحميل الأولي + مزامنة تلقائية
// =======================
loadProducts();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker مسجل بنجاح"))
      .catch((err) => console.error("فشل تسجيل SW:", err));
  };