const STORAGE_KEY = "ruanguang.transactions.v1";
const BUDGET_STORAGE_KEY = "ruanguang.budgets.v1";
const categories = {
  expense: [
    { name: "Makanan", icon: "🍜", budget: 1500000 },
    { name: "Transportasi", icon: "🚗", budget: 700000 },
    { name: "Belanja", icon: "🛍️", budget: 1000000 },
    { name: "Tagihan", icon: "⚡", budget: 900000 },
    { name: "Lainnya", icon: "✦", budget: 500000 },
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
const shortMoneyFormat = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthFormat = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

const transactionList = document.querySelector("#transaction-list");
const emptyState = document.querySelector("#empty-state");
const dialog = document.querySelector("#transaction-dialog");
const form = document.querySelector("#transaction-form");
const typeInput = document.querySelector("#form-type");
const categoryInput = document.querySelector("#category");
const searchInput = document.querySelector("#search-input");
const typeFilter = document.querySelector("#type-filter");
const toast = document.querySelector("#toast");
const budgetDialog = document.querySelector("#budget-dialog");
const budgetForm = document.querySelector("#budget-form");
const budgetFields = document.querySelector("#budget-fields");
let activeType = "expense";
let toastTimer;
let budgets = loadBudgets();
let transactions = loadTransactions();

function loadTransactions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Format data transaksi tidak valid.");
    return parsed.filter((item) =>
      item &&
      typeof item.id === "string" &&
      (item.type === "income" || item.type === "expense") &&
      typeof item.description === "string" &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      typeof item.category === "string" &&
      isValidDate(item.date),
    );
  } catch (error) {
    console.error("Gagal membaca data transaksi:", error);
    showToast("Data transaksi tidak dapat dibaca.");
    return [];
  }
}

function loadBudgets() {
  const defaults = Object.fromEntries(categories.expense.map((category) => [category.name, category.budget]));
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || categories.expense.some((category) => !Number.isSafeInteger(parsed[category.name]) || parsed[category.name] <= 0)) {
      throw new Error("Format anggaran tidak valid.");
    }
    return parsed;
  } catch (error) {
    console.error("Gagal membaca data anggaran:", error);
    showToast("Data anggaran tidak dapat dibaca; nilai bawaan digunakan.");
    return defaults;
  }
}

function saveBudgets() {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
  } catch (error) {
    console.error("Gagal menyimpan data anggaran:", error);
    showToast("Gagal menyimpan anggaran. Periksa ruang penyimpanan browser.");
    return false;
  }
  return true;
}

function isValidDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Gagal menyimpan data transaksi:", error);
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

function currentMonthTransactions() {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return transactions.filter((item) => item.date.startsWith(monthPrefix));
}

function sumFor(items, type) {
  return items.reduce((total, item) => total + (item.type === type ? item.amount : 0), 0);
}

function renderSummary() {
  const monthly = currentMonthTransactions();
  const income = sumFor(monthly, "income");
  const expense = sumFor(monthly, "expense");
  document.querySelector("#balance-total").textContent = formatMoney(sumFor(transactions, "income") - sumFor(transactions, "expense"));
  document.querySelector("#income-total").textContent = formatMoney(income);
  document.querySelector("#expense-total").textContent = formatMoney(expense);
  document.querySelector("#income-caption").textContent = income ? `${monthly.filter((item) => item.type === "income").length} transaksi bulan ini` : "Belum ada pemasukan bulan ini";
  document.querySelector("#expense-caption").textContent = expense ? `${monthly.filter((item) => item.type === "expense").length} transaksi bulan ini` : "Belum ada pengeluaran bulan ini";
  document.querySelector("#budget-month").textContent = monthFormat.format(new Date());
}

