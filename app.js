const SALES_STORAGE_KEY = "sellphone.sales.v1";
const FINANCE_STORAGE_KEY = "ruanguang.transactions.v1";
const INVENTORY_STORAGE_KEY = "sellphone.inventory.v1";
const paymentMethods = ["Transfer", "Tunai", "QRIS"];
const iphoneModels = [
  "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone Air",
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
  "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
  "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
  "iPhone SE (generasi ke-3)", "iPhone SE (generasi ke-2)", "iPhone SE", "Lainnya",
];
const financeCategories = {
  expense: [
    { name: "Makanan", icon: "🍜" },
    { name: "Transportasi", icon: "🚗" },
    { name: "Belanja", icon: "🛍️" },
    { name: "Tagihan", icon: "⚡" },
    { name: "Kesehatan", icon: "✚" },
    { name: "Lainnya", icon: "✦" },
  ],
  income: [
    { name: "Gaji", icon: "💼" },
    { name: "Freelance", icon: "✍️" },
    { name: "Investasi", icon: "📈" },
    { name: "Hadiah", icon: "🎁" },
    { name: "Lainnya", icon: "✦" },
  ],
};
const moneyFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const transactionList = document.querySelector("#transaction-list");
const emptyState = document.querySelector("#empty-state");
const dialog = document.querySelector("#transaction-dialog");
const form = document.querySelector("#transaction-form");
const saleStockInput = document.querySelector("#sale-stock");
const searchInput = document.querySelector("#search-input");
const paymentFilter = document.querySelector("#payment-filter");
const inventoryDialog = document.querySelector("#inventory-dialog");
const inventoryForm = document.querySelector("#inventory-form");
const inventoryList = document.querySelector("#inventory-list");
const financeDialog = document.querySelector("#finance-dialog");
const financeForm = document.querySelector("#finance-form");
const financeTypeInput = document.querySelector("#finance-type");
const financeCategoryInput = document.querySelector("#finance-category");
const financeTransactionList = document.querySelector("#finance-transaction-list");
const financeSearchPeriods = document.querySelectorAll("[data-period]");
const toast = document.querySelector("#toast");
const pageAction = document.querySelector("#page-action");
let toastTimer;
let sales = loadData(SALES_STORAGE_KEY, isValidSale, "penjualan");
let inventory = loadData(INVENTORY_STORAGE_KEY, isValidInventoryItem, "stok barang");
let financeTransactions = loadData(FINANCE_STORAGE_KEY, isValidFinanceTransaction, "keuangan");
let activeFinanceType = "expense";
let activePeriod = "day";
let currentPage = "finance";
let currentSalesView = "dashboard";

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  const [year, month, day] = value.split("-").map(Number);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day;
}

function isValidSale(sale) {
  return sale &&
    typeof sale.id === "string" &&
    typeof sale.model === "string" &&
    typeof sale.storage === "string" &&
    typeof sale.color === "string" &&
    typeof sale.customer === "string" &&
    (sale.stockId === undefined || typeof sale.stockId === "string") &&
    paymentMethods.includes(sale.payment) &&
    Number.isSafeInteger(sale.amount) &&
    sale.amount > 0 &&
    isValidDate(sale.date);
}

function isValidInventoryItem(item) {
  return item &&
    typeof item.id === "string" &&
    typeof item.model === "string" &&
    typeof item.storage === "string" &&
    typeof item.color === "string" &&
    Number.isSafeInteger(item.quantity) &&
    item.quantity >= 0 &&
    (item.unitCost === null || (Number.isSafeInteger(item.unitCost) && item.unitCost >= 0)) &&
    isValidDate(item.date);
}

function isValidFinanceTransaction(item) {
  return item &&
    typeof item.id === "string" &&
    (item.type === "income" || item.type === "expense") &&
    typeof item.description === "string" &&
    Number.isSafeInteger(item.amount) &&
    item.amount > 0 &&
    typeof item.category === "string" &&
    isValidDate(item.date);
}

function loadData(key, validator, label) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error(`Format data ${label} tidak valid.`);
    const validItems = parsed.filter(validator);
    if (validItems.length !== parsed.length) {
      console.error(`Sebagian data ${label} tidak valid dan tidak ditampilkan.`);
      showToast(`Sebagian data ${label} tidak dapat dibaca.`);
    }
    return validItems;
  } catch (error) {
    console.error(`Gagal membaca data ${label}:`, error);
    showToast(`Data ${label} tidak dapat dibaca.`);
    return [];
  }
}

