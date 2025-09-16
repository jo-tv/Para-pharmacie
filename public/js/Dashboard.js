// ===== Sidebar =====
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
  if (!sidebar || !content) return;
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

// ===== Main Dashboard =====
document.addEventListener('DOMContentLoaded', () => {
  const statsRow = document.getElementById('statsRow');
  const expiryCanvas = document.getElementById('expiryChart');
  const topCanvas = document.getElementById('topProductsChart');

  const expiredBody = document.getElementById('expiredBody');
  const expiredPagination = document.getElementById('expiredPagination');
  const lowStockBody = document.getElementById('lowStockBody');
  const lowStockPagination = document.getElementById('lowStockPagination');

  const rowsPerPage = 10; // عدد الصفوف لكل صفحة
  let expiredProducts = [];
  let lowStockProducts = [];

  let expiryChartInstance = null;
  let topChartInstance = null;

  // ===== Load products =====
  async function loadStats() {
    let products = [];
    const cached = localStorage.getItem('products');
    if (cached) {
      try {
        products = JSON.parse(cached) || [];
      } catch {
        products = [];
      }
    }

    if (products.length > 0) renderStats(products);

    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        products = await res.json();
        if (Array.isArray(products)) {
          localStorage.setItem('products', JSON.stringify(products));
          renderStats(products);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }

  // ===== Calculate stats =====
  function calculateStats(products) {
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);

    let totalProducts = 0,
      outOfStock = 0,
      lowStock = 0,
      expiredCount = 0,
      almostExpiredCount = 0,
      totalValue = 0,
      negativeStock = 0; // منتجات بكمية سالبة

    const expiredRows = [];
    const lowStockRows = [];
    const negativeStockRows = [];

    products.forEach((p) => {
      const price = Number(p.price) || 0;
      let qty = Number(p.quantity) || 0;

      totalProducts++;

      // ✅ معالجة الكمية السالبة
      if (qty < 0) {
        negativeStock++;
        negativeStockRows.push(p);
        qty = 0; // نصححه إلى صفر حتى لا يؤثر على الحساب
      }

      totalValue += price * qty;

      if (qty === 0) outOfStock++;
      if (qty > 0 && qty <= 1) lowStock++;

      const expiryDate = p.expiry ? new Date(p.expiry) : null;
      if (expiryDate && !isNaN(expiryDate)) {
        if (expiryDate < today) {
          expiredCount++;
          expiredRows.push(p);
        } else if (expiryDate <= oneYearLater) {
          almostExpiredCount++;
          expiredRows.push(p);
        }
      }

      if (qty <= 2) lowStockRows.push(p);
    });

    return {
      totalProducts,
      outOfStock,
      lowStock,
      expiredCount,
      almostExpiredCount,
      totalValue,
      expiredRows,
      lowStockRows,
      negativeStock,
      negativeStockRows,
    };
  }

  // ===== Render stats, tables, charts =====
  function renderStats(products) {
    const {
      totalProducts,
      outOfStock,
      lowStock,
      expiredCount,
      almostExpiredCount,
      totalValue,
      expiredRows,
      lowStockRows,
    } = calculateStats(products);

    if (statsRow) {
      statsRow.innerHTML = [
        { title: 'Total Produits', value: totalProducts, icon: 'bi-box-seam', color: 'bg-primary' },
        {
          title: 'Stock Faible',
          value: lowStock,
          icon: 'bi-exclamation-circle',
          color: 'bg-warning',
        },
        { title: 'Stock Épuisé', value: outOfStock, icon: 'bi-x-circle', color: 'bg-danger' },
        {
          title: 'Expirés',
          value: expiredCount,
          icon: 'bi-exclamation-triangle',
          color: 'bg-danger',
        },
        {
          title: 'Presque Expirés',
          value: almostExpiredCount,
          icon: 'bi-exclamation-triangle',
          color: 'bg-warning',
        },
        {
          title: 'Valeur Stock',
          value: totalValue.toFixed(2) + ' DH',
          icon: 'bi-cash-coin',
          color: 'bg-success',
        },
      ]
        .map(
          (stat) => `
          <div class="col-12 col-sm-6 col-lg-3">
            <div class="card stat-card p-3 h-100">
              <div class="d-flex align-items-center">
                <div class=" me-3 p-2 rounded ${stat.color} text-white"
                style="box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px, rgb(51, 51,
                51) 0px 0px 0px 3px;"><i class="bi ${stat.icon}"></i></div>
                <div style ="width : 50%">
                  <h6 class="text-muted mb-1 fs-5 text-primary-emphasis">${stat.title}</h6>
                  <h4 class="mb-0">${stat.value}</h4>
                </div>
              </div>
            </div>
          </div>
        `
        )
        .join('');
    }

    expiredProducts = expiredRows;
    lowStockProducts = lowStockRows;

    renderTable(expiredProducts, expiredBody, expiredPagination, 1);
    renderTable(lowStockProducts, lowStockBody, lowStockPagination, 1);

    renderCharts(products, expiredCount, almostExpiredCount);
  }

  function renderTable(items, tbody, pagination, currentPage = 1) {
    if (!tbody || !pagination) return;
    const totalPages = Math.ceil(items.length / rowsPerPage);
    tbody.innerHTML = '';
    pagination.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    // عرض الصفوف
    items.slice(start, end).forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td>${start + i + 1}</td>
      <td>${p.name || '—'}</td>
      <td>${p.barcode || '—'}</td>
      <td>${p.quantity || 0}</td>
      <td>${p.price || 0}</td>
      ${p.expiry ? `<td>${new Date(p.expiry).toLocaleDateString()}</td>` : ''}
    `;
      tbody.appendChild(tr);
    });

    // زر 'السابق'
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
    prevLi.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) renderTable(items, tbody, pagination, currentPage - 1);
    });
    pagination.appendChild(prevLi);

    // حساب نطاق الصفحات المراد عرضها
    let pageStart = Math.max(1, currentPage - 1);
    let pageEnd = Math.min(totalPages, currentPage + 1);

    if (currentPage === 1) {
      pageEnd = Math.min(totalPages, pageEnd + 1);
    } else if (currentPage === totalPages) {
      pageStart = Math.max(1, pageStart - 1);
    }

    // أزرار الصفحات (بحد أقصى 3)
    for (let i = pageStart; i <= pageEnd; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => {
        e.preventDefault();
        renderTable(items, tbody, pagination, i);
      });
      pagination.appendChild(li);
    }

    // زر 'التالي'
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
    nextLi.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage < totalPages) renderTable(items, tbody, pagination, currentPage + 1);
    });
    pagination.appendChild(nextLi);
  }

  // ===== Charts =====
  function renderCharts(products, expired, almostExpired) {
    if (typeof Chart === 'undefined') return;
    const valid = Math.max(0, products.length - (expired || 0) - (almostExpired || 0));

    if (expiryCanvas) {
      const data = [valid, almostExpired || 0, expired || 0];
      if (expiryChartInstance) {
        expiryChartInstance.data.datasets[0].data = data;
        expiryChartInstance.update();
      } else {
        expiryChartInstance = new Chart(expiryCanvas, {
          type: 'pie',
          data: {
            labels: ['Valides', 'Presque Expirés', 'Expirés'],
            datasets: [{ data, backgroundColor: ['#198754', '#ffc107', '#dc3545'] }],
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
        });
      }
    }

    if (topCanvas) {
      const topProducts = [...products]
        .sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))
        .slice(0, 10);
      const labels = topProducts.map((p) => p.name?.substring(0, 12) || '—');
      const dataVals = topProducts.map((p) => Number(p.quantity) || 0);

      if (topChartInstance) {
        topChartInstance.data.labels = labels;
        topChartInstance.data.datasets[0].data = dataVals;
        topChartInstance.update();
      } else {
        topChartInstance = new Chart(topCanvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [{ label: 'Quantité', data: dataVals, backgroundColor: '#0d6efd' }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          },
        });
      }
    }
  }

  // ===== Load stats =====
  loadStats();
});
