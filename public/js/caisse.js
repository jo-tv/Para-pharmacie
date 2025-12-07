const icon = document.querySelector("#scan");
const readerDiv = document.getElementById("reader");
const input = document.querySelector("#searchQuery");
const btnFermer = document.querySelector(".fermer");
let html5QrCode = null;
let isScanning = false;

function showReader() {
    const readerDiv = document.getElementById("reader");
    const btnFermer = document.querySelector(".fermer");
    const input = document.querySelector("#searchQuery");
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

// 🟢 عناصر DOM
const searchInput = document.getElementById("searchQuery");
const factureBody = document.getElementById("facture-body");
const totalHTEl = document.getElementById("total-ht");
const totalTTCEl = document.getElementById("total-ttc");
const tvaEl = document.getElementById("tva"); // تم تعريفه الآن

let factureItems = [];

// 🟢 البحث عن منتج
searchInput.addEventListener("change", async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        const res = await fetch(`/api/products/search?q=${query}`);
        const product = await res.json();

        if (product && product._id) {
            addToFacture(product);
            searchInput.value = "";
        } else {
            alert("Produit introuvable ❌");
        }
    } catch (err) {
        console.error("Erreur recherche produit:", err);
    }
});

// 🟢 إضافة منتج
function addToFacture(product) {
    const existing = factureItems.find(item => item._id === product._id);
    if (existing) {
        existing.qty += 1;
    } else {
        factureItems.push({
            _id: product._id,
            name: product.name,
            price: product.price,
            barcode: product.barcode,
            qty: 1
        });
    }
    renderFacture();
}

// 🟢 عرض الفاتورة
function renderFacture() {
    factureBody.innerHTML = "";

    factureItems.forEach(item => {
        const row = document.createElement("tr");
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
    });

    // تحديث الكمية عند تغيير input
    document.querySelectorAll(".qty-input").forEach(input => {
        input.addEventListener("change", e => {
            const id = e.target.dataset.id;
            const item = factureItems.find(i => i._id === id);
            if (item) {
                item.qty = parseInt(e.target.value) || 1;
                renderFacture();
            }
        });
    });

    // حذف منتج
    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = e.target.dataset.id;
            const item = factureItems.find(i => i._id === id);
            if (
                item &&
                confirm(`Voulez-vous vraiment supprimer "${item.name}" ?`)
            ) {
                factureItems = factureItems.filter(i => i._id !== id);
                renderFacture();
            }
        });
    });

    // بعد كل تحديث → نحفظ الفاتورة محليًا
    saveFactureToStorage();

    // تحديث المجاميع
    updateFactureTotals();
}

// 🟢 حساب المجاميع
function updateFactureTotals() {
    // TTC = المجموع كما هو
    const totalTTC = factureItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    // استخراج HT من TTC (20% TVA)
    const totalHT = totalTTC / 1.2;
    const tva = totalTTC - totalHT;

    totalHTEl.textContent = totalHT.toFixed(2) + " DH";
    tvaEl.textContent = tva.toFixed(2) + " DH";
    totalTTCEl.textContent = totalTTC.toFixed(2) + " DH";
}

// 🟢 حفظ الفاتورة في localStorage
function saveFactureToStorage() {
    localStorage.setItem("factureItems", JSON.stringify(factureItems));
}

// 🟢 تحميل الفاتورة عند فتح الصفحة
function loadFactureFromStorage() {
    const saved = localStorage.getItem("factureItems");
    if (saved) {
        factureItems = JSON.parse(saved);
        renderFacture();
    }
}

// 🟢 تأكيد البيع
document.getElementById("confirm-sale").addEventListener("click", async () => {
    if (factureItems.length === 0) {
        alert("⚠️ Aucune produit dans la facture !");
        return;
    }

    if (!confirm("Voulez-vous confirmer cette vente ?")) return;

    const totalTTC = factureItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalHT = totalTTC / 1.2;
    const tva = totalTTC - totalHT;

    const saleData = {
        items: factureItems.map(i => ({
            _id: i._id,
            name: i.name,
            price: i.price,
            qty: i.qty,
            barcode: i.barcode
        })),
        totalHT,
        totalTTC,
        tva,
        date: new Date().toISOString()
    };

    try {
        const res = await fetch("/api/vente", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saleData)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(
                errorData?.message || "Erreur lors de l’envoi au serveur"
            );
        }

        const result = await res.json();
        console.log("✅ Vente sauvegardée en base:", result);

        // مسح التخزين المحلي بعد البيع
        factureItems = [];
        saveFactureToStorage();
        renderFacture();

        alert("✅ Vente confirmée et sauvegardée avec succès !");
    } catch (err) {
        console.error("❌ Erreur enregistrement vente:", err);
        alert(`Erreur lors de la sauvegarde en base ❌\n${err.message}`);
    }
});

// تحميل الفاتورة عند فتح الصفحة
document.addEventListener("DOMContentLoaded", () => {
    loadFactureFromStorage();
});

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

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker مسجل بنجاح"))
        .catch(err => console.error("فشل تسجيل SW:", err));
}