function saveData(key, data, label) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Gagal menyimpan data ${label}:`, error);
    showToast("Gagal menyimpan. Periksa ruang penyimpanan browser.");
    return false;
  }
  return true;
}

function saveStockAndSales(nextInventory, nextSales) {
  if (!saveData(INVENTORY_STORAGE_KEY, nextInventory, "stok barang")) return false;
  if (!saveData(SALES_STORAGE_KEY, nextSales, "penjualan")) {
    if (!saveData(INVENTORY_STORAGE_KEY, inventory, "pemulihan stok barang")) {
      console.error("Stok barang tidak berhasil dipulihkan setelah penyimpanan penjualan gagal.");
    }
    return false;
  }
  inventory = nextInventory;
  sales = nextSales;
  return true;
}

function formatMoney(value) {
  return moneyFormat.format(value).replace(/\u00a0/g, " ");
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthItems(items) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return items.filter((item) => item.date.startsWith(monthPrefix));
}

function sumFor(items, type) {
  return items.reduce((total, item) => total + (item.type === type ? item.amount : 0), 0);
}

function renderFinanceSummary() {
  const now = new Date();
  const todayKey = localDateKey(now);
  const today = financeTransactions.filter((item) => item.date === todayKey);
  const monthly = currentMonthItems(financeTransactions);
  document.querySelector("#finance-today-date").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  document.querySelector("#finance-balance").textContent = formatMoney(
    sumFor(financeTransactions, "income") - sumFor(financeTransactions, "expense"),
  );
  document.querySelector("#daily-income").textContent = formatMoney(sumFor(today, "income"));
  document.querySelector("#daily-expense").textContent = formatMoney(sumFor(today, "expense"));
  document.querySelector("#monthly-income").textContent = formatMoney(sumFor(monthly, "income"));
  document.querySelector("#monthly-expense").textContent = formatMoney(sumFor(monthly, "expense"));
  document.querySelector("#daily-income-caption").textContent = today.filter((item) => item.type === "income").length
    ? `${today.filter((item) => item.type === "income").length} transaksi hari ini`
    : "Belum ada pemasukan hari ini";
  document.querySelector("#daily-expense-caption").textContent = today.filter((item) => item.type === "expense").length
    ? `${today.filter((item) => item.type === "expense").length} transaksi hari ini`
    : "Belum ada pengeluaran hari ini";
  document.querySelector("#monthly-income-caption").textContent = monthly.filter((item) => item.type === "income").length
    ? `${monthly.filter((item) => item.type === "income").length} transaksi bulan ini`
    : "Belum ada pemasukan bulan ini";
  document.querySelector("#monthly-expense-caption").textContent = monthly.filter((item) => item.type === "expense").length
    ? `${monthly.filter((item) => item.type === "expense").length} transaksi bulan ini`
    : "Belum ada pengeluaran bulan ini";
}

function renderSalesSummary() {
  const monthlySales = currentMonthItems(sales);
  const revenue = monthlySales.reduce((total, sale) => total + sale.amount, 0);
  document.querySelector("#revenue-total").textContent = formatMoney(revenue);
  document.querySelector("#units-total").textContent = `${monthlySales.length} unit`;
  document.querySelector("#units-caption").textContent = monthlySales.length
    ? `${monthlySales.length} iPhone terjual bulan ini`
    : "Belum ada unit terjual bulan ini";
  document.querySelector("#sales-total").textContent = String(monthlySales.length);
  document.querySelector("#sales-caption").textContent = monthlySales.length
    ? `${monthlySales.length} transaksi tercatat bulan ini`
    : "Catatan penjualan bulan ini";
  const availableUnits = inventory.reduce((total, item) => total + item.quantity, 0);
  document.querySelector("#stock-total").textContent = `${availableUnits} unit`;
  document.querySelector("#stock-caption").textContent = inventory.length
    ? `${inventory.filter((item) => item.quantity > 0).length} jenis stok tersedia`
    : "Tambahkan barang masuk";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderSalesTransactions() {
  const query = searchInput.value.trim().toLocaleLowerCase("id-ID");
  const payment = paymentFilter.value;
  const filtered = [...sales]
    .filter((sale) => payment === "all" || sale.payment === payment)
    .filter((sale) => `${sale.model} ${sale.storage} ${sale.color} ${sale.customer}`.toLocaleLowerCase("id-ID").includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  transactionList.replaceChildren(...filtered.map((sale) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="product-cell"><span class="product-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2.5" width="12" height="19" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M10 5h4M10.5 18.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="product-details"><span class="product-name">${escapeHtml(sale.model)}</span><span class="product-meta">${escapeHtml(sale.storage)} · ${escapeHtml(sale.color)}</span></span></span></td>
      <td class="customer-name">${escapeHtml(sale.customer)}</td>
      <td><span class="payment-tag">${escapeHtml(sale.payment)}</span></td>
      <td class="date-cell">${dateFormat.format(new Date(`${sale.date}T00:00:00`))}</td>
      <td class="amount-cell">${escapeHtml(formatMoney(sale.amount))}</td>
      <td><button class="delete-button" type="button" data-delete-id="${escapeHtml(sale.id)}" aria-label="Hapus transaksi ${escapeHtml(sale.model)}">×</button></td>`;
    return row;
  }));

  const hasSales = filtered.length > 0;
  emptyState.classList.toggle("visible", !hasSales);
  transactionList.hidden = !hasSales;
  document.querySelector("#empty-title").textContent = sales.length ? "Transaksi tidak ditemukan" : "Belum ada penjualan";
  document.querySelector("#empty-copy").textContent = sales.length
    ? "Coba ubah kata kunci atau filter pembayaran."
    : "Yuk, catat transaksi iPhone pertamamu.";
  document.querySelector(".sales-page .empty-state [data-open-modal]").hidden = sales.length > 0;
  document.querySelector("#transaction-count").textContent = `${filtered.length} transaksi`;
}

