// Sidebar
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebarToggle");
const content = document.getElementById("content");

// عند الضغط على زر التبديل
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        content.classList.toggle("withSidebar");
    });
}

// دالة التحكم في الواجهة حسب الشاشة
function handleResize() {
    if (window.innerWidth >= 768) {
        sidebar.classList.add("active");
        content.classList.add("withSidebar");
        if (toggleBtn) toggleBtn.style.display = "none";
    } else {
        sidebar.classList.remove("active");
        content.classList.remove("withSidebar");
        if (toggleBtn) toggleBtn.style.display = "inline-block";
    }
}

window.addEventListener("load", handleResize);
window.addEventListener("resize", handleResize);

const icon = document.querySelector("#btnscan");
const readerDiv = document.getElementById("reader");
const input = document.querySelector("#searchTerm");
const btnFermer = document.querySelector(".fermer");
let html5QrCode = null;
let isScanning = false;

function showReader() {
    const readerDiv = document.getElementById("reader");
    const btnFermer = document.querySelector(".fermer");
    const input = document.querySelector("#searchTerm");
    const beepSound = new Audio("/sounds/beep.mp3");
    readerDiv.style.display = "block";
    btnFermer.style.display = "block";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader", {
            verbose: false
        });
    }

    if (isScanning) return;
    isScanning = true;

    Html5Qrcode.getCameras()
        .then(devices => {
            if (!devices || devices.length === 0) {
                alert("🚫 لا توجد كاميرات متاحة. تأكد من منح الإذن!");
                isScanning = false;
                hideReader();
                return;
            }

            const backCamera =
                devices.find(device =>
                    device.label.toLowerCase().includes("back")
                ) || devices[0];

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.7778, // 16:9 مثالي للآيفون
                facingMode: { exact: "environment" }
            };

            html5QrCode
                .start(
                    { deviceId: { exact: backCamera.id } },
                    config,
                    (decodedText, decodedResult) => {
                        beepSound.play();

                        html5QrCode.stop().then(() => {
                            html5QrCode.clear();
                            input.value = decodedText;
                            isScanning = false;
                            hideReader();

                            const searchButton =
                                document.querySelector(".Subscribe-btn");
                            if (searchButton) searchButton.click();
                        });
                    },
                    errorMessage => {
                        // يمكن تجاهل أخطاء القراءة المؤقتة
                    }
                )
                .catch(err => {
                    console.error("📷 فشل بدء الكاميرا:", err);
                    alert(
                        "📵 تعذر فتح الكاميرا. تأكد من منح الصلاحيات أو استخدام متصفح يدعم الكاميرا."
                    );
                    isScanning = false;
                    hideReader();
                });
        })
        .catch(err => {
            console.error("⚠️ خطأ في الحصول على الكاميرات:", err);
            alert(
                "⚠️ تعذر الوصول إلى الكاميرات. قد تحتاج إلى تغيير المتصفح أو السماح بالوصول."
            );
            isScanning = false;
            hideReader();
        });
}

function stopReader() {
    const instance = window._qrCodeInstance;
    if (instance && instance._isScanning) {
        instance.stop().then(() => {
            instance.clear();
            delete window._qrCodeInstance;
            hideReader();
        });
    } else {
        hideReader();
    }
}

function hideReader() {
    readerDiv.style.display = "none";
    btnFermer.style.display = "none";
}

window.onload = function () {
    icon.addEventListener("click", showReader);
};

btnFermer.addEventListener("click", stopReader);