function renderTransactions() {
  const query = searchInput.value.trim().toLocaleLowerCase("id-ID");
  const type = typeFilter.value;
  const filtered = [...transactions]
    .filter((item) => type === "all" || item.type === type)
    .filter((item) => `${item.description} ${item.category}`.toLocaleLowerCase("id-ID").includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  transactionList.replaceChildren(...filtered.map((item) => {
    const row = document.createElement("tr");
    const category = [...categories.income, ...categories.expense].find((entry) => entry.name === item.category);
    const symbol = category ? category.icon : "✦";
    row.innerHTML = `
      <td><span class="transaction-name"><span class="transaction-symbol">${symbol}</span>${escapeHtml(item.description)}</span></td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td class="date-cell">${dateFormat.format(new Date(`${item.date}T00:00:00`))}</td>
      <td class="amount-cell ${item.type}">${item.type === "income" ? "+" : "−"}${escapeHtml(formatMoney(item.amount))}</td>
      <td><button class="delete-button" type="button" data-delete-id="${escapeHtml(item.id)}" aria-label="Hapus ${escapeHtml(item.description)}">×</button></td>`;
    return row;
  }));
  emptyState.classList.toggle("visible", filtered.length === 0);
  transactionList.hidden = filtered.length === 0;
  document.querySelector("#transaction-count").textContent = `${filtered.length} transaksi`;
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

function renderBudgets() {
  const spending = currentMonthTransactions().filter((item) => item.type === "expense");
  const container = document.querySelector("#budget-list");
  container.replaceChildren(...categories.expense.map((category) => {
    const spent = spending.filter((item) => item.category === category.name).reduce((total, item) => total + item.amount, 0);
    const limit = budgets[category.name];
    const percentage = Math.round((spent / limit) * 100);
    const row = document.createElement("div");
    row.className = "budget-item";
    row.innerHTML = `
      <span class="budget-icon" aria-hidden="true">${category.icon}</span>
      <div class="budget-info">
        <div class="budget-meta"><span class="budget-name">${escapeHtml(category.name)}</span><span class="budget-amount">${escapeHtml(shortMoneyFormat.format(spent))} / ${escapeHtml(shortMoneyFormat.format(limit))}</span></div>
        <div class="budget-track" role="progressbar" aria-label="Anggaran ${escapeHtml(category.name)}" aria-valuenow="${Math.min(percentage, 100)}" aria-valuemin="0" aria-valuemax="100"><div class="budget-fill ${percentage > 100 ? "over" : ""}" style="width: ${Math.min(percentage, 100)}%"></div></div>
      </div>
      <span class="budget-percent">${percentage}%</span>`;
    return row;
  }));
}

function drawCashflow() {
  const canvas = document.querySelector("#cashflow-chart");
  const context = canvas.getContext("2d");
  if (!context) return;
  const bounds = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(bounds.width * scale));
  canvas.height = Math.max(1, Math.floor(bounds.height * scale));
  context.scale(scale, scale);

  const width = bounds.width;
  const height = bounds.height;
  const left = 34;
  const right = 6;
  const top = 7;
  const bottom = 23;
  const chartHeight = height - top - bottom;
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
    const key = localDateKey(date);
    const matching = transactions.filter((item) => item.date === key);
    return {
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date).slice(0, 3),
      income: sumFor(matching, "income"),
      expense: sumFor(matching, "expense"),
    };
  });
  const maxValue = Math.max(1, ...days.flatMap((day) => [day.income, day.expense]));
  const chartWidth = width - left - right;
  const groupWidth = chartWidth / days.length;
  const barWidth = Math.min(12, groupWidth * 0.25);
  const gridValues = [0, 0.5, 1];

  context.font = "9px 'DM Sans', sans-serif";
  context.textBaseline = "middle";
  gridValues.forEach((point) => {
    const y = top + chartHeight * point;
    context.strokeStyle = "#eff1ed";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();
    context.fillStyle = "#a3aaa2";
    context.textAlign = "left";
    context.fillText(point === 1 ? "0" : shortMoneyFormat.format(Math.round(maxValue * (1 - point))), 0, y);
  });

  days.forEach((day, index) => {
    const center = left + groupWidth * (index + 0.5);
    const incomeHeight = (day.income / maxValue) * (chartHeight - 2);
    const expenseHeight = (day.expense / maxValue) * (chartHeight - 2);
    context.fillStyle = "#82ad90";
    roundRect(context, center - barWidth - 1, top + chartHeight - incomeHeight, barWidth, Math.max(incomeHeight, day.income ? 2 : 0), 3);
    context.fillStyle = "#e5b292";
    roundRect(context, center + 1, top + chartHeight - expenseHeight, barWidth, Math.max(expenseHeight, day.expense ? 2 : 0), 3);
    context.fillStyle = "#9ca39b";
    context.textAlign = "center";
    context.fillText(day.label, center, height - 8);
  });
}