function renderInventory() {
  const availableUnits = inventory.reduce((total, item) => total + item.quantity, 0);
  const rows = [...inventory].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  inventoryList.replaceChildren(...rows.map((item) => {
    const row = document.createElement("tr");
    const hasSales = sales.some((sale) => sale.stockId === item.id);
    row.innerHTML = `
      <td><span class="product-cell"><span class="product-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2.5" width="12" height="19" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M10 5h4M10.5 18.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="product-details"><span class="product-name">${escapeHtml(item.model)}</span><span class="product-meta">${escapeHtml(item.storage)} · ${escapeHtml(item.color)}</span></span></span></td>
      <td><span class="stock-quantity ${item.quantity === 0 ? "out-of-stock" : ""}">${item.quantity} unit</span></td>
      <td class="amount-cell">${item.unitCost === null ? "—" : escapeHtml(formatMoney(item.unitCost))}</td>
      <td class="date-cell">${dateFormat.format(new Date(`${item.date}T00:00:00`))}</td>
      <td><button class="delete-button" type="button" data-delete-stock-id="${escapeHtml(item.id)}" aria-label="Hapus stok ${escapeHtml(item.model)}" ${hasSales ? "disabled title=\"Stok sudah memiliki transaksi penjualan\"" : ""}>×</button></td>`;
    return row;
  }));
  const hasInventory = rows.length > 0;
  document.querySelector("#inventory-empty-state").classList.toggle("visible", !hasInventory);
  inventoryList.hidden = !hasInventory;
  document.querySelector("#inventory-count").textContent = `${availableUnits} unit tersedia · ${rows.length} stok masuk`;
  renderSaleStockOptions();
}

