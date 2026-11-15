const STORAGE_KEY = "jayzs-inventory-v1";
const $ = (id) => document.getElementById(id);
const dialog = $("productDialog");
let products = loadProducts();

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  render();
}
function money(value) {
  return new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP" }).format(value);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}
function render() {
  const totalUnits = products.reduce((sum,p) => sum + p.quantity, 0);
  const low = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const value = products.reduce((sum,p) => sum + p.price*p.quantity, 0);
  $("totalProducts").textContent = products.length;
  $("totalUnits").textContent = totalUnits;
  $("lowStock").textContent = low;
  $("inventoryValue").textContent = money(value);

  const categories = [...new Set(products.map(p => p.category))].sort();
  const selected = $("categoryFilter").value;
  $("categoryFilter").innerHTML = '<option value="">All categories</option>' +
    categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  $("categoryFilter").value = categories.includes(selected) ? selected : "";

  const search = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const stock = $("stockFilter").value;
  const shown = products.filter(p => {
    const matchesText = (p.name+" "+p.category).toLowerCase().includes(search);
    const matchesCategory = !category || p.category === category;
    const matchesStock = !stock || (stock === "low" ? p.quantity > 0 && p.quantity <= 5 : stock === "out" ? p.quantity === 0 : p.quantity > 0);
    return matchesText && matchesCategory && matchesStock;
  });
  $("productRows").innerHTML = shown.map(p => {
    const status = p.quantity === 0 ? ["Out of stock","out"] : p.quantity <= 5 ? ["Low stock","low"] : ["In stock",""];
    return `<tr>
      <td><strong>${escapeHTML(p.name)}</strong></td>
      <td>${escapeHTML(p.category)}</td>
      <td>${money(p.price)}</td><td>${p.quantity}</td>
      <td><span class="status ${status[1]}">${status[0]}</span></td>
      <td><div class="actions">
        <button class="secondary" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="secondary" data-action="adjust" data-id="${p.id}">Stock</button>
        <button class="secondary" data-action="delete" data-id="${p.id}">Delete</button>
      </div></td>
    </tr>`;
  }).join("");
  $("emptyMessage").style.display = shown.length ? "none" : "block";
}
function openForm(product) {
  $("productForm").reset();
  $("dialogTitle").textContent = product ? "Edit Product" : "Add Product";
  $("productId").value = product?.id || "";
  $("productName").value = product?.name || "";
  $("productCategory").value = product?.category || "";
  $("productPrice").value = product?.price ?? "";
  $("productQuantity").value = product?.quantity ?? "";
  dialog.showModal();
}
$("addButton").addEventListener("click", () => openForm(null));
$("closeDialog").addEventListener("click", () => dialog.close());
$("cancelButton").addEventListener("click", () => dialog.close());
$("productForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("productId").value;
  const product = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name: $("productName").value.trim(),
    category: $("productCategory").value.trim(),
    price: Number($("productPrice").value),
    quantity: Number($("productQuantity").value)
  };
  if (!product.name || !product.category || !Number.isFinite(product.price) || product.price < 0 ||
      !Number.isInteger(product.quantity) || product.quantity < 0) return alert("Please enter valid product details.");
  if (id) products = products.map(p => p.id === id ? product : p);
  else products.push(product);
  saveProducts();
  dialog.close();
});
$("productRows").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const product = products.find(p => p.id === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === "edit") openForm(product);
  if (button.dataset.action === "adjust") {
    const amount = prompt(`Enter the new quantity for ${product.name}:`, product.quantity);
    if (amount === null) return;
    const quantity = Number(amount);
    if (!Number.isInteger(quantity) || quantity < 0) return alert("Quantity must be a whole number of 0 or more.");
    product.quantity = quantity; saveProducts();
  }
  if (button.dataset.action === "delete" && confirm(`Delete ${product.name}?`)) {
    products = products.filter(p => p.id !== product.id); saveProducts();
  }
});
$("searchInput").addEventListener("input", render);
$("categoryFilter").addEventListener("change", render);
$("stockFilter").addEventListener("change", render);
$("exportButton").addEventListener("click", () => {
  const header = ["Product","Category","Price","Quantity","Inventory Value"];
  const rows = products.map(p => [p.name,p.category,p.price,p.quantity,p.price*p.quantity]);
  const csv = [header,...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "jayzs-inventory.csv"; a.click();
  URL.revokeObjectURL(url);
});
render();
