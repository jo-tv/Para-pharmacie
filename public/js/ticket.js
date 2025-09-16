JsBarcode('.barcode').init();

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

async function loadTickets() {
  try {
    const res = await fetch('/api/ventes');
    const data = await res.json();

    if (!data.ok) {
      console.error('Erreur:', data.message);
      return;
    }

    const ventes = data.ventes;
    const container = document.querySelector('.container-ticket');
    container.innerHTML = ''; // نفرغ القديم

    ventes.forEach((sale) => {
      const ticket = document.createElement('div');
      ticket.className = 'ticket mb-4 p-3 border';

      // HTML كامل لكل تذكرة
      ticket.innerHTML = `
        <div class="mb-3 text-center">
          <button class="btn btn-dark btn-print">🖨️ Print</button>
          <button class="btn btn-danger btn-pdf">📄 PDF</button>
          <button class="btn btn-warning btn-delete">❌ Delete</button>
        </div>

        <div class="head-ticket">
          <img src="https://i.postimg.cc/k41NXPLX/Photoroom-20250915-231503.png" alt="logo"/>
          <p class="x-bold">Para Petit Prix</p>
          <p class="bold">ParaPharmacie Petit Prix Marrakech</p>
          <p class="bold ">Tél: 05 25 060 240/241</p>
          <p class="bold" >IF: 2202961 RC 129997</p>
          <p class="bold p1 " >TP : 47924641 ICE : 001525045000091</p>
          <p class="ope " >Date D'Opérateur : ${new Date(sale.createdAt).toLocaleString()}</p>
          <br/>
          <p class="montant ">Montant TTC DHS</p>
        </div>
        <div class="hr-lg"></div>
        <div class="body-ticket">
          <div class="produits">
            ${sale.items
              .map(
                (item) => `
              <div class="col2 col3 p1">
                <p>${item.name}</p>
                <p class="fs3 editable" data-field="price">${item.price} DH</p>
              </div>
              <div class="prix">
                <p></p>
                <p class="editable" data-field="quantity">${item.quantity} x ${item.price.toFixed(
                  2
                )} DHS</p>
                <p class="editable" data-field="total">${(item.quantity * item.price).toFixed(
                  2
                )}</p>
              </div>
              <div class="hr-lg"></div>
            `
              )
              .join('')}
            <div class="col2A">
              <p>Total</p>
              <p>DHS</p>
              <p class="editable" data-field="totalTTC">${sale.totalTTC.toFixed(2)}</p>
            </div>
            <div class="cols">
              <p data-field="tax">DONT DROITS DE TIMBRE : 0,04</p>
            </div>
          </div>
          <div class="hr-lg"></div>
          <div class="carte">
            <div class="tva col2 col3">
              <p>Taux TVA</p><p>HT</p><p>TVA</p><p>TTC</p>
            </div>
            <div class="tva col2 col3">
              <p class="editable" data-field="tvaRate">20,00%</p>
              <p class="editable" data-field="totalHT">${sale.totalHT.toFixed(2)}</p>
              <p class="editable" data-field="tvaAmount">${(sale.totalTTC - sale.totalHT).toFixed(
                2
              )}</p>
              <p class="editable" data-field="totalTTC">${sale.totalTTC.toFixed(2)}</p>
            </div>
            <p class="t col2 col3 editable" data-field="nbArticles">Nb Article(s) : ${
              sale.items.length
            }</p>
            <p class="col2 col3 ticketNum">N° de ticket:</p>
            <svg class="barcode"></svg>
            <br/>
          </div>
          <div class="p1 prix editable" data-field="dateOp">
            <p data-field="dateOp">${new Date(sale.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div class="footer-ticket">
          <p class="title-footer">Nous vous remercions<br/>de votre visite</p>
        </div>
      `;

      container.appendChild(ticket);

      // توليد باركود EAN-13
      function generateEAN13() {
        let code = '';
        for (let i = 0; i < 12; i++) code += Math.floor(Math.random() * 10);
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        const checkDigit = (10 - (sum % 10)) % 10;
        return code + checkDigit;
      }

      const barcodeValue = generateEAN13();
      JsBarcode(ticket.querySelector('.barcode'), barcodeValue, {
        format: 'ean13',
        width: 2,
        height: 50,
        displayValue: true,
      });
      ticket.querySelector('.ticketNum').innerText = 'N° de ticket: ' + barcodeValue;

      // أزرار التذكرة
      function createPrintableTicket(ticket) {
        const tempDiv = document.createElement('div');
        tempDiv.className = 'printable-ticket';
        tempDiv.innerHTML = ticket.outerHTML;

        // إزالة أزرار التحكم
        tempDiv
          .querySelectorAll('.btn-print, .btn-pdf, .btn-edit, .btn-save, .btn-delete')
          .forEach((btn) => btn.remove());

        const style = `
    <style>
      body { margin:0; padding:0; }
      .head-ticket{
        text-align: center;
      }
      .printable-ticket { 
        width: 100%; 
        max-width: 450px; 
        margin: 0 auto; 
        padding: 15px; 
        background: #fff; 
        box-sizing: border-box; 
        font-family: Arial, sans-serif;
      }
      .printable-ticket .head-ticket, 
      .printable-ticket .body-ticket, 
      .printable-ticket .footer-ticket {
        width: 100%;
      }
      .col2, .col2A, .prix {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        width: 100%;
        font-size: 12px;
        margin: 2px 0;
        overflow-wrap: break-word;
      }
      .col2A { font-size: 16px; font-weight: 900; border-top:1px dashed #333; border-bottom:1px dashed #333; padding:5px 0;}
      .head-ticket img { max-width: 80px; max-height: 80px; display:block; margin:0 auto 10px;}
      .barcode {  margin-left: 23px; }
    </style>
  `;

        return { html: tempDiv.outerHTML, style };
      }

      // زر PDF
      ticket.querySelector('.btn-pdf').onclick = () => {
        const { html, style } = createPrintableTicket(ticket);
        const tempWrapper = document.createElement('div');
        tempWrapper.innerHTML = style + html;
        document.body.appendChild(tempWrapper); // مؤقتًا

        setTimeout(() => {
          html2pdf()
            .from(tempWrapper)
            .set({
              margin: [10, 10, 10, 10],
              filename: `ticket_${barcodeValue}.pdf`,
              html2canvas: { scale: 3, useCORS: true },
              jsPDF: { unit: 'mm', format: [150, 500], orientation: 'portrait' },
            })
            .save()
            .then(() => tempWrapper.remove()); // إزالة العنصر بعد حفظ PDF
        }, 500);
      };
      
      function printTicket(ticket) {
  const { html, style } = createPrintableTicket(ticket);

  const w = window.open('', '_blank');
  w.document.write('<html><head><title>Ticket</title>' + style + '</head><body>');
  w.document.write(html);
  w.document.write('</body></html>');
  w.document.close();

  w.onload = () => {
    w.focus();
    w.print();
    w.close();
  };
}

// استخدامه مع زر الطباعة
ticket.querySelector('.btn-print').onclick = () => {
  printTicket(ticket);
};

      ticket.querySelector('.btn-delete').onclick = async () => {
        if (!confirm('Voulez-vous vraiment supprimer cette vente ?')) return;
        try {
          const res = await fetch(`/api/vente/${sale._id}`, { method: 'DELETE' });
          const result = await res.json();
          if (result.ok) {
            ticket.remove(); // إزالة التذكرة من الواجهة
            alert('✅ Vente supprimée avec succès !');
          } else {
            alert('❌ Erreur lors de la suppression: ' + result.message);
          }
        } catch (err) {
          console.error('Erreur delete:', err);
          alert('❌ Erreur lors de la suppression');
        }
      };
    });
  } catch (err) {
    console.error('Erreur front:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadTickets);
