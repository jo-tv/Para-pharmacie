// تسجيل SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', reg);
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  });
}

// التعامل مع حدث التثبيت (Chrome/Android)
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // نمنع المتصفح من إظهار الواجهة فوراً
  deferredPrompt = e;
  // هنا تعرض زر "تثبيت" مخصص في الـUI
  document.getElementById('installBtn').style.display = 'block';
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === 'accepted') {
    console.log('User accepted install');
  } else {
    console.log('User dismissed install');
  }
  deferredPrompt = null;
});