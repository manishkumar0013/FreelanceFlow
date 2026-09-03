const API_BASE_URL = "http://localhost:5000/api";
const body = document.body;
const themeBtn = document.getElementById("themeBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
if (localStorage.getItem("ff-theme") === "dark") body.classList.add("dark");
themeBtn?.addEventListener("click", () => { body.classList.toggle("dark"); localStorage.setItem("ff-theme", body.classList.contains("dark") ? "dark" : "light"); });
menuBtn?.addEventListener("click", () => sidebar?.classList.toggle("open"));
function toast(message) { const el = document.getElementById("toast"); if (!el) return; el.textContent = message; el.classList.add("show"); clearTimeout(window.ffToast); window.ffToast = setTimeout(() => el.classList.remove("show"), 2800); }
document.querySelectorAll("a[href='#']").forEach(a => a.addEventListener("click", e => { e.preventDefault(); toast("Help & Support: use the dashboard features or contact your workspace administrator."); }));
function getToken() { return localStorage.getItem("ff-token"); }
function saveToken(t) { localStorage.setItem("ff-token", t); }
function logout() { localStorage.removeItem("ff-token"); localStorage.removeItem("ff-running-timer"); location.href = "login.html"; }
async function apiRequest(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) }; const token = getToken(); if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  let data = {}; try { data = await response.json(); } catch { }
  if (response.status === 401) { localStorage.removeItem("ff-token"); if (!location.pathname.endsWith("login.html")) location.href = "login.html"; throw new Error("Session expired. Please login again."); }
  if (!response.ok) throw new Error(data.message || "Something went wrong"); return data;
}
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
async function loadCounts() {
  if (!getToken()) return;
  try {
    const [c, p, t] = await Promise.all([apiRequest("/clients"), apiRequest("/projects"), apiRequest("/tasks")]);
    document.getElementById("navClientCount")?.replaceChildren(document.createTextNode(c.clients?.length || 0));
    document.getElementById("navProjectCount")?.replaceChildren(document.createTextNode(p.projects?.length || 0));
    document.getElementById("navTaskCount")?.replaceChildren(document.createTextNode(t.tasks?.filter(x => x.status !== "completed").length || 0));
  } catch (e) { console.warn(e.message) }
}
// AUTH
const loginBtn = document.getElementById("loginBtn");
loginBtn?.addEventListener("click", async () => { try { const email = document.getElementById("loginEmail").value.trim(), password = document.getElementById("loginPassword").value; if (!email || !password) throw Error("Email and password are required"); const d = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); saveToken(d.token); location.href = "index.html"; } catch (e) { toast(e.message) } });
const registerBtn = document.getElementById("registerBtn");
registerBtn?.addEventListener("click", async () => { try { const name = document.getElementById("registerName").value.trim(), email = document.getElementById("registerEmail").value.trim(), password = document.getElementById("registerPassword").value; if (!name || !email || !password) throw Error("All fields are required"); await apiRequest("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }); toast("Account created. Redirecting to login..."); setTimeout(() => location.href = "login.html", 700); } catch (e) { toast(e.message) } });
// CLIENTS
const clientGrid = document.getElementById("clientGrid");
async function loadClients() { if (!clientGrid) return; try { const d = await apiRequest("/clients"); const clients = d.clients || []; clientGrid.innerHTML = clients.length ? clients.map(c => `<article class="client-card"><div class="avatar lg">${esc((c.name || "C").slice(0, 2).toUpperCase())}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.email)}</p><span class="badge success">${esc(c.company || "Client")}</span><p class="muted">₹${Number(c.hourlyRate || 0).toLocaleString("en-IN")}/hour</p></div><button class="more" onclick="editClient('${c._id}')">✎</button> <button class="more" onclick="deleteClient('${c._id}')">🗑</button><div class="client-stats"><span>Client ID <strong>${esc(c._id)}</strong></span></div></article>`).join("") : "<div style='padding:20px'><p class='muted'>No clients found.</p></div>"; } catch (e) { toast(e.message) } }
document.getElementById("addClientBtn")?.addEventListener("click", async () => {
  try {
    const profile = await apiRequest("/users/profile");
    const currentPlan = profile.user?.plan || "free";
    const currentClients = await apiRequest("/clients");
    if (currentPlan === "free" && (currentClients.clients || []).length >= 2) {
      toast("Free plan allows a maximum of 2 clients. Upgrade to Pro for unlimited clients.");
      return;
    }
    const name = prompt("Client name:"); if (!name) return;
    const email = prompt("Client email:"); if (!email) return;
    const company = prompt("Company:", name); const rate = prompt("Default hourly rate (₹):", "1000");
    await apiRequest("/clients", { method: "POST", body: JSON.stringify({ name, email, company, hourlyRate: Number(rate || 0) }) });
    toast("Client created successfully"); loadClients(); loadCounts();
  } catch (e) { toast(e.message) }
});
async function editClient(id) { try { const d = await apiRequest(`/clients/${id}`); const c = d.client; const name = prompt("Client name:", c.name); if (!name) return; const email = prompt("Email:", c.email); if (!email) return; const rate = Number(prompt("Hourly rate (₹):", c.hourlyRate || 0)); await apiRequest(`/clients/${id}`, { method: "PUT", body: JSON.stringify({ name, email, phone: c.phone, company: c.company, notes: c.notes, hourlyRate: rate }) }); toast("Client updated"); loadClients(); } catch (e) { toast(e.message) } }
async function deleteClient(id) { if (!confirm("Delete this client?")) return; try { await apiRequest(`/clients/${id}`, { method: "DELETE" }); toast("Client deleted"); loadClients(); loadCounts(); } catch (e) { toast(e.message) } }
// PROJECTS
const projectGrid = document.getElementById("projectGrid"); let allProjects = [];
async function loadProjects() { if (!projectGrid) return; try { const [d, td] = await Promise.all([apiRequest("/projects"), apiRequest("/time-logs")]); allProjects = d.projects || []; window.ffTimeLogs = td.logs || []; updateProjectCounts(); renderProjects(allProjects); } catch (e) { toast(e.message) } }
function updateProjectCounts() { document.getElementById("allProjectCount")?.replaceChildren(document.createTextNode(allProjects.length)); document.getElementById("activeProjectCount")?.replaceChildren(document.createTextNode(allProjects.filter(p => p.status !== "completed" && p.status !== "cancelled").length)); document.getElementById("completedProjectCount")?.replaceChildren(document.createTextNode(allProjects.filter(p => p.status === "completed").length)); }
function renderProjects(projects) { if (!projectGrid) return; projectGrid.innerHTML = projects.length ? projects.map((p, i) => { const status = p.status || "planning"; const cls = status === "completed" ? "success" : status === "in-progress" ? "warning" : "neutral"; const progress = Math.max(0, Math.min(100, Number(p.progress ?? 50))); const logs = (window.ffTimeLogs || []).filter(l => String(l.project?._id || l.project) === String(p._id)); const used = logs.reduce((a, l) => a + (Number(l.durationMinutes || 0) / 60) * Number(l.client?.hourlyRate || p.client?.hourlyRate || 0), 0); const burn = p.budget ? Math.min(100, (used / Number(p.budget)) * 100) : 0; return `<article class="project-card"><div class="project-cover cover-${(i % 4) + 1}">${esc((p.name || "P").slice(0, 2).toUpperCase())}</div><div class="project-body"><div class="card-row"><span class="badge ${cls}">${esc(status)}</span><button class="more" onclick="editProject('${p._id}')">✎</button> <button class="more" onclick="deleteProject('${p._id}')">🗑</button></div><h3>${esc(p.name)}</h3><p>${esc(p.description || "No description")}</p><div class="client-line"><div class="avatar sm">${esc((p.client?.name || "C").slice(0, 2).toUpperCase())}</div>${esc(p.client?.name || "Client")}</div><div class="progress-row"><div class="progress"><i style="width:${progress}%"></i></div><span>${progress}%</span></div><div class="card-meta"><span>Burn ${burn.toFixed(0)}%</span><strong>₹${Math.round(used).toLocaleString("en-IN")} used</strong></div><div class="card-meta"><span>${p.deadline ? "Due " + new Date(p.deadline).toLocaleDateString("en-IN") : "No deadline"}</span><strong>₹${Number(p.budget || 0).toLocaleString("en-IN")}</strong></div></div></article>` }).join("") : "<div style='padding:20px'><p class='muted'>No projects found.</p></div>"; }
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach(x => x.classList.remove("active")); tab.classList.add("active"); const f = tab.dataset.filter; if (f === "completed") renderProjects(allProjects.filter(p => p.status === "completed")); else if (f === "active") renderProjects(allProjects.filter(p => p.status !== "completed" && p.status !== "cancelled")); else renderProjects(allProjects); }));
document.getElementById("addProjectBtn")?.addEventListener("click", async () => { const name = prompt("Project name:"); if (!name) return; const description = prompt("Description:", ""); const budget = Number(prompt("Budget (₹):", "50000")); if (!Number.isFinite(budget)) return toast("Invalid budget"); try { const c = await apiRequest("/clients"); if (!c.clients.length) return toast("Create a client first"); const options = c.clients.map((x, i) => `${i + 1}. ${x.name} (${x._id})`).join("\n"); const pick = prompt("Choose client number:\n" + options, "1"); const client = c.clients[Number(pick) - 1]; if (!client) return; const status = prompt("Status: planning, in-progress, completed", "planning") || "planning"; const progress = Number(prompt("Progress 0-100:", "50")); await apiRequest("/projects", { method: "POST", body: JSON.stringify({ name, description, client: client._id, budget, status, progress: Number.isFinite(progress) ? progress : 50 }) }); toast("Project created successfully"); loadProjects(); loadCounts(); } catch (e) { toast(e.message) } });
async function editProject(id) { try { const d = await apiRequest(`/projects/${id}`); const p = d.project; const name = prompt("Project name:", p.name); if (!name) return; const description = prompt("Description:", p.description || ""); const budget = Number(prompt("Budget (₹):", p.budget || 0)); const progress = Number(prompt("Progress 0-100:", p.progress ?? 50)); const status = prompt("Status: planning, in-progress, completed, cancelled", p.status || "planning"); await apiRequest(`/projects/${id}`, { method: "PUT", body: JSON.stringify({ name, description, client: p.client?._id || p.client, budget, progress, status, startDate: p.startDate, deadline: p.deadline }) }); toast("Project updated"); loadProjects(); } catch (e) { toast(e.message) } }
async function deleteProject(id) { if (!confirm("Delete this project? Tasks/invoices linked to it may remain, so delete carefully. Continue?")) return; try { await apiRequest(`/projects/${id}`, { method: "DELETE" }); toast("Project deleted"); loadProjects(); loadCounts(); } catch (e) { toast(e.message) } }
// TASKS
const taskBoard = document.getElementById("taskBoard");
async function loadTasks() { if (!taskBoard) return; try { const d = await apiRequest("/tasks"); const tasks = d.tasks || []; const cols = { todo: [], "in-progress": [], completed: [] }; tasks.forEach(t => cols[t.status] ? (cols[t.status].push(t)) : cols.todo.push(t)); taskBoard.innerHTML = [createTaskColumn("To do", cols.todo), createTaskColumn("In progress", cols["in-progress"]), createTaskColumn("Done", cols.completed)].join(""); } catch (e) { toast(e.message) } }
function createTaskColumn(title, tasks) { const statusMap = { "To do": "todo", "In progress": "in-progress", "Done": "completed" }; const status = statusMap[title] || "todo"; return `<div class="task-column"><div class="column-head"><h3>${title} <span>${tasks.length}</span></h3><button type="button" title="Add task to ${title}" onclick="addTaskWithStatus('${status}')">＋</button></div>${tasks.map(t => `<div class="task-card ${t.status === "completed" ? "done" : ""}"><span class="priority ${esc(t.priority || "medium")}">${esc(t.status === "completed" ? "Done" : t.priority || "Medium")}</span><h4>${esc(t.title)}</h4><p>${esc(t.project?.name || t.description || "Project")}</p><div class="task-foot"><span>${t.dueDate ? "Due " + new Date(t.dueDate).toLocaleDateString("en-IN") : "No due date"}</span><button class="more" onclick="editTask('${t._id}')">✎</button> <button class="more" onclick="deleteTask('${t._id}')">🗑</button></div></div>`).join("")}</div>` }
async function addTaskWithStatus(status = "todo") {
  const title = prompt("Task title:");
  if (!title) return;
  const description = prompt("Description:", "");
  try {
    const p = await apiRequest("/projects");
    if (!p.projects.length) return toast("Create a project first");
    const options = p.projects.map((x, i) => `${i + 1}. ${x.name} (${x._id})`).join("\n");
    const pick = prompt(`Choose project for ${status === "todo" ? "To do" : status === "in-progress" ? "In progress" : "Done"}:\n${options}`, "1");
    const project = p.projects[Number(pick) - 1];
    if (!project) return;
    const priority = prompt("Priority: low, medium, high", "medium") || "medium";
    const dueDate = prompt("Due date YYYY-MM-DD:", "");
    await apiRequest("/tasks", { method: "POST", body: JSON.stringify({ title, description, project: project._id, priority, dueDate, status }) });
    toast("Task created"); loadTasks(); loadCounts();
  } catch (e) { toast(e.message) }
}
document.getElementById("addTaskBtn")?.addEventListener("click", async () => { const title = prompt("Task title:"); if (!title) return; const description = prompt("Description:", ""); try { const p = await apiRequest("/projects"); if (!p.projects.length) return toast("Create a project first"); const options = p.projects.map((x, i) => `${i + 1}. ${x.name} (${x._id})`).join("\n"); const pick = prompt("Choose project:\n" + options, "1"); const project = p.projects[Number(pick) - 1]; if (!project) return; const priority = prompt("Priority: low, medium, high", "medium") || "medium"; const dueDate = prompt("Due date YYYY-MM-DD:", ""); await apiRequest("/tasks", { method: "POST", body: JSON.stringify({ title, description, project: project._id, priority, dueDate, status: "todo" }) }); toast("Task created"); loadTasks(); loadCounts(); } catch (e) { toast(e.message) } });
async function editTask(id) { try { const d = await apiRequest(`/tasks/${id}`); const t = d.task; const title = prompt("Task title:", t.title); if (!title) return; const description = prompt("Description:", t.description || ""); const priority = prompt("Priority: low, medium, high", t.priority || "medium"); const statusInput = prompt("Status: todo, in-progress, completed (you can also type in progress or done)", t.status || "todo"); const status = { "in progress": "in-progress", "in_progress": "in-progress", "inprogress": "in-progress", "done": "completed", "complete": "completed", "to do": "todo", "to_do": "todo" }[String(statusInput || "todo").trim().toLowerCase()] || String(statusInput || "todo").trim().toLowerCase(); await apiRequest(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ title, description, project: t.project?._id || t.project, priority, status, dueDate: t.dueDate }) }); toast("Task updated"); loadTasks(); } catch (e) { toast(e.message) } }
async function deleteTask(id) { if (!confirm("Delete task?")) return; try { await apiRequest(`/tasks/${id}`, { method: "DELETE" }); toast("Task deleted"); loadTasks(); loadCounts(); } catch (e) { toast(e.message) } }
// INVOICES
const invoiceTableBody = document.getElementById("invoiceTableBody");
async function loadInvoices() { if (!invoiceTableBody) return; try { const d = await apiRequest("/invoices"); const inv = d.invoices || []; let paid = 0, pending = 0, overdue = 0; inv.forEach(x => { const a = Number(x.amount || 0); if (x.status === "paid") paid += a; else if (x.status === "overdue") overdue += a; else pending += a; }); document.getElementById("paidInvoiceAmount")?.replaceChildren(document.createTextNode("₹" + paid.toLocaleString("en-IN"))); document.getElementById("paidInvoiceCount")?.replaceChildren(document.createTextNode(`${inv.filter(x => x.status === "paid").length} invoices`)); document.getElementById("pendingInvoiceAmount")?.replaceChildren(document.createTextNode("₹" + pending.toLocaleString("en-IN"))); document.getElementById("pendingInvoiceCount")?.replaceChildren(document.createTextNode(`${inv.filter(x => x.status !== "paid" && x.status !== "overdue").length} invoices`)); document.getElementById("overdueInvoiceAmount")?.replaceChildren(document.createTextNode("₹" + overdue.toLocaleString("en-IN"))); document.getElementById("overdueInvoiceCount")?.replaceChildren(document.createTextNode(`${inv.filter(x => x.status === "overdue").length} invoices`)); invoiceTableBody.innerHTML = inv.length ? inv.map(x => `<tr><td><strong>#${esc(x.invoiceNumber)}</strong></td><td>${esc(x.client?.name || "Client")}</td><td>${new Date(x.issueDate).toLocaleDateString("en-IN")}</td><td>${new Date(x.dueDate).toLocaleDateString("en-IN")}</td><td><strong>₹${Number(x.amount || 0).toLocaleString("en-IN")}</strong></td><td><select class="invoice-status" onchange="updateInvoiceStatus('${x._id}',this.value)"><option value="draft" ${x.status === "draft" ? "selected" : ""}>Draft</option><option value="sent" ${x.status === "sent" ? "selected" : ""}>Sent</option><option value="paid" ${x.status === "paid" ? "selected" : ""}>Paid</option><option value="overdue" ${x.status === "overdue" ? "selected" : ""}>Overdue</option></select></td><td><button class="more" onclick="downloadInvoicePDF('${x._id}')">PDF</button> <button class="more" onclick="deleteInvoice('${x._id}')">🗑</button></td></tr>`).join("") : "<tr><td colspan='7'><p class='muted'>No invoices found.</p></td></tr>"; } catch (e) { toast(e.message) } }
document.getElementById("createInvoiceBtn")?.addEventListener("click", async () => { try { const c = await apiRequest("/clients"); const p = await apiRequest("/projects"); if (!c.clients.length || !p.projects.length) return toast("Create a client and project first"); const client = c.clients[Number(prompt("Choose client number:\n" + c.clients.map((x, i) => `${i + 1}. ${x.name}`).join("\n"), "1")) - 1]; if (!client) return; const related = p.projects.filter(x => String(x.client?._id || x.client) === String(client._id)); if (!related.length) return toast("No project for this client"); const project = related[Number(prompt("Choose project:\n" + related.map((x, i) => `${i + 1}. ${x.name}`).join("\n"), "1")) - 1]; if (!project) return; const num = prompt("Invoice number:", `INV-${Date.now()}`); if (!num) return; const due = prompt("Due date YYYY-MM-DD:", "2026-09-30"); const from = prompt("Start date YYYY-MM-DD (optional):", ""); const to = prompt("End date YYYY-MM-DD (optional):", ""); const logs = await apiRequest(`/time-logs?client=${client._id}&project=${project._id}&unbilled=true${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`); if (logs.logs?.length) { const use = confirm(`Found ${logs.logs.length} unbilled log(s). Generate invoice from tracked time?`); if (use) { const r = await apiRequest("/invoices/from-time", { method: "POST", body: JSON.stringify({ invoiceNumber: num, client: client._id, project: project._id, dueDate: due, from, to }) }); toast(`Invoice generated: ${r.hours.toFixed(2)}h × ₹${r.rate}`); loadInvoices(); return; } } const amount = Number(prompt("Invoice amount (₹):", "0")); if (!Number.isFinite(amount)) return; await apiRequest("/invoices", { method: "POST", body: JSON.stringify({ invoiceNumber: num, client: client._id, project: project._id, amount, status: "sent", dueDate: due }) }); toast("Invoice created"); loadInvoices(); } catch (e) { toast(e.message) } });
async function updateInvoiceStatus(id, status) { try { await apiRequest(`/invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); toast(`Invoice marked ${status}`); loadInvoices(); } catch (e) { toast(e.message); loadInvoices(); } }
async function deleteInvoice(id) { if (!confirm("Delete invoice?")) return; try { await apiRequest(`/invoices/${id}`, { method: "DELETE" }); toast("Invoice deleted"); loadInvoices(); } catch (e) { toast(e.message) } }
async function downloadInvoicePDF(id) { try { const profile = await apiRequest("/users/profile"); if (profile.user?.plan !== "pro") { toast("PDF invoicing is a Pro feature. Upgrade your workspace first."); return; } const r = await fetch(`${API_BASE_URL}/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } }); if (!r.ok) { let msg = "Could not generate PDF"; try { const d = await r.json(); msg = d.message || msg; } catch { } throw Error(msg); } const blob = await r.blob(); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "FreelanceFlow-Invoice.pdf"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); } catch (e) { toast(e.message) } }
// TIME TRACKING
const timeLogBody = document.getElementById("timeLogBody"); let projectsCache = []; let runningTimer = null; let timerInterval = null;
async function loadTimePage() { if (!timeLogBody) return; try { const p = await apiRequest("/projects"); projectsCache = p.projects || []; const sel = document.getElementById("timerProject"); if (sel) sel.innerHTML = '<option value="">Select project</option>' + projectsCache.map(x => `<option value="${x._id}">${esc(x.name)} — ${esc(x.client?.name || "Client")}</option>`).join(""); const d = await apiRequest("/time-logs"); renderTimeLogs(d.logs || []); const mins = (d.logs || []).reduce((a, x) => a + Number(x.durationMinutes || 0), 0), un = (d.logs || []).filter(x => !x.billed).reduce((a, x) => a + Number(x.durationMinutes || 0), 0), value = (d.logs || []).filter(x => !x.billed).reduce((a, x) => a + (Number(x.durationMinutes || 0) / 60) * Number(x.client?.hourlyRate || 0), 0); const totalText = mins < 1 ? `${Math.round(mins * 60)}s` : `${(mins / 60).toFixed(2)}h`; const unbilledText = un < 1 ? `${Math.round(un * 60)}s` : `${(un / 60).toFixed(2)}h`; document.getElementById("totalHours")?.replaceChildren(document.createTextNode(totalText)); document.getElementById("unbilledHours")?.replaceChildren(document.createTextNode(unbilledText)); document.getElementById("billableValue")?.replaceChildren(document.createTextNode("₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 2 }))); restoreTimer(); } catch (e) { toast(e.message) } }
function formatDuration(l) { const sec = Math.max(0, Math.round(Number(l.durationSeconds ?? (Number(l.durationMinutes || 0) * 60)))); if (sec < 60) return `${sec}s`; const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; if (h) return `${h}h ${m}m`; return s ? `${m}m ${s}s` : `${m}m`; }
function renderTimeLogs(logs) { if (!timeLogBody) return; timeLogBody.innerHTML = logs.length ? logs.map(l => `<tr><td>${esc(l.project?.name || "Project")}</td><td>${esc(l.client?.name || "Client")}</td><td>${new Date(l.startTime).toLocaleDateString("en-IN")}</td><td>${formatDuration(l)} <small class="muted">(${(Number(l.durationMinutes || 0) / 60).toFixed(2)}h)</small></td><td>₹${((Number(l.durationMinutes || 0) / 60) * Number(l.client?.hourlyRate || 0)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td><span class="badge ${l.billed ? "success" : "warning"}">${l.billed ? "Billed" : "Unbilled"}</span></td><td>${l.billed ? "" : `<button class="more" onclick="deleteTimeLog('${l._id}')">🗑</button>`}</td></tr>`).join("") : "<tr><td colspan='7'><p class='muted'>No time logs found.</p></td></tr>"; }
function showTimer() { const d = document.getElementById("timerDisplay"), start = runningTimer?.startTime; if (!d || !start) return; const ms = Math.max(0, Date.now() - new Date(start).getTime()); const sec = Math.floor(ms / 1000), h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; d.textContent = [h, m, s].map((x, i) => String(x).padStart(i ? 2 : 2, "0")).join(":"); document.getElementById("timerStatus") && (document.getElementById("timerStatus").textContent = "Running"); }
function startTimerClock() { clearInterval(timerInterval); timerInterval = setInterval(showTimer, 1000); showTimer(); }
async function restoreTimer() { const saved = localStorage.getItem("ff-running-timer"); if (!saved) return; try { const id = JSON.parse(saved).id; const d = await apiRequest("/time-logs"); const log = (d.logs || []).find(x => x._id === id && !x.endTime); if (log) { runningTimer = log; startTimerClock(); document.getElementById("startTimerBtn")?.setAttribute("disabled", "disabled"); document.getElementById("stopTimerBtn")?.removeAttribute("disabled"); document.getElementById("timerProject") && (document.getElementById("timerProject").value = log.project?._id || log.project); } } catch { localStorage.removeItem("ff-running-timer") } }
document.getElementById("startTimerBtn")?.addEventListener("click", async () => { try { const project = document.getElementById("timerProject").value; if (!project) return toast("Select a project"); const p = projectsCache.find(x => x._id === project); const r = await apiRequest("/time-logs/start", { method: "POST", body: JSON.stringify({ project, client: p.client?._id || p.client, description: document.getElementById("timerDescription").value }) }); runningTimer = r.log; localStorage.setItem("ff-running-timer", JSON.stringify({ id: r.log._id, startTime: r.log.startTime })); startTimerClock(); document.getElementById("startTimerBtn").disabled = true; document.getElementById("stopTimerBtn").disabled = false; toast("Timer started"); } catch (e) { toast(e.message) } });
document.getElementById("stopTimerBtn")?.addEventListener("click", async () => { if (!runningTimer) return; try { await apiRequest(`/time-logs/stop/${runningTimer._id}`, { method: "POST" }); runningTimer = null; localStorage.removeItem("ff-running-timer"); clearInterval(timerInterval); document.getElementById("timerDisplay").textContent = "00:00:00"; document.getElementById("timerStatus").textContent = "Not running"; document.getElementById("startTimerBtn").disabled = false; document.getElementById("stopTimerBtn").disabled = true; toast("Timer stopped"); loadTimePage(); } catch (e) { toast(e.message) } });
document.getElementById("manualTimeBtn")?.addEventListener("click", async () => { try { const p = projectsCache.length ? projectsCache : ((await apiRequest("/projects")).projects || []); if (!p.length) return toast("Create a project first"); const project = p[Number(prompt("Choose project:\n" + p.map((x, i) => `${i + 1}. ${x.name}`).join("\n"), "1")) - 1]; if (!project) return; const hours = Number(prompt("Hours worked:", "2")); const date = prompt("Date YYYY-MM-DD:", new Date().toISOString().slice(0, 10)); const description = prompt("Description:", ""); await apiRequest("/time-logs/manual", { method: "POST", body: JSON.stringify({ project: project._id, client: project.client?._id || project.client, hours, date, description }) }); toast("Manual time added"); loadTimePage(); } catch (e) { toast(e.message) } });
async function deleteTimeLog(id) { if (!confirm("Delete this unbilled time log?")) return; try { await apiRequest(`/time-logs/${id}`, { method: "DELETE" }); toast("Time log deleted"); loadTimePage(); } catch (e) { toast(e.message) } }
// SETTINGS
async function loadProfile() { if (!document.getElementById("profileName")) return; try { const d = await apiRequest("/users/profile"); const u = d.user; const planDescription = document.getElementById("planDescription"); if (planDescription) planDescription.textContent = u.plan === "pro" ? "Pro plan • Unlimited clients + PDF invoicing" : "Free plan • Up to 2 clients"; const upgradeBtn = document.getElementById("settingsUpgradeBtn"); if (upgradeBtn) upgradeBtn.textContent = u.plan === "pro" ? "Pro active" : "Upgrade to Pro"; document.getElementById("profileName").value = u.name || ""; document.getElementById("profileEmail").value = u.email || ""; const initials = (u.name || "FF").split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();["profileAvatar", "sideAvatar", "topAvatar"].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = initials }); const n = document.getElementById("sideName"), em = document.getElementById("sideEmail"); if (n) n.textContent = u.name; if (em) em.textContent = u.email; } catch (e) { toast(e.message) } }
document.getElementById("saveProfileBtn")?.addEventListener("click", async () => { try { const name = document.getElementById("profileName").value.trim(), email = document.getElementById("profileEmail").value.trim(); await apiRequest("/users/profile", { method: "PUT", body: JSON.stringify({ name, email }) }); toast("Profile saved successfully"); loadProfile(); } catch (e) { toast(e.message) } }); document.getElementById("logoutBtn")?.addEventListener("click", logout); document.getElementById("changePhotoBtn")?.addEventListener("click", () => toast("Profile photo upload is optional in this version; your initials are used automatically.")); document.getElementById("settingsUpgradeBtn")?.addEventListener("click", async () => { try { const p = await apiRequest("/users/profile"); if (p.user?.plan === "pro") { toast("Pro is already active"); return; } const r = await apiRequest("/users/upgrade", { method: "POST" }); toast(r.message); loadProfile(); } catch (e) { toast(e.message) } });
// DASHBOARD
async function loadDashboard() {
  const dashboardProjects = document.getElementById("dashboardProjects");
  if (!dashboardProjects) return;
  try {
    const [pd, id, td] = await Promise.all([apiRequest("/projects"), apiRequest("/invoices"), apiRequest("/tasks")]);
    const projects = pd.projects || [], invoices = id.invoices || [], tasks = td.tasks || [];
    const norm = s => String(s || "").toLowerCase();

    // Sidebar + summary cards
    const activeProjects = projects.filter(p => !['completed', 'cancelled', 'archived'].includes(norm(p.status)));
    document.getElementById("activeProjects")?.replaceChildren(document.createTextNode(String(activeProjects.length)));
    document.getElementById("pendingTasks")?.replaceChildren(document.createTextNode(String(tasks.filter(t => norm(t.status) !== 'completed').length)));

    const earnings = invoices.filter(i => norm(i.status) === 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
    const outstanding = invoices.filter(i => norm(i.status) !== 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
    document.getElementById("totalEarnings")?.replaceChildren(document.createTextNode("₹" + earnings.toLocaleString("en-IN")));
    document.getElementById("outstandingAmount")?.replaceChildren(document.createTextNode("₹" + outstanding.toLocaleString("en-IN")));

    renderRevenueChart(invoices);

    // Active projects table
    if (!activeProjects.length) {
      dashboardProjects.innerHTML = `<tr><td colspan="6"><p class="muted">No active projects found.</p></td></tr>`;
    } else {
      dashboardProjects.innerHTML = activeProjects.slice(0, 6).map(p => {
        const progress = Math.max(0, Math.min(100, Number(p.progress ?? 50)));
        const status = norm(p.status);
        const badge = status === 'in-progress' ? 'warning' : 'neutral';
        return `<tr>
          <td><strong>${esc(p.name || 'Untitled Project')}</strong><small>${esc(p.description || '')}</small></td>
          <td>${esc(p.client?.name || 'Client')}</td>
          <td>${p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN') : '-'}</td>
          <td><div class="progress-row"><div class="progress"><i style="width:${progress}%"></i></div><span>${progress}%</span></div></td>
          <td><span class="badge ${badge}">${esc(p.status || 'planning')}</span></td>
          <td></td>
        </tr>`;
      }).join('');
    }

    // Upcoming deadlines: only future/current active projects
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const upcoming = activeProjects.filter(p => p.deadline && new Date(p.deadline) >= now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4);
    const dl = document.getElementById('deadlineList');
    if (dl) {
      dl.innerHTML = upcoming.length ? upcoming.map((p, i) => {
        const dots = ['purple', 'orange', 'blue', 'green'];
        return `<div class="deadline"><span class="dot ${dots[i % dots.length]}"></span><div><strong>${esc(p.name || 'Untitled Project')}</strong><small>${esc(p.client?.name || 'Client')}</small></div><time>${new Date(p.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</time></div>`;
      }).join('') : '<p class="muted">No upcoming deadlines.</p>';
    }
  } catch (e) {
    console.error('Dashboard error:', e);
    toast(e.message);
  }
}
function formatCompactINR(value) {
  value = Number(value || 0);
  if (value >= 10000000) return "₹" + (value / 10000000).toFixed(value % 10000000 === 0 ? 0 : 1) + "Cr";
  if (value >= 100000) return "₹" + (value / 100000).toFixed(value % 100000 === 0 ? 0 : 1) + "L";
  if (value >= 1000) return "₹" + (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + "k";
  return "₹" + Math.round(value);
}
function niceChartMax(value) {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * Math.pow(10, exponent);
}
function renderRevenueChart(invoices) {
  const bars = document.querySelector('.bars');
  const yAxis = document.getElementById('revenueYAxis');
  if (!bars) return;
  const months = []; const now = new Date();
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ label: d.toLocaleString('en-IN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), value: 0 }); }
  invoices.filter(x => String(x.status || '').toLowerCase() === 'paid').forEach(x => {
    const d = new Date(x.issueDate || x.createdAt);
    const m = months.find(z => z.year === d.getFullYear() && z.month === d.getMonth());
    if (m) m.value += Number(x.amount || 0);
  });

  // Keep the Y-axis and bar heights on the same scale.
  // Previously the axis was hard-coded to ₹1.5L while bars were scaled to the
  // current maximum, which made a ₹42.78 invoice look like a huge ₹1L+ bar.
  const dataMax = Math.max(...months.map(x => x.value), 0);
  const scaleMax = niceChartMax(dataMax);
  if (yAxis) {
    const step = scaleMax / 3;
    yAxis.innerHTML = [scaleMax, step * 2, step, 0].map(v => `<span>${formatCompactINR(v)}</span>`).join('');
  }
  bars.innerHTML = months.map(m => {
    const height = m.value > 0 ? Math.max(4, (m.value / scaleMax) * 84) : 0;
    return `<div class="bar-col"><div class="bar ${m.month === now.getMonth() && m.year === now.getFullYear() ? 'current' : ''}" style="height:${height}%" title="₹${m.value.toLocaleString('en-IN')}"></div><span>${m.label}</span></div>`;
  }).join('');
}

document.getElementById("loadSampleBtn")?.addEventListener("click", async () => { if (!confirm("Load sample clients, projects, tasks, time logs and invoices into an empty workspace?")) return; try { const r = await apiRequest("/sample-data/load", { method: "POST" }); toast(r.message); loadDashboard(); loadCounts(); } catch (e) { toast(e.message) } });
document.getElementById("dashboardNewProjectBtn")?.addEventListener("click", () => location.href = "projects.html");
document.querySelectorAll(".upgrade-card .btn-light").forEach(btn => btn.addEventListener("click", async () => { try { const r = await apiRequest("/users/upgrade", { method: "POST" }); toast(r.message + " — Pro features are now unlocked."); setTimeout(() => location.reload(), 500); } catch (e) { toast(e.message) } }));

// initial
loadCounts(); loadClients(); loadProjects(); loadTasks(); loadInvoices(); loadDashboard(); loadTimePage(); loadProfile();
