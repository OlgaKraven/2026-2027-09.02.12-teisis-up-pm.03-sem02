const columns = ["id", "name", "category", "contact", "source", "updated"];
const fileInput = document.querySelector("#file");
const queryInput = document.querySelector("#query");
const body = document.querySelector("#rows");
const issuesList = document.querySelector("#issues");
const statusLine = document.querySelector("#status");
let records = [];
let issues = [];

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length || lines[0].trim() !== columns.join(";")) {
    throw new Error("Первая строка должна быть: " + columns.join(";"));
  }
  const result = [];
  const warnings = [];
  const ids = new Set();
  const names = new Set();
  for (let index = 1; index < lines.length; index++) {
    const cells = lines[index].split(";").map(value => value.trim());
    const line = index + 1;
    if (cells.length !== columns.length) {
      warnings.push(`Строка ${line}: ожидалось шесть полей`);
      continue;
    }
    const item = Object.fromEntries(columns.map((key, position) => [key, cells[position]]));
    if (!/^\d+$/.test(item.id) || !item.name || !item.category || !item.source || !/^\d{4}-\d{2}-\d{2}$/.test(item.updated)) {
      warnings.push(`Строка ${line}: неверный ID, обязательное поле или дата`);
      continue;
    }
    const normalized = item.name.toLocaleLowerCase("ru").replace(/\s+/g, " ");
    if (ids.has(item.id) || names.has(normalized)) {
      warnings.push(`Строка ${line}: повтор ID или названия`);
      continue;
    }
    ids.add(item.id);
    names.add(normalized);
    result.push(item);
  }
  return { result, warnings };
}

function render() {
  const term = queryInput.value.trim().toLocaleLowerCase("ru");
  body.replaceChildren();
  for (const item of records.filter(row => [row.name, row.category, row.contact].some(value => value.toLocaleLowerCase("ru").includes(term)))) {
    const tr = document.createElement("tr");
    for (const key of columns) {
      const td = document.createElement("td");
      td.textContent = item[key];
      tr.append(td);
    }
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.textContent = "Изменить";
    button.addEventListener("click", () => edit(item));
    action.append(button);
    tr.append(action);
    body.append(tr);
  }
  issuesList.replaceChildren(...issues.map(message => {
    const li = document.createElement("li");
    li.textContent = message;
    return li;
  }));
  statusLine.textContent = `Записей: ${records.length}; показано: ${body.children.length}; замечаний: ${issues.length}.`;
}

function edit(item) {
  const name = prompt("Название", item.name);
  if (name === null) return;
  const category = prompt("Категория", item.category);
  if (category === null) return;
  const contact = prompt("Контакт", item.contact);
  if (contact === null) return;
  if (!name.trim() || !category.trim() || [name, category, contact].some(value => value.includes(";"))) {
    alert("Название и категория обязательны; точка с запятой запрещена.");
    return;
  }
  if (records.some(row => row !== item && row.name.toLocaleLowerCase("ru") === name.trim().toLocaleLowerCase("ru"))) {
    alert("Название уже есть в справочнике.");
    return;
  }
  Object.assign(item, { name: name.trim(), category: category.trim(), contact: contact.trim(), updated: new Date().toISOString().slice(0, 10) });
  render();
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const parsed = parseCsv(await file.text());
    records = parsed.result;
    issues = parsed.warnings;
    render();
  } catch (error) {
    statusLine.textContent = `Ошибка файла: ${error.message}`;
  }
});
queryInput.addEventListener("input", render);
document.querySelector("#export").addEventListener("click", () => {
  const text = [columns.join(";"), ...records.map(item => columns.map(key => item[key]).join(";"))].join("\n") + "\n";
  const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "directory-clean.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
