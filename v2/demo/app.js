const STORAGE_KEY = "directory-demo-v2";
const CATEGORIES = ["Контакты", "Документы", "Ресурсы"];
const columns = ["id", "name", "category", "detail", "contact", "source", "checked", "status"];
const form = document.querySelector("#entry-form");
const rowsElement = document.querySelector("#rows");
const errorElement = document.querySelector("#form-error");
let records = loadRecords();
let editingId = null;

function loadRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function field(id) {
  return document.querySelector("#entry-" + id).value.trim().replace(/\s+/g, " ");
}

function collect() {
  return {
    id: field("id"), name: field("name"), category: field("category"),
    detail: field("detail").toUpperCase(), contact: field("contact"),
    source: field("source"), checked: field("checked"), status: "active"
  };
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validate(item) {
  if (!/^\d+$/.test(item.id)) return "ID должен состоять из цифр.";
  if (!item.name || !item.contact || !item.source) return "Название, контакт и источник обязательны.";
  if (!CATEGORIES.includes(item.category)) return "Выберите категорию из списка.";
  if (!/^К-\d{3}$/.test(item.detail)) return "Кабинет укажите в формате К-101.";
  if (!validDate(item.checked)) return "Укажите существующую дату проверки.";
  if (columns.some(key => /[;\r\n]/.test(item[key]))) return "В полях нельзя использовать точку с запятой и перенос строки.";
  const normalized = item.name.toLocaleLowerCase("ru");
  if (records.some(row => row.id === item.id && row.id !== editingId)) return "Этот ID уже есть.";
  if (records.some(row => row.name.toLocaleLowerCase("ru") === normalized && row.id !== editingId)) return "Такое название уже есть.";
  return "";
}

function clearForm() {
  form.reset();
  editingId = null;
  document.querySelector("#entry-id").disabled = false;
  document.querySelector("#form-title").textContent = "Новая запись";
  document.querySelector("#cancel").hidden = true;
  errorElement.textContent = "";
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const item = collect();
  const message = validate(item);
  if (message) { errorElement.textContent = message; return; }
  if (editingId === null) records.push(item);
  else {
    const position = records.findIndex(row => row.id === editingId);
    item.status = records[position].status;
    records[position] = item;
  }
  saveRecords();
  clearForm();
  render();
});

document.querySelector("#cancel").addEventListener("click", clearForm);

function beginEdit(id) {
  const item = records.find(row => row.id === id);
  if (!item) return;
  editingId = id;
  for (const key of columns.slice(0, 7)) document.querySelector("#entry-" + key).value = item[key];
  document.querySelector("#entry-id").disabled = true;
  document.querySelector("#form-title").textContent = "Правка записи " + id;
  document.querySelector("#cancel").hidden = false;
  errorElement.textContent = "";
  form.scrollIntoView({ behavior: "smooth" });
}

function changeStatus(id) {
  const item = records.find(row => row.id === id);
  if (!item) return;
  item.status = item.status === "active" ? "archived" : "active";
  saveRecords();
  render();
}

function visibleRecords() {
  const query = document.querySelector("#query").value.trim().toLocaleLowerCase("ru");
  const status = document.querySelector("#status-filter").value;
  const category = document.querySelector("#category-filter").value;
  const order = document.querySelector("#sort").value;
  return records.filter(item =>
    (status === "all" || item.status === status) &&
    (category === "all" || item.category === category) &&
    [item.name, item.category, item.detail, item.contact].some(value => value.toLocaleLowerCase("ru").includes(query))
  ).sort((a, b) => order === "checked" ? b.checked.localeCompare(a.checked) || a.name.localeCompare(b.name, "ru") : a.name.localeCompare(b.name, "ru"));
}

function render() {
  const shown = visibleRecords();
  rowsElement.replaceChildren();
  for (const item of shown) {
    const row = document.createElement("tr");
    if (item.status === "archived") row.className = "archived";
    for (const key of columns) {
      const cell = document.createElement("td");
      cell.textContent = key === "status" ? (item.status === "active" ? "Действует" : "Архив") : item[key];
      row.append(cell);
    }
    const actions = document.createElement("td");
    const edit = document.createElement("button");
    edit.type = "button"; edit.textContent = "Править";
    edit.addEventListener("click", () => beginEdit(item.id));
    const toggle = document.createElement("button");
    toggle.type = "button"; toggle.textContent = item.status === "active" ? "В архив" : "Восстановить";
    toggle.addEventListener("click", () => changeStatus(item.id));
    actions.append(edit, toggle);
    row.append(actions);
    rowsElement.append(row);
  }
  document.querySelector("#summary").textContent = `Всего: ${records.length}; показано: ${shown.length}.`;
}

for (const id of ["query", "status-filter", "category-filter", "sort"]) {
  document.querySelector("#" + id).addEventListener("input", render);
}

document.querySelector("#export").addEventListener("click", () => {
  const csv = [columns.join(";"), ...records.map(item => columns.map(key => item[key]).join(";"))].join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "directory-export.csv"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

render();
