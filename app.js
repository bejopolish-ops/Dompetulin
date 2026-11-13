const SALES_STORAGE_KEY = "sellphone.sales.v1";
const FINANCE_STORAGE_KEY = "ruanguang.transactions.v1";
const paymentMethods = ["Transfer", "Tunai", "QRIS"];
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
const searchInput = document.querySelector("#search-input");
const paymentFilter = document.querySelector("#payment-filter");
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
let financeTransactions = loadData(FINANCE_STORAGE_KEY, isValidFinanceTransaction, "keuangan");
let activeFinanceType = "expense";
let activePeriod = "day";
let currentPage = "finance";

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
    paymentMethods.includes(sale.payment) &&
    Number.isSafeInteger(sale.amount) &&
    sale.amount > 0 &&
    isValidDate(sale.date);
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
    : '<span class="plus">+</span> Catat penjualan';
  pageAction.removeAttribute("data-open-modal");
  if (!isFinance) {
    pageAction.removeAttribute("data-open-finance-modal");
    pageAction.setAttribute("data-open-sales-modal", "");
  } else {
    pageAction.removeAttribute("data-open-sales-modal");
    pageAction.setAttribute("data-open-finance-modal", "");
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

document.querySelectorAll("[data-open-finance-modal]:not(#page-action)").forEach((button) => {
  button.addEventListener("click", () => openFinanceDialog());
});
document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openSalesDialog());
});
pageAction.addEventListener("click", () => {
  if (currentPage === "finance") openFinanceDialog();
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
  dialog.showModal();
  document.querySelector("#model").focus();
}

document.querySelector("[data-close-modal]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const sale = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    model: String(formData.get("model") || "").trim(),
    storage: String(formData.get("storage") || ""),
    color: String(formData.get("color") || "").trim(),
    customer: String(formData.get("customer") || "").trim(),
    payment: String(formData.get("payment") || ""),
    amount: Number(formData.get("amount")),
    date: String(formData.get("date") || ""),
  };
  if (!sale.model || !sale.storage || !sale.color || !sale.customer ||
      !paymentMethods.includes(sale.payment) || !Number.isSafeInteger(sale.amount) ||
      sale.amount <= 0 || !isValidDate(sale.date)) {
    showToast("Periksa kembali detail penjualan.");
    return;
  }
  sales.push(sale);
  if (!saveData(SALES_STORAGE_KEY, sales, "penjualan")) {
    sales.pop();
    return;
  }
  render();
  dialog.close();
  showToast("Penjualan berhasil disimpan.");
});

transactionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  const previous = sales;
  sales = sales.filter((sale) => sale.id !== button.dataset.deleteId);
  if (!saveData(SALES_STORAGE_KEY, sales, "penjualan")) {
    sales = previous;
    return;
  }
  render();
  showToast("Transaksi penjualan dihapus.");
});

searchInput.addEventListener("input", renderSalesTransactions);
paymentFilter.addEventListener("change", renderSalesTransactions);

populateFinanceCategories(activeFinanceType);
setPage(window.location.hash === "#iphone-sales" ? "iphone-sales" : "finance");
render();