// A single function to load, filter, and display tickets
async function loadTickets(searchTerm = "", startDate = "", endDate = "") {
    try {
        let url = `/api/ventes?`;
        if (searchTerm) {
            url += `search=${encodeURIComponent(searchTerm)}&`;
        }
        if (startDate) {
            url += `startDate=${encodeURIComponent(startDate)}&`;
        }
        if (endDate) {
            url += `endDate=${encodeURIComponent(endDate)}&`;
        }

        // Remove the trailing '&' if it exists
        if (url.endsWith("&")) {
            url = url.slice(0, -1);
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!data.ok) {
            console.error("Erreur:", data.message);
            return;
        }

        let ventes = data.ventes;
        const container = document.querySelector(".container-ticket");
        container.innerHTML = ""; // Clear old tickets

        let totalSalesSum = 0;

        ventes.forEach(sale => {
            totalSalesSum += sale.totalTTC;

            const ticket = document.createElement("div");
            ticket.className = "ticket mb-4 p-3 border"; // Full HTML for each ticket
            ticket.innerHTML = `
        <div class="mb-3 text-center">
          <button class="btn btn-dark btn-print"><i class="bi bi-printer-fill"></i>️ Print</button>
          <button class="btn btn-danger btn-pdf"><i class="bi bi-file-earmark-pdf"></i> PDF</button>
          <button class="btn btn-warning btn-delete"><i class="bi bi-trash"></i> Delete</button>
          <button class="btn btn-info btn-facture"><i class="bi bi-file-earmark-break-fill"></i> Facture</button>
        </div>
        <div class="head-ticket">
          <img src="https://i.postimg.cc/k41NXPLX/Photoroom-20250915-231503.png" alt="logo"/>
          <p class="x-bold">Para Petit Prix</p>
          <p class="bold">ParaPharmacie Petit Prix Marrakech</p>
          <p class="bold ">Tél: 06 79 54 79 79</p>
          <p class="bold" >IF: 25067018 RC 126564</p>
          <p class="bold p1 " >PAT : 67000100 ICE : 001624723000050</p>
          <p class="ope " >Date D'Opérateur : ${new Date(
              sale.createdAt
          ).toLocaleString()}</p>
          <br/>
          <p class="montant ">Montant TTC DHS</p>
        </div>
        <div class="hr-lg"></div>
        <div class="body-ticket">
          <div class="produits">
            ${sale.items
                .map(
                    item => `
                  <div class="col2 col3 p1">
                    <p>${item.name}</p>
                    <p class="fs3 editable" data-field="price">${
                        item.price
                    } DH</p>
                  </div>
                  <div class="prix">
                    <p></p>
                    <p class="editable" data-field="quantity">${
                        item.quantity
                    } x ${item.price.toFixed(2)} DHS</p>
                    <p class="editable" data-field="total">${(
                        item.quantity * item.price
                    ).toFixed(2)}</p>
                  </div>
                  <div class="hr-lg"></div>
                `
                )
                .join("")}
            <div class="col2A">
              <p>Total</p>
              <p>DHS</p>
              <p class="editable" data-field="totalTTC">${sale.totalTTC.toFixed(
                  2
              )}</p>
            </div>
            <div class="cols">
              <p data-field="tax">DONT DROITS DE TIMBRE : 0,00</p>
            </div>
          </div>
          <div class="hr-lg"></div>
          <div class="carte">
            <div class="tva col2 col3">
              <p>Taux TVA</p><p>HT</p><p>TVA</p><p>TTC</p>
            </div>
            <div class="tva col2 col3">
              <p class="editable" data-field="tvaRate">20,00%</p>
              <p class="editable" data-field="totalHT">${sale.totalHT.toFixed(
                  2
              )}</p>
              <p class="editable" data-field="tvaAmount">${(
                  sale.totalTTC - sale.totalHT
              ).toFixed(2)}</p>
              <p class="editable" data-field="totalTTC">${sale.totalTTC.toFixed(
                  2
              )}</p>
            </div>
            <p class="t col2 col3 editable" data-field="nbArticles">Nb Article(s) : ${
                sale.items.length
            }</p>
            <p class="col2 col3 ticketNum">N° de ticket:</p>
            <svg class="barcode"></svg>
            <br/>
          </div>
          <div class="p1 prix editable" data-field="dateOp">
            <p data-field="dateOp">${new Date(
                sale.createdAt
            ).toLocaleString()}</p>
          </div>
        </div>
        <div class="footer-ticket">
          <p class="title-footer">Nous vous remercions<br/>de votre visite</p>
        </div> 
      `;

            container.appendChild(ticket);
            const barcodeValue = sale.ticketBarcode;
            JsBarcode(ticket.querySelector(".barcode"), barcodeValue, {
                format: "ean13",
                width: 2,
                height: 50,
                displayValue: true
            });
            ticket.querySelector(".ticketNum").innerText =
                "N° de ticket: " + barcodeValue;

            // Ticket buttons
            function createPrintableTicket(ticket) {
                const tempDiv = document.createElement("div");
                tempDiv.className = "printable-ticket";
                tempDiv.innerHTML = ticket.outerHTML;
                tempDiv
                    .querySelectorAll(
                        ".btn-print, .btn-pdf, .btn-edit, .btn-save, .btn-facture ,.btn-delete"
                    )
                    .forEach(btn => btn.remove());
                const style = `
          <style>
            body { margin:0; padding:0; }
            .head-ticket{ text-align: center; }
            .printable-ticket { width: 100%; max-width: 450px; margin: 0 auto; padding: 15px; background: #fff; box-sizing: border-box; font-family: Arial, sans-serif; }
            .printable-ticket .head-ticket, .printable-ticket .body-ticket, .printable-ticket .footer-ticket { width: 100%; }
            .prix { display: flex; justify-content: space-between; padding-bottom: 10px; }
            .col2A { font-size: 21px; font-weight: 900; padding: 3px 0; }
            .cols { margin-top: 7px; margin-bottom: 0; position: relative; right: 2%; }
            .col3 { font-size: 14px; }
            .p1 { position: relative; right: 5%; padding: 0 10px; width: 110%; }
            .head-ticket img { max-width: 80px; max-height: 80px; display:block; margin:0 auto 10px;}
            .barcode { width: 100%; scale: 0.9 ; display : flex;align-items: center; justify-content: center; }
            .footer-ticket{font-size: 18px; font-weight: 700; text-shadow: 0px 1px 0px rgba(0, 0, 0, 0.5); text-align: center; line-height: 30px; letter-spacing: -1px;}
          </style>
        `;
                return { html: tempDiv.outerHTML, style };
            }

            // PDF button
            ticket.querySelector(".btn-pdf").onclick = () => {
                const { html, style } = createPrintableTicket(ticket);
                const tempWrapper = document.createElement("div");
                tempWrapper.innerHTML = style + html;
                document.body.appendChild(tempWrapper);
                setTimeout(() => {
                    html2pdf()
                        .from(tempWrapper)
                        .set({
                            margin: [10, 10, 10, 10],
                            filename: `ticket_${barcodeValue}.pdf`,
                            html2canvas: { scale: 3, useCORS: true },
                            jsPDF: {
                                unit: "mm",
                                format: [150, 500],
                                orientation: "portrait"
                            }
                        })
                        .save()
                        .then(() => tempWrapper.remove());
                }, 500);
            };

            function printTicket(ticket) {
                // افترض أن createPrintableTicket تُرجع html وcss
                const { html, style } = createPrintableTicket(ticket);

                // افتح نافذة جديدة
                const w = window.open("", "_blank");

                if (!w) {
                    alert(
                        "النافذة الجديدة تم حظرها من قبل المتصفح. حاول السماح بالنوافذ المنبثقة."
                    );
                    return;
                }

                // ضع الـ HTML و CSS داخل نافذة جديدة
                w.document.open();
                w.document.write(`
    <html>
      <head>
        <title>Ticket</title>
        ${style} <!-- CSS داخل <style> -->
        <style>
          /* تأكد من أن الفاتورة بالحجم المناسب */
          body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
          .ticket { width: 300px; max-width: 100%; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
                w.document.close();

                // ننتظر تحميل الصور والـ CSS قبل الطباعة
                w.onload = () => {
                    w.focus();

                    // تأخير بسيط 0.5 ثانية لضمان التحميل الكامل
                    setTimeout(() => {
                        w.print();
                        w.close();
                    }, 500);
                };
            }

            ticket.querySelector(".btn-facture").onclick = () => {
                // حفظ بيانات البيع مؤقتاً في localStorage
                localStorage.setItem("factureData", JSON.stringify(sale));

                // الانتقال لصفحة facture
                window.location.href = "/facture";
            };

            // Print button
            ticket.querySelector(".btn-print").onclick = () => {
                printTicket(ticket);
            };

            // Delete button
            ticket.querySelector(".btn-delete").onclick = async () => {
                if (!confirm("Voulez-vous vraiment supprimer cette vente ?"))
                    return;
                try {
                    const res = await fetch(`/api/vente/${sale._id}`, {
                        method: "DELETE"
                    });
                    const result = await res.json();
                    if (result.ok) {
                        ticket.remove();
                        alert("✅ Vente supprimée avec succès !");
                    } else {
                        alert(
                            "❌ Erreur lors de la suppression: " +
                                result.message
                        );
                    }
                } catch (err) {
                    console.error("Erreur delete:", err);
                    alert("❌ Erreur lors من the suppression");
                }
            };
        });

        // عرض المجموع الإجمالي
        const totalVentesElement = document.getElementById("totalVentes");
        if (totalVentesElement) {
            totalVentesElement.innerText = totalSalesSum.toFixed(2);
        }
    } catch (err) {
        console.error("Erreur front:", err);
    }
}

// Add event listener to the search input field for live filtering
document.addEventListener("DOMContentLoaded", () => {
    // Initial load of all tickets when the page is ready
    loadTickets();

    // Find the search input fields
    const searchTermInput = document.getElementById("searchTerm");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    const searchButton = document.getElementById("searchButton");

    const performSearch = () => {
        const searchTerm = searchTermInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        loadTickets(searchTerm, startDate, endDate);
    };

    if (searchButton) {
        searchButton.addEventListener("click", performSearch);
    }

    // Live search for the text field
    if (searchTermInput) {
        searchTermInput.addEventListener("input", performSearch);
    }

    // Optional: Trigger search on date input change
    if (startDateInput) {
        startDateInput.addEventListener("change", performSearch);
    }
    if (endDateInput) {
        endDateInput.addEventListener("change", performSearch);
    }
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker مسجل بنجاح"))
        .catch(err => console.error("فشل تسجيل SW:", err));
}
