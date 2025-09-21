document.addEventListener('DOMContentLoaded', () => {
  const data = localStorage.getItem('factureData');
  if (!data) {
    alert('⚠️ Aucune facture trouvée !');
    return;
  }

  const sale = JSON.parse(data);

  // 🧾 بناء الجدول
  const tbody = document.querySelector('table.table-striped tbody');
  tbody.innerHTML = '';
  sale.items.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td class="text-right">${item.price.toFixed(2)}</td>
              <td class="text-right">${(item.quantity * item.price).toFixed(2)}</td>
            `;
    tbody.appendChild(row);
  });

  // ✅ المجاميع
  const totalHT = sale.totalHT.toFixed(2);
  const totalTTC = sale.totalTTC.toFixed(2);
  const totalTVA = (sale.totalTTC - sale.totalHT).toFixed(2);

  document.querySelector('[th\\:text="${totalHT}"]').textContent = totalHT;
  document.querySelector('[th\\:text="${totalTVA}"]').textContent = totalTVA;
  document.querySelector('[th\\:text="${totalTTC}"]').textContent = totalTTC;

  document.querySelector('.barcode').textContent = ' N° ' + sale.ticketBarcode;

  // 🖨️ زر الطباعة
  document.getElementById('printBtn').addEventListener('click', () => {
    window.print();
  });

  // 📄 زر PDF
  document.getElementById('pdfBtn').addEventListener('click', () => {
    const element = document.querySelector('.invoice');
    html2pdf()
      .from(element)
      .set({
        margin: 0,
        filename: `facture_${sale.ticketBarcode}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .save();
  });
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
  if (window.innerWidth >= 968) {
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


if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker مسجل بنجاح"))
      .catch((err) => console.error("فشل تسجيل SW:", err));
  };