function roundRect(context, x, y, width, height, radius) {
  if (height <= 0) return;
  const actualRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, actualRadius);
  context.fill();
}

function render() {
  renderSummary();
  renderTransactions();
  renderBudgets();
  drawCashflow();
}

function populateCategories(type) {
  const options = categories[type].map((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.icon}  ${category.name}`;
    return option;
  });
  categoryInput.replaceChildren(...options);
}

function renderBudgetFields() {
  budgetFields.replaceChildren(...categories.expense.map((category) => {
    const field = document.createElement("div");
    field.className = "budget-field";
    const label = document.createElement("label");
    label.htmlFor = `budget-${category.name}`;
    label.textContent = `${category.icon}  ${category.name}`;
    const amount = document.createElement("div");
    amount.className = "amount-input";
    amount.innerHTML = '<span>Rp</span>';
    const input = document.createElement("input");
    input.className = "form-control";
    input.id = `budget-${category.name}`;
    input.name = category.name;
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.inputMode = "numeric";
    input.required = true;
    input.value = String(budgets[category.name]);
    amount.append(input);
    field.append(label, amount);
    return field;
  }));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    form.reset();
    activeType = "expense";
    typeInput.value = activeType;
    document.querySelectorAll(".type-option").forEach((option) => option.classList.toggle("selected", option.dataset.type === activeType));
    populateCategories(activeType);
    document.querySelector("#date").value = localDateKey(new Date());
    dialog.showModal();
    document.querySelector("#description").focus();
  });
});

document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => dialog.close()));
document.querySelector("#edit-budgets").addEventListener("click", () => {
  renderBudgetFields();
  budgetDialog.showModal();
});
document.querySelector("[data-close-budget]").addEventListener("click", () => budgetDialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
budgetDialog.addEventListener("click", (event) => {
  if (event.target === budgetDialog) budgetDialog.close();
});

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(budgetForm);
  const updatedBudgets = Object.fromEntries(categories.expense.map((category) => [category.name, Number(formData.get(category.name))]));
  if (Object.values(updatedBudgets).some((amount) => !Number.isSafeInteger(amount) || amount <= 0)) {
    showToast("Masukkan batas anggaran dalam jumlah rupiah yang valid.");
    return;
  }
  const previousBudgets = budgets;
  budgets = updatedBudgets;
  if (!saveBudgets()) {
    budgets = previousBudgets;
    return;
  }
  renderBudgets();
  budgetDialog.close();
  showToast("Anggaran berhasil diperbarui.");
});

document.querySelectorAll(".type-option").forEach((button) => {
  button.addEventListener("click", () => {
    activeType = button.dataset.type;
    typeInput.value = activeType;
    document.querySelectorAll(".type-option").forEach((option) => option.classList.toggle("selected", option === button));
    populateCategories(activeType);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date") || "");
  const category = String(formData.get("category") || "");

  if (!description || !Number.isSafeInteger(amount) || amount <= 0 || !isValidDate(date) || !categories[activeType].some((item) => item.name === category)) {
    showToast("Periksa kembali detail transaksi.");
    return;
  }
  const transaction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: activeType,
    description,
    amount,
    category,
    date,
  };
  transactions.push(transaction);
  if (!saveTransactions()) {
    transactions.pop();
    return;
  }
  render();
  dialog.close();
  showToast("Transaksi berhasil disimpan.");
});

transactionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  const previous = transactions;
  transactions = transactions.filter((item) => item.id !== button.dataset.deleteId);
  if (!saveTransactions()) {
    transactions = previous;
    return;
  }
  render();
  showToast("Transaksi dihapus.");
});

searchInput.addEventListener("input", renderTransactions);
typeFilter.addEventListener("change", renderTransactions);
window.addEventListener("resize", drawCashflow);
window.addEventListener("hashchange", () => {
  const activeHash = window.location.hash || "#overview";
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === activeHash));
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toLocaleUpperCase("id-ID");
populateCategories(activeType);
renderBudgetFields();
render();
