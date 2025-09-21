/* ======= Dashboard.js complet avec localStorage et Pagination ======= */
/* ----- Safety: guard elements that must exist ----- */
const btnAjoute = document.getElementById('btnAjoute');
btnAjoute.addEventListener('click', () => {
  document.getElementById('forJoute').classList.toggle('activeAjoute');
});

// ----- Sidebar toggle -----
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const content = document.getElementById('content');

if (toggleBtn && sidebar && content) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    content.classList.toggle('withSidebar');
  });
}

function handleResize() {
  if (window.innerWidth >= 768) {
    if (sidebar && content) {
      sidebar.classList.add('active');
      content.classList.add('withSidebar');
    }
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    if (sidebar && content) {
      sidebar.classList.remove('active');
      content.classList.remove('withSidebar');
    }
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
  }
}

window.addEventListener('load', handleResize);
window.addEventListener('resize', handleResize);

// ----- Elements -----
const form = document.getElementById('productForm');
const messageDiv = document.getElementById('message');
const productList = document.getElementById('productList');
const editModalEl = document.getElementById('editModal');
const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
const editForm = document.getElementById('editForm');
const searchQuery = document.getElementById('searchQuery');
const searchExpiry = document.getElementById('searchExpiry');
const paginationControls = document.getElementById('paginationControls');

// ----- Variables -----
let products = [];
const rowsPerPage = 10;
const cacheKey = 'products';
let currentPage = 1;

/* ====== Charger produits ====== */
async function loadProducts() {
  // 1️⃣ Load from localStorage
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      products = JSON.parse(cached) || [];
      renderProducts(products);
    } catch {
      products = [];
    }
  }

  // 2️⃣ Fetch from server
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        products = data;
        localStorage.setItem(cacheKey, JSON.stringify(products));
        renderProducts(products);
      }
    }
  } catch (err) {
    console.error('Erreur lors du chargement des produits depuis le serveur:', err);
  }
}

