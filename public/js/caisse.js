const searchInput = document.getElementById('searchQuery');
const factureBody = document.getElementById('facture-body');
const totalHTEl = document.getElementById('total-ht');
const totalTTCEl = document.getElementById('total-ttc');

let factureItems = [];

// 🟢 البحث
searchInput.addEventListener('change', async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const res = await fetch(`/api/products/search?q=${query}`);
    const product = await res.json();

    if (product && product._id) {
      addToFacture(product);
      updateFactureTotals();
      searchInput.value = '';
    } else {
      alert('Produit introuvable ❌');
    }
  } catch (err) {
    console.error('Erreur recherche produit:', err);
  }
});

// 🟢 إضافة منتج
function addToFacture(product) {
  const existing = factureItems.find((item) => item._id === product._id);
  if (existing) {
    existing.qty += 1;
  } else {
    factureItems.push({
      _id: product._id,
      name: product.name,
      price: product.price,
      barcode: product.barcode,
      qty: 1,
    });
  }
  renderFacture();
}

function renderFacture() {
  factureBody.innerHTML = '';

  factureItems.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>
        <input type="number" min="1" value="${item.qty}" 
               class="qty-input" data-id="${item._id}">
      </td>
      <td>${item.price.toFixed(2)}</td>
      <td>${item.barcode}</td>
      <td style="text-align:right">${(item.price * item.qty).toFixed(2)}</td>
      <td>
        <button class="btn-delete" data-id="${item._id}">Supprimer</button>
      </td>
    `;
    factureBody.appendChild(row);
    updateFactureTotals();
  });

  // تحديث الكمية
  document.querySelectorAll('.qty-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const item = factureItems.find((i) => i._id === id);
      if (item) {
        item.qty = parseInt(e.target.value) || 1;
        renderFacture();
        updateFactureTotals();
      }
    });
  });

  // حذف منتج مع تأكيد
  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const item = factureItems.find((i) => i._id === id);
      if (item && confirm(`Voulez-vous vraiment supprimer "${item.name}" ?`)) {
        factureItems = factureItems.filter((i) => i._id !== id);
        renderFacture();
        updateFactureTotals();
      }
    });
  });

  // بعد كل تحديث → نخزن البيانات
  saveFactureToStorage();
}

// 🟢 حساب المجموع
function updateFactureTotals() {
  const totalHT = factureItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;

  totalHTEl.textContent = totalHT.toFixed(2) + ' DH';
  totalTTCEl.textContent = totalTTC.toFixed(2) + ' DH';
}

//حفظ الفاتورة في
function saveFactureToStorage() {
  localStorage.setItem('factureItems', JSON.stringify(factureItems));
}

// <!-- تعديل renderFacture() لإضافة التخزين -->

function loadFactureFromStorage() {
  const saved = localStorage.getItem('factureItems');
  if (saved) {
    factureItems = JSON.parse(saved);
    renderFacture();
  }
}

// زر لتأكيد المبيعة -->
document.getElementById('confirm-sale').addEventListener('click', async () => {
  if (factureItems.length === 0) {
    alert('⚠️ Aucune produit dans la facture !');
    return;
  }

  if (!confirm('Voulez-vous confirmer cette vente ?')) return;

  // استخدام تاريخ صالح لـ MongoDB
  const now = new Date();

  // تجهيز البيانات للإرسال
  const saleData = {
    items: factureItems.map((i) => ({
      _id: i._id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      barcode: i.barcode,
    })),
    totalHT: factureItems.reduce((sum, i) => sum + i.price * i.qty, 0),
    totalTTC: factureItems.reduce((sum, i) => sum + i.price * i.qty, 0) * 1.2,
    date: new Date().toISOString(), // ✅ تاريخ صالح
  };

  try {
    const res = await fetch('sales/api/vente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message || 'Erreur lors de l’envoi au serveur');
    }

    const result = await res.json();
    console.log('✅ Vente sauvegardée en base:', result);

    // مسح التخزين المحلي
    factureItems = [];
    saveFactureToStorage();
    renderFacture();
    updateFactureTotals();

    alert('✅ Vente confirmée et sauvegardée avec succès !');
  } catch (err) {
    console.error('❌ Erreur enregistrement vente:', err);
    alert(`Erreur lors de la sauvegarde en base ❌\n${err.message}`);
  }
});

// تحميل الفاتورة عند فتح الصفحة -->
document.addEventListener('DOMContentLoaded', () => {
  loadFactureFromStorage();
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