function renderSaleStockOptions() {
  const available = inventory.filter((item) => item.quantity > 0);
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = available.length ? "Pilih barang yang terjual" : "Belum ada stok tersedia";
  const options = available.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.model} · ${item.storage} · ${item.color} (stok ${item.quantity})`;
    return option;
  });
  saleStockInput.replaceChildren(placeholder, ...options);
  saleStockInput.disabled = available.length === 0;
  document.querySelector("#sale-stock-empty").hidden = available.length > 0;
  document.querySelector("#sale-stock-hint").textContent = available.length
    ? "Produk, kapasitas, dan warna diambil dari barang masuk."
    : "Masukkan barang ke stok terlebih dahulu.";
  document.querySelector("#transaction-form [type=\"submit\"]").disabled = available.length === 0;
}

function itemsForActivePeriod() {
  const sorted = [...financeTransactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (activePeriod === "day") return sorted.filter((item) => item.date === localDateKey(new Date()));
  if (activePeriod === "month") return currentMonthItems(sorted);
  return sorted;
}

function renderFinanceTransactions() {
  const filtered = itemsForActivePeriod();
  financeTransactionList.replaceChildren(...filtered.map((item) => {
    const row = document.createElement("tr");
    const category = [...financeCategories.income, ...financeCategories.expense].find((entry) => entry.name === item.category);
    row.innerHTML = `
      <td><span class="finance-name"><span class="finance-symbol">${category ? category.icon : "✦"}</span><span class="finance-description">${escapeHtml(item.description)}</span></span></td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td class="date-cell">${dateFormat.format(new Date(`${item.date}T00:00:00`))}</td>
      <td class="amount-cell ${item.type}">${item.type === "income" ? "+" : "−"}${escapeHtml(formatMoney(item.amount))}</td>
      <td><button class="delete-button" type="button" data-finance-delete-id="${escapeHtml(item.id)}" aria-label="Hapus ${escapeHtml(item.description)}">×</button></td>`;
    return row;
  }));
  const hasTransactions = filtered.length > 0;
  const financeEmptyState = document.querySelector("#finance-empty-state");
  financeEmptyState.classList.toggle("visible", !hasTransactions);
  financeTransactionList.hidden = !hasTransactions;
  document.querySelector("#finance-empty-title").textContent = financeTransactions.length
    ? "Belum ada transaksi di periode ini"
    : "Belum ada transaksi keuangan";
  document.querySelector("#finance-empty-copy").textContent = financeTransactions.length
    ? "Coba pilih periode lain atau catat transaksi baru."
    : "Mulai catat pemasukan atau pengeluaranmu.";
  document.querySelector("#finance-transaction-count").textContent = `${filtered.length} transaksi`;
}

function render() {
  renderFinanceSummary();
  renderFinanceTransactions();
  renderSalesSummary();
  renderSalesTransactions();
  renderInventory();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function populateFinanceCategories(type) {
  const options = financeCategories[type].map((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.icon}  ${category.name}`;
    return option;
  });
  financeCategoryInput.replaceChildren(...options);
}

function setPage(page) {
  currentPage = page === "iphone-sales" ? "iphone-sales" : "finance";
  const isFinance = currentPage === "finance";
  document.querySelector("#finance").hidden = !isFinance;
  document.querySelector("#iphone-sales").hidden = isFinance;
  document.querySelectorAll("[data-page-link]").forEach((link) =>
    link.classList.toggle("active", link.dataset.pageLink === currentPage),
  );
  document.querySelectorAll(".mobile-nav-link").forEach((link) =>
    link.setAttribute("aria-current", link.dataset.pageLink === currentPage ? "page" : "false"),
  );
  document.querySelector("#today-label").textContent = isFinance
    ? "KEUANGAN PRIBADI · HARIAN & BULANAN"
    : "TOKO IPHONE · TRANSAKSI";
  document.querySelector("#page-title").innerHTML = isFinance
    ? "Keuanganmu, <span>lebih terarah.</span>"
    : "Kelola penjualan, <span>lebih mudah.</span>";
  pageAction.innerHTML = isFinance
    ? '<span class="plus">+</span> Catat transaksi'
    : currentSalesView === "inventory"
      ? '<span class="plus">+</span> Tambah barang'
      : '<span class="plus">+</span> Catat penjualan';
  pageAction.removeAttribute("data-open-modal");
  if (!isFinance) {
    setSalesView(currentSalesView);
    pageAction.removeAttribute("data-open-finance-modal");
    pageAction.setAttribute("data-open-sales-modal", "");
  } else {
    pageAction.removeAttribute("data-open-sales-modal");
    pageAction.setAttribute("data-open-finance-modal", "");
  }
}

