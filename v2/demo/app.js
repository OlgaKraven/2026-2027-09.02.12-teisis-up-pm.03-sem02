const STORAGE_KEY = "directory-demo-v2";
const CATEGORIES = ["Контакты", "Документы", "Ресурсы"];
const columns = ["id", "name", "category", "detail", "contact", "source", "checked", "status"];
const form = document.querySelector("#entry-form");
const rowsElement = document.querySelector("#rows");
const errorElement = document.querySelector("#form-error");
let storageReadBlocked = false;
let records = loadRecords();
let editingId = null;

function loadRecords() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    const value = JSON.parse(raw || "[]");
    const seenIds = new Set();
    const seenNames = new Set();
    const valid = Array.isArray(value) && value.every(item => {
      if (!item || columns.some(key => typeof item[key] !== "string")) return false;
      const name = item.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
      if (!/^\d+$/.test(item.id) || !name || !item.contact.trim() || !item.source.trim() ||
          !CATEGORIES.includes(item.category) || !/^К-\d{3}$/.test(item.detail) ||
          !validDate(item.checked) || !["active", "archived"].includes(item.status) ||
          seenIds.has(item.id) || seenNames.has(name)) return false;
      seenIds.add(item.id); seenNames.add(name);
      return true;
    });
    if (!valid) {
      // Preserve the original value before allowing a new catalogue to be saved.
      localStorage.setItem(STORAGE_KEY + "-recovery-" + Date.now(), raw);
      errorElement.textContent = "Сохранённые данные повреждены. Их исходная копия оставлена в хранилище с пометкой recovery. Восстановите записи по исходным сведениям.";
      return [];
    }
    return value;
  } catch {
    if (raw !== null) {
      try { localStorage.setItem(STORAGE_KEY + "-recovery-" + Date.now(), raw); }
      catch { storageReadBlocked = true; }
    } else storageReadBlocked = true;
    errorElement.textContent = "Не удалось прочитать сохранённые данные. Проверьте доступ к хранилищу браузера; исходные данные не удалены.";
    return [];
  }
}

function saveRecords(next) {
  if (storageReadBlocked) {
    errorElement.textContent = "Хранилище недоступно. Исходные данные сохранены; изменения не записаны. Проверьте настройки браузера и повторно откройте проект.";
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    records = next;
    return true;
  } catch {
    errorElement.textContent = "Не удалось сохранить изменения в браузере. Проверьте доступ и свободное место. Запись не изменена; введённые поля оставлены в форме.";
    return false;
  }
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
  const next = records.map(row => ({ ...row }));
  if (editingId === null) next.push(item);
  else {
    const position = next.findIndex(row => row.id === editingId);
    item.status = next[position].status;
    next[position] = item;
  }
  if (!saveRecords(next)) return;
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
  const next = records.map(row => row.id === id
    ? { ...row, status: row.status === "active" ? "archived" : "active" }
    : { ...row });
  if (!saveRecords(next)) return;
  errorElement.textContent = "";
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
  const csvCell = value => '"' + value.replace(/"/g, '""') + '"';
  const csv = [columns.join(";"), ...records.map(item => columns.map(key => csvCell(item[key])).join(";"))].join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "directory-export.csv"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

render();
