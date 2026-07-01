// Admin Dashboard — uses API endpoints
Auth.requireRole('admin');

let editingId = null;
let pendingDeleteId = null;
let currentImageFile = null;
let currentImageUrl = null;

// ── Init ──────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
document.getElementById('newProductBtn').addEventListener('click', () => openModal());
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.getElementById('productForm').addEventListener('submit', saveProduct);
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const removeImageBtn = document.getElementById('removeImageBtn');

uploadArea.addEventListener('click', () => imageInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});
imageInput.addEventListener('change', () => {
  if (imageInput.files[0]) handleImageFile(imageInput.files[0]);
});
removeImageBtn.addEventListener('click', clearImage);

// Settings form
document.getElementById('settingsForm') && document.getElementById('settingsForm')
  .addEventListener('submit', saveSettings);

loadTable();

// ── Table ──────────────────────────────────────────────────
async function loadTable() {
  let products;
  try {
    const res = await fetch('/products');
    products = await res.json();
  } catch {
    document.getElementById('adminEmpty').textContent = 'Server nicht erreichbar.';
    document.getElementById('adminEmpty').classList.remove('hidden');
    return;
  }
  renderTable(products);
}

function renderTable(products) {
  const tbody = document.getElementById('adminTableBody');
  const empty = document.getElementById('adminEmpty');

  updateStats(products);

  if (products.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = products.map(p => `
    <tr class="${p.visible ? '' : 'row-hidden'}" data-id="${p.id}">
      <td class="td-img">
        ${p.image
          ? `<img src="${p.image}" alt="${esc(p.name)}" class="table-img" />`
          : `<div class="table-img-placeholder">–</div>`}
      </td>
      <td>
        <strong>${esc(p.name)}</strong>
        ${p.category ? `<span class="cat-tag">${esc(p.category)}</span>` : ''}
        ${p.description ? `<p class="row-desc">${esc(p.description)}</p>` : ''}
      </td>
      <td class="td-price">${formatPrice(p.price)}</td>
      <td>
        <button class="visibility-btn ${p.visible ? 'vis-on' : 'vis-off'}" data-id="${p.id}">
          ${p.visible ? 'Sichtbar' : 'Versteckt'}
        </button>
      </td>
      <td class="td-actions">
        <button class="btn-edit" data-id="${p.id}">Bearbeiten</button>
        <button class="btn-delete" data-id="${p.id}" data-name="${esc(p.name)}">Löschen</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.id, products))
  );
  tbody.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id, btn.dataset.name))
  );
  tbody.querySelectorAll('.visibility-btn').forEach(btn =>
    btn.addEventListener('click', () => toggleVisibility(btn.dataset.id))
  );
}

function updateStats(products) {
  document.getElementById('statTotal').textContent = products.length;
  document.getElementById('statVisible').textContent = products.filter(p => p.visible).length;
  document.getElementById('statHidden').textContent = products.filter(p => !p.visible).length;
}

// ── Toggle Visibility ─────────────────────────────────────
async function toggleVisibility(id) {
  await fetch(`/admin/toggle/${id}`, { method: 'PATCH' });
  loadTable();
}

// ── Product Modal ─────────────────────────────────────────
function openModal(id = null, products = []) {
  editingId = id;
  currentImageFile = null;
  currentImageUrl = null;
  document.getElementById('productForm').reset();
  clearImage();
  document.getElementById('formError').classList.add('hidden');

  if (id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    document.getElementById('modalTitle').textContent = 'Produkt bearbeiten';
    document.getElementById('p_name').value = p.name;
    document.getElementById('p_price').value = p.price;
    document.getElementById('p_desc').value = p.description || '';
    document.getElementById('p_category').value = p.category || '';
    document.getElementById('p_visible').checked = p.visible;
    if (p.image) {
      currentImageUrl = p.image;
      showImagePreview(p.image);
    }
  } else {
    document.getElementById('modalTitle').textContent = 'Neues Produkt';
    document.getElementById('p_visible').checked = true;
  }

  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.getElementById('p_name').focus();
}

function closeModal() {
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('deleteModal').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.add('hidden');
  editingId = null;
}

async function saveProduct(e) {
  e.preventDefault();

  const name = document.getElementById('p_name').value.trim();
  const price = document.getElementById('p_price').value;
  if (!name || !price) {
    document.getElementById('formError').classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Speichert...';

  const formData = new FormData();
  formData.append('name', name);
  formData.append('price', price);
  formData.append('description', document.getElementById('p_desc').value.trim());
  formData.append('category', document.getElementById('p_category').value);
  formData.append('visible', document.getElementById('p_visible').checked ? 'true' : 'false');
  if (currentImageFile) formData.append('image', currentImageFile);

  try {
    let res;
    if (editingId) {
      res = await fetch(`/admin/product/${editingId}`, { method: 'PUT', body: formData });
    } else {
      res = await fetch('/admin/add-product', { method: 'POST', body: formData });
    }
    if (!res.ok) throw new Error();
    closeModal();
    loadTable();
  } catch {
    alert('Fehler beim Speichern. Bitte erneut versuchen.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Speichern';
  }
}

// ── Image Handling ────────────────────────────────────────
function handleImageFile(file) {
  if (!file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Bild zu groß. Maximal 5 MB.');
    return;
  }
  currentImageFile = file;
  const reader = new FileReader();
  reader.onload = e => showImagePreview(e.target.result);
  reader.readAsDataURL(file);
}

function showImagePreview(src) {
  document.getElementById('uploadPlaceholder').classList.add('hidden');
  const preview = document.getElementById('imagePreview');
  preview.src = src;
  preview.classList.remove('hidden');
  removeImageBtn.style.display = 'inline-flex';
}

function clearImage() {
  currentImageFile = null;
  currentImageUrl = null;
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('imagePreview').src = '';
  document.getElementById('uploadPlaceholder').classList.remove('hidden');
  imageInput.value = '';
  removeImageBtn.style.display = 'none';
}

// ── Delete Modal ──────────────────────────────────────────
function openDeleteModal(id, name) {
  pendingDeleteId = id;
  document.getElementById('deleteMsg').textContent = `"${name}" wird dauerhaft gelöscht.`;
  document.getElementById('deleteModal').classList.remove('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.add('hidden');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  await fetch(`/admin/product/${pendingDeleteId}`, { method: 'DELETE' });
  closeDeleteModal();
  loadTable();
}

// ── Settings ──────────────────────────────────────────────
async function saveSettings(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch('/admin/settings', { method: 'POST', body: formData });
  if (res.ok) alert('Einstellungen gespeichert.');
}

// ── Helpers ───────────────────────────────────────────────
function formatPrice(n) {
  return parseFloat(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
