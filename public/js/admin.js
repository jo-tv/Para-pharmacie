/* ----- Safety: guard elements that must exist ----- */
const btnAjoute = document.getElementById('btnAjoute');
btnAjoute.addEventListener('click', () => {
  document.getElementById('forJoute').classList.toggle('activeAjoute');
});

// Sidebar
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const content = document.getElementById('content');

// عند الضغط على زر التبديل
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    content.classList.toggle('withSidebar');
  });
}

// دالة التحكم في الواجهة حسب الشاشة
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

// Elements
const form = document.getElementById('productForm');
const messageDiv = document.getElementById('message');
const productList = document.getElementById('productList');
const editModalEl = document.getElementById('editModal');
const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
const editForm = document.getElementById('editForm');

const searchName = document.getElementById('searchName');
const searchBarcode = document.getElementById('searchBarcode');
const searchExpiry = document.getElementById('searchExpiry');

let products = [];

// ====== Charger produits ======
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
    renderProducts();
  } catch (err) {
    console.error('Erreur lors du chargement des produits:', err);
    // إذا فشل الاتصال بالسيرفر عرض أمثلة مؤقتة (fallback)
    products = [];
    renderProducts();
  }
}

// ====== Render produits ======
function renderProducts(list = products) {
  if (!productList) return;
  productList.innerHTML = '';

  list.forEach((p) => {
    const expiryDate = p.expiry ? new Date(p.expiry).toLocaleDateString() : '-';
    // عنصر العمود (Bootstrap grid)
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    // بطاقة Bootstrap: نحافظ على هيكل البطاقات لديك
    const cardHtml = `
<div class="card product-card">
  <img src="${p.image || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOQOzK3if8ubYIFpjwxQ8kf6D7XYHZfbhD-iMvupcsBQ&amp;s=10'}"
       class="card-img-top" alt="${escapeHtml(p.name || 'Produit')}">
  <div class="card-body d-flex flex-column">
    <h5 class="card-title text-truncate">${escapeHtml(p.name || '')}</h5>
    <p class="price">${p.price !== undefined ? p.price + ' DH' : '-'}</p>
    <p class="quantity">Quantité: <span class="qty">${p.quantity ?? '-'}</span></p>
    <p class="expiry">Expiration: ${expiryDate}</p>

    <div class="mt-auto text-center barcode">
      <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(p.barcode ?? '')}&code=Code128&translate-esc=true&dpi=96&modulewidth=2&unit=Fit&imagetype=png"
           alt="Code-barre ${escapeHtml(String(p.barcode ?? ''))}" class="img-fluid">
    </div>

    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-primary btn-edit flex-fill">Modifier</button>
      <button class="btn btn-danger btn-delete flex-fill">Supprimer</button>
    </div>
  </div>
</div>
`;

    col.innerHTML = cardHtml;
    productList.appendChild(col);

    // event listeners (بعد إضافته إلى DOM)
    const editBtn = col.querySelector('.btn-edit');
    const deleteBtn = col.querySelector('.btn-delete');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!p._id) return alert('ID produit manquant');
        document.getElementById('editId').value = p._id;
        document.getElementById('editName').value = p.name || '';
        document.getElementById('editPrice').value = p.price || 0;
        document.getElementById('editQuantity').value = p.quantity || 0;
        document.getElementById('editExpiry').value = p.expiry
          ? new Date(p.expiry).toISOString().slice(0, 10)
          : '';
        if (editModal) editModal.show();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!p._id) return alert('ID produit manquant');
        if (confirm(`Voulez-vous vraiment supprimer ${p.name} ?`)) {
          fetch(`/api/products/${p._id}`, { method: 'DELETE' })
            .then((res) => res.json())
            .then((data) => {
              if (data.ok) {
                products = products.filter((prod) => prod._id !== p._id);
                renderProducts(products);
              } else {
                alert(data.message || 'Erreur suppression');
              }
            })
            .catch((err) => {
              console.error(err);
              alert('Erreur lors de la suppression');
            });
        }
      });
    }
  });
}

// ====== Formulaire ajout produit ======
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const imageInput = document.getElementById('imageFile');
    const file = imageInput?.files?.[0];

    let imageUrl = '';

    if (file) {
      // 🔹 تحويل الصورة إلى Base64
      imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    const newProduct = {
      name: document.getElementById('name').value,
      barcode: document.getElementById('barcode').value,
      price: parseFloat(document.getElementById('price').value) || 0,
      quantity: parseInt(document.getElementById('quantity').value) || 0,
      expiry: document.getElementById('expiry').value,
      image: imageUrl, // الآن Base64 string
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (res.ok) {
        messageDiv.innerHTML = `<div class="alert alert-success">${
          data.message || 'Produit ajouté'
        }</div>`;
        form.reset();
        products.push({ ...newProduct, _id: data._id || String(Date.now()) });
        renderProducts();
      } else {
        messageDiv.innerHTML = `<div class="alert alert-danger">${data.error || 'Erreur'}</div>`;
      }
    } catch (err) {
      console.error(err);
      messageDiv.innerHTML = `<div class="alert alert-danger">Erreur lors de l’envoi des données</div>`;
    }
  });
}

// ====== Formulaire modification ======
if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const updated = {
      name: document.getElementById('editName').value,
      price: parseFloat(document.getElementById('editPrice').value) || 0,
      quantity: parseInt(document.getElementById('editQuantity').value) || 0,
      expiry: document.getElementById('editExpiry').value,
    };
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.product) {
        const index = products.findIndex((p) => p._id === id);
        if (index > -1) products[index] = data.product;
        renderProducts(products);
        if (editModal) editModal.hide();
      } else {
        alert(data.message || 'Erreur modification');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour');
    }
  });
}

// ====== Recherche ======
function filterProducts() {
  const queryVal = (searchQuery?.value || '').toLowerCase().trim();
  const expiryVal = searchExpiry?.value || '';

  const filtered = products.filter((p) => {
    const pname = (p.name || '').toLowerCase();
    const pbarcode =
      p.barcode !== undefined && p.barcode !== null ? String(p.barcode).toLowerCase() : '';

    // يطابق الاسم أو الكود
    const matchesQuery = queryVal ? pname.includes(queryVal) || pbarcode.includes(queryVal) : true;

    // يطابق تاريخ الانتهاء إذا موجود
    const matchesExpiry = expiryVal
      ? new Date(p.expiry).toISOString().slice(0, 10) === expiryVal
      : true;

    return matchesQuery && matchesExpiry;
  });

  renderProducts(filtered);
}

// ====== Events ======
if (searchQuery) searchQuery.addEventListener('input', filterProducts);
if (searchExpiry) searchExpiry.addEventListener('input', filterProducts);

// ====== Helper: escape HTML to avoid injection in innerHTML usage ======
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ====== Initial load ======
loadProducts();