/* ====== Render pagination controls ====== */
/* ====== دالة عرض Pagination جديدة ====== */
function renderPagination(list = products) {
  if (!paginationControls) return;

  const totalPages = Math.ceil(list.length / rowsPerPage);
  paginationControls.innerHTML = '';

  if (totalPages <= 1) return;

  const ul = document.createElement('ul');
  ul.className = 'pagination justify-content-center';

  // زر الصفحة السابقة
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
  prevLi.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      renderProducts(list);
    }
  });
  ul.appendChild(prevLi);

  // عرض أرقام الصفحات
  const maxPagesToShow = 5; // عدد الصفحات القصوى للعرض
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  // عرض الصفحة الأولى إذا لم تكن ضمن النطاق
  if (startPage > 1) {
    const li = document.createElement('li');
    li.className = 'page-item';
    li.innerHTML = `<a class="page-link" href="#">1</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = 1;
      renderProducts(list);
    });
    ul.appendChild(li);
    if (startPage > 2) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = 'page-item disabled';
      ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
      ul.appendChild(ellipsisLi);
    }
  }

  // عرض الصفحات داخل النطاق المحدد
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = i;
      renderProducts(list);
    });
    ul.appendChild(li);
  }

  // عرض الصفحة الأخيرة إذا لم تكن ضمن النطاق
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = 'page-item disabled';
      ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
      ul.appendChild(ellipsisLi);
    }
    const li = document.createElement('li');
    li.className = 'page-item';
    li.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = totalPages;
      renderProducts(list);
    });
    ul.appendChild(li);
  }

  // زر الصفحة التالية
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
  nextLi.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts(list);
    }
  });
  ul.appendChild(nextLi);

  paginationControls.appendChild(ul);
}

/* ====== Render produits ====== */
function renderProducts(list = products) {
  if (!productList) return;
  productList.innerHTML = '';

  // Calculate start and end indexes for the current page
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const productsToRender = list.slice(startIndex, endIndex);

  productsToRender.forEach((p) => {
    const expiryDate = p.expiry ? new Date(p.expiry).toLocaleDateString() : '-';
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    col.innerHTML = `
      <div class="card product-card">
        <img src="${
          p.image ||
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOQOzK3if8ubYIFpjwxQ8kf6D7XYHZfbhD-iMvupcsBQ&amp;s=10'
        }" class="card-img-top" alt="${escapeHtml(p.name || 'Produit')}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title text-truncate">${escapeHtml(p.name || '')}</h5>
          <p class="price">
            ${p.price !== undefined ? p.price.toFixed(2) + ' DH' : '-'}
          </p>
          <p class="quantity">Quantité: <span class="qty">${p.quantity ?? '-'}</span></p>
          <p class="expiry">Expiration: ${expiryDate}</p>

          <div class="mt-auto text-center barcode">
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
              p.barcode ?? ''
            )}&code=Code128&translate-esc=true&dpi=96&modulewidth=2&unit=Fit&imagetype=png"
                 alt="Code-barre ${escapeHtml(String(p.barcode ?? ''))}" class="img-fluid">
          </div>

          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary btn-edit flex-fill">Modifier</button>
            <button class="btn btn-danger btn-delete flex-fill">Supprimer</button>
          </div>
        </div>
      </div>
    `;

    productList.appendChild(col);

    // ----- Edit button -----
    const editBtn = col.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!p._id) return alert('ID produit manquant');
        document.getElementById('editId').value = p._id;
        document.getElementById('editName').value = p.name || '';
        document.getElementById('editPrice').value = p.price || 0;
        document.getElementById('editQuantity').value = p.quantity || 0;
        document.getElementById('editBarcode').value = p.barcode || '';
        document.getElementById('editExpiry').value = p.expiry
          ? new Date(p.expiry).toISOString().slice(0, 10)
          : '';
          document.getElementById('editImgeUrl').value = p.image;
        if (editModal) editModal.show();
      });
    }

    // ----- Delete button -----
    const deleteBtn = col.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!p._id) return alert('ID produit manquant');
        if (confirm(`Voulez-vous vraiment supprimer ${p.name} ?`)) {
          fetch(`/api/products/${p._id}`, { method: 'DELETE' })
            .then((res) => res.json())
            .then((data) => {
              if (data.ok) {
                products = products.filter((prod) => prod._id !== p._id);
                updateLocalStorage();
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

  renderPagination(list);
}

/* ====== Formulaire ajout produit ====== */
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const imageInput = document.getElementById('imageFile');
    const imageUrl2 = document.getElementById('imageUrl2').value;
    const file = imageInput?.files?.[0];
    let imageUrl = '';

    if (file) {
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
      image: imageUrl || imageUrl2,
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (res.ok) {
        products.push({ ...newProduct, _id: data._id || String(Date.now()) });
        updateLocalStorage();
        renderProducts(products);
        form.reset();
        messageDiv.innerHTML = `<div class="alert alert-success">${
          data.message || 'Produit ajouté'
        }</div>`;
      } else {
        messageDiv.innerHTML = `<div class="alert alert-danger">${data.error || 'Erreur'}</div>`;
      }
    } catch (err) {
      console.error(err);
      messageDiv.innerHTML = `<div class="alert alert-danger">Erreur lors de l’envoi des données</div>`;
    }
  });
}

/* ====== Formulaire modification ====== */
if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const updated = {
      name: document.getElementById('editName').value,
      barcode: document.getElementById('editBarcode').value,
      price: parseFloat(document.getElementById('editPrice').value) || 0,
      quantity: parseInt(document.getElementById('editQuantity').value) || 0,
      expiry: document.getElementById('editExpiry').value,
      image: document.getElementById('editImgeUrl').value,
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
        updateLocalStorage();
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

/* ====== Recherche ====== */
function filterProducts() {
  const queryVal = (searchQuery?.value || '').toLowerCase().trim();
  const expiryVal = searchExpiry?.value || '';

  const filtered = products.filter((p) => {
    const pname = (p.name || '').toLowerCase();
    const pbarcode =
      p.barcode !== undefined && p.barcode !== null ? String(p.barcode).toLowerCase() : '';
    const matchesQuery = queryVal ? pname.includes(queryVal) || pbarcode.includes(queryVal) : true;
    const matchesExpiry = expiryVal
      ? new Date(p.expiry).toISOString().slice(0, 10) === expiryVal
      : true;
    return matchesQuery && matchesExpiry;
  });

  // Reset currentPage to 1 when a new search is performed
  currentPage = 1;
  renderProducts(filtered);
}

if (searchQuery) searchQuery.addEventListener('input', filterProducts);
if (searchExpiry) searchExpiry.addEventListener('input', filterProducts);

/* ====== Helper ====== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ====== Mise à jour localStorage ====== */
function updateLocalStorage() {
  localStorage.setItem(cacheKey, JSON.stringify(products));
}

/* ====== Initial load ====== */
loadProducts();



  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker مسجل بنجاح"))
      .catch((err) => console.error("فشل تسجيل SW:", err));
  };
  
  