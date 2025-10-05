

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

  
      const form = document.getElementById('formContainer');
      function toggleForm() {
        form.classList.toggle('active');
      }

      document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('formContainer');
        const API_URL = '/api/customers';
        const addBtn = document.querySelector('.add-btn');
        const searchInput = document.getElementById('searchInput');
        const container = document.getElementById('customerCards');

        let currentEditId = null;

        // ======================
        // Helpers
        // ======================
        async function getCustomers() {
          try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`GET customers failed: ${res.status}`);
            return await res.json();
          } catch (err) {
            console.error('getCustomers error', err);
            return [];
          }
        }

        // ======================
        // Submit (Add or Update)
        // ======================
        async function submitForm(e) {
          if (e && e.preventDefault) e.preventDefault();

          const name = document.getElementById('name').value.trim();
          const company = document.getElementById('company').value.trim();
          const ice = document.getElementById('ice').value.trim();
          const address = document.getElementById('address').value.trim();
          const phone = document.getElementById('phone').value.trim();

          if (!name) {
            alert('Le nom est obligatoire !');
            return;
          }

          const data = { name, company, ice, address, phone };

          try {
            if (currentEditId) {
              // Update
              const res = await fetch(`${API_URL}/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
              currentEditId = null;
            } else {
              // Create
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error(`POST failed: ${res.status}`);
            }
          } catch (err) {
            console.error('submitForm error', err);
            alert('Une erreur est survenue. Vérifiez la console / réseau.');
            return;
          }

          // Reset form + button
          document.querySelectorAll('#formContainer input').forEach((input) => (input.value = ''));
          addBtn.innerHTML = '<i class="fa fa-plus"></i> Ajouter';
          addBtn.onclick = submitForm;
          form.classList.remove('active');

          await renderCustomers();
        }

        // ======================
        // Edit -> fill form and set edit mode
        // ======================
        async function editCustomer(id) {
          try {
            const res = await fetch(`${API_URL}/${id}`);
            if (!res.ok) throw new Error(`GET customer failed: ${res.status}`);
            const c = await res.json();

            // fill form
            document.getElementById('name').value = c.name || '';
            document.getElementById('company').value = c.company || '';
            document.getElementById('ice').value = c.ice || '';
            document.getElementById('address').value = c.address || '';
            document.getElementById('phone').value = c.phone || '';

            // show form and set edit mode
            form.classList.add('active');
            currentEditId = id;
            addBtn.innerHTML = '<i class="fa fa-save"></i> Sauvegarder';
            addBtn.onclick = submitForm;
          } catch (err) {
            console.error('editCustomer error', err);
            alert('Impossible de charger les données du client.');
          }
        }

        // ======================
        // Delete
        // ======================
        async function deleteCustomer(id) {
          if (!confirm('Voulez-vous vraiment supprimer ce client ?')) return;
          try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
            await renderCustomers();
          } catch (err) {
            console.error('deleteCustomer error', err);
            alert('Erreur lors de la suppression.');
          }
        }

        // ======================
        // Render list with attached event listeners (no inline onclick)
        // ======================
        async function renderCustomers() {
          const customers = await getCustomers();
          const searchValue = (searchInput?.value || '').trim().toLowerCase();
          container.innerHTML = '';

          customers
            .filter((c) => {
              if (!c.name) return false;
              const s = `${c.name} ${c.company || ''} ${c.ice || ''} ${c.address || ''} ${
                c.phone || ''
              }`.toLowerCase();
              return s.includes(searchValue);
            })
            .forEach((c) => {
              const card = document.createElement('div');
              card.className = 'card';
              card.innerHTML = `
          <h3><i class="fa fa-user"></i> ${escapeHtml(c.name)}</h3>
          <p><i class="fa fa-id-badge"></i> <strong>Nom STE:</strong> ${escapeHtml(
            c.company || '-'
          )}</p>
          <p><i class="fa fa-id-card"></i> <strong>ICE:</strong> ${escapeHtml(c.ice || '-')}</p>
          <p><i class="fa fa-map-marker-alt"></i> <strong>Adresse:</strong> ${escapeHtml(
            c.address || '-'
          )}</p>
          <p><i class="fa fa-phone"></i> <strong>Téléphone:</strong> ${escapeHtml(
            c.phone || '-'
          )}</p>
        `;

              // actions
              const actions = document.createElement('div');
              actions.className = 'actions';

              const editBtn = document.createElement('button');
              editBtn.className = 'edit-btn';
              editBtn.innerHTML = '<i class="fa fa-pen"></i> Modifier';
              editBtn.addEventListener('click', () => editCustomer(c._id));

              const delBtn = document.createElement('button');
              delBtn.className = 'delete-btn';
              delBtn.innerHTML = '<i class="fa fa-trash"></i> Supprimer';
              delBtn.addEventListener('click', () => deleteCustomer(c._id));

              actions.appendChild(editBtn);
              actions.appendChild(delBtn);
              card.appendChild(actions);

              container.appendChild(card);
            });
        }

        // small helper to avoid HTML injection
        function escapeHtml(str) {
          return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        // ======================
        // Init
        // ======================
        addBtn.onclick = submitForm;
        if (searchInput) searchInput.addEventListener('input', renderCustomers);
        renderCustomers();
      });
    


if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('Service Worker مسجل بنجاح'))
    .catch((err) => console.error('فشل تسجيل SW:', err));
}