function setSalesView(view) {
  currentSalesView = ["transactions", "inventory"].includes(view) ? view : "dashboard";
  const isDashboard = currentSalesView === "dashboard";
  document.querySelector("#sales-dashboard-view").hidden = !isDashboard;
  document.querySelector("#sales-transactions-view").hidden = isDashboard;
  document.querySelector("#sales-inventory-view").hidden = currentSalesView !== "inventory";
  document.querySelectorAll("[data-sales-view]").forEach((button) => {
    const active = button.dataset.salesView === currentSalesView;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (currentPage === "iphone-sales") {
    pageAction.innerHTML = currentSalesView === "inventory"
      ? '<span class="plus">+</span> Tambah barang'
      : '<span class="plus">+</span> Catat penjualan';
  }
}

document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());
document.querySelectorAll("[data-page-link]").forEach((link) => {
  link.addEventListener("click", () => setPage(link.dataset.pageLink));
});
window.addEventListener("hashchange", () => {
  setPage(window.location.hash === "#iphone-sales" ? "iphone-sales" : "finance");
});
document.querySelectorAll("[data-sales-view]").forEach((button) => {
  button.addEventListener("click", () => setSalesView(button.dataset.salesView));
});

document.querySelectorAll("[data-open-finance-modal]:not(#page-action)").forEach((button) => {
  button.addEventListener("click", () => openFinanceDialog());
});
document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openSalesDialog());
});
document.querySelectorAll("[data-open-inventory-modal]").forEach((button) => {
  button.addEventListener("click", () => openInventoryDialog());
});
pageAction.addEventListener("click", () => {
  if (currentPage === "finance") openFinanceDialog();
  else if (currentSalesView === "inventory") openInventoryDialog();
  else openSalesDialog();
});

function openFinanceDialog() {
  financeForm.reset();
  activeFinanceType = "expense";
  financeTypeInput.value = activeFinanceType;
  document.querySelectorAll("[data-finance-type]").forEach((button) =>
    button.classList.toggle("selected", button.dataset.financeType === activeFinanceType),
  );
  populateFinanceCategories(activeFinanceType);
  document.querySelector("#finance-date").value = localDateKey(new Date());
  financeDialog.showModal();
  document.querySelector("#finance-description").focus();
}

function openSalesDialog() {
  form.reset();
  document.querySelector("#date").value = localDateKey(new Date());
  renderSaleStockOptions();
  dialog.showModal();
  saleStockInput.focus();
}

function openInventoryDialog() {
  inventoryForm.reset();
  document.querySelector("#stock-date").value = localDateKey(new Date());
  inventoryDialog.showModal();
  document.querySelector("#stock-model").focus();
}

document.querySelector("[data-close-modal]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
document.querySelector("[data-close-inventory-modal]").addEventListener("click", () => inventoryDialog.close());
inventoryDialog.addEventListener("click", (event) => {
  if (event.target === inventoryDialog) inventoryDialog.close();
});
document.querySelector("[data-go-inventory]").addEventListener("click", () => {
  dialog.close();
  setSalesView("inventory");
});
document.querySelector("[data-close-finance-modal]").addEventListener("click", () => financeDialog.close());
financeDialog.addEventListener("click", (event) => {
  if (event.target === financeDialog) financeDialog.close();
});

document.querySelectorAll("[data-finance-type]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFinanceType = button.dataset.financeType;
    financeTypeInput.value = activeFinanceType;
    document.querySelectorAll("[data-finance-type]").forEach((option) =>
      option.classList.toggle("selected", option === button),
    );
    populateFinanceCategories(activeFinanceType);
  });
});

financeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(financeForm);
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: activeFinanceType,
    description: String(formData.get("description") || "").trim(),
    amount: Number(formData.get("amount")),
    category: String(formData.get("category") || ""),
    date: String(formData.get("date") || ""),
  };
  if (!item.description || !Number.isSafeInteger(item.amount) || item.amount <= 0 ||
      !isValidDate(item.date) || !financeCategories[activeFinanceType].some((category) => category.name === item.category)) {
    showToast("Periksa kembali detail transaksi.");
    return;
  }
  financeTransactions.push(item);
  if (!saveData(FINANCE_STORAGE_KEY, financeTransactions, "keuangan")) {
    financeTransactions.pop();
    return;
  }
  render();
  financeDialog.close();
  showToast("Transaksi berhasil disimpan.");
});

financeTransactionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-finance-delete-id]");
  if (!button) return;
  const previous = financeTransactions;
  financeTransactions = financeTransactions.filter((item) => item.id !== button.dataset.financeDeleteId);
  if (!saveData(FINANCE_STORAGE_KEY, financeTransactions, "keuangan")) {
    financeTransactions = previous;
    return;
  }
  render();
  showToast("Transaksi dihapus.");
});

financeSearchPeriods.forEach((button) => {
  button.addEventListener("click", () => {
    activePeriod = button.dataset.period;
    financeSearchPeriods.forEach((periodButton) =>
      periodButton.classList.toggle("active", periodButton === button),
    );
    renderFinanceTransactions();
  });
});

inventoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(inventoryForm);
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    model: String(formData.get("model") || ""),
    storage: String(formData.get("storage") || ""),
    color: String(formData.get("color") || "").trim(),
    quantity: Number(formData.get("quantity")),
    unitCost: String(formData.get("unitCost") || "").trim() === ""
      ? null
      : Number(formData.get("unitCost")),
    date: String(formData.get("date") || ""),
  };
  if (!iphoneModels.includes(item.model) || !item.storage || !item.color ||
      !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      (item.unitCost !== null && (!Number.isSafeInteger(item.unitCost) || item.unitCost < 0)) ||
      !isValidDate(item.date)) {
    showToast("Periksa kembali detail barang masuk.");
    return;
  }
  const nextInventory = [...inventory, item];
  if (!saveData(INVENTORY_STORAGE_KEY, nextInventory, "stok barang")) return;
  inventory = nextInventory;
  render();
  inventoryDialog.close();
  showToast(`${item.quantity} unit ${item.model} ditambahkan ke stok.`);
});

inventoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-stock-id]");
  if (!button) return;
  const item = inventory.find((entry) => entry.id === button.dataset.deleteStockId);
  if (!item) return;
  if (sales.some((sale) => sale.stockId === item.id)) {
    showToast("Stok yang sudah memiliki penjualan tidak dapat dihapus.");
    return;
  }
  const nextInventory = inventory.filter((entry) => entry.id !== item.id);
  if (!saveData(INVENTORY_STORAGE_KEY, nextInventory, "stok barang")) return;
  inventory = nextInventory;
  render();
  showToast("Barang masuk dihapus dari stok.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const stockId = String(formData.get("stockId") || "");
  const stockItem = inventory.find((item) => item.id === stockId);
  const sale = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stockId,
    model: stockItem ? stockItem.model : "",
    storage: stockItem ? stockItem.storage : "",
    color: stockItem ? stockItem.color : "",
    customer: String(formData.get("customer") || "").trim(),
    payment: String(formData.get("payment") || ""),
    amount: Number(formData.get("amount")),
    date: String(formData.get("date") || ""),
  };
  if (!stockItem || stockItem.quantity <= 0 || !sale.customer ||
      !paymentMethods.includes(sale.payment) || !Number.isSafeInteger(sale.amount) ||
      sale.amount <= 0 || !isValidDate(sale.date)) {
    showToast(stockItem ? "Periksa kembali detail penjualan." : "Pilih barang yang masih tersedia di stok.");
    return;
  }
  const nextInventory = inventory.map((item) =>
    item.id === stockItem.id ? { ...item, quantity: item.quantity - 1 } : item,
  );
  const nextSales = [...sales, sale];
  if (!saveStockAndSales(nextInventory, nextSales)) return;
  render();
  dialog.close();
  showToast("Penjualan berhasil disimpan.");
});

transactionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  const deletedSale = sales.find((sale) => sale.id === button.dataset.deleteId);
  if (!deletedSale) return;
  const nextSales = sales.filter((sale) => sale.id !== deletedSale.id);
  const nextInventory = deletedSale.stockId
    ? inventory.map((item) => item.id === deletedSale.stockId ? { ...item, quantity: item.quantity + 1 } : item)
    : inventory;
  if (deletedSale.stockId && !inventory.some((item) => item.id === deletedSale.stockId)) {
    showToast("Stok asal tidak ditemukan; transaksi tidak dihapus.");
    return;
  }
  if (deletedSale.stockId) {
    if (!saveStockAndSales(nextInventory, nextSales)) return;
  } else {
    if (!saveData(SALES_STORAGE_KEY, nextSales, "penjualan")) return;
    sales = nextSales;
  }
  render();
  showToast("Transaksi penjualan dihapus.");
});

searchInput.addEventListener("input", renderSalesTransactions);
paymentFilter.addEventListener("change", renderSalesTransactions);

const modelOptions = iphoneModels.map((model) => {
  const option = document.createElement("option");
  option.value = model;
  option.textContent = model;
  return option;
});
document.querySelector("#stock-model").replaceChildren(
  Object.assign(document.createElement("option"), { value: "", disabled: true, selected: true, textContent: "Pilih model iPhone" }),
  ...modelOptions,
);
populateFinanceCategories(activeFinanceType);
setSalesView("dashboard");
setPage(window.location.hash === "#iphone-sales" ? "iphone-sales" : "finance");
render();
