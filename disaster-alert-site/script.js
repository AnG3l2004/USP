
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------
  // Demo data (Varna/Sofia/Plovdiv/Burgas)
  // ---------------------------
  const LEVELS = /** @type {const} */ (["low", "medium", "high", "critical"]);

  /** @param {"low"|"medium"|"high"|"critical"} level */
  function levelLabel(level) {
    return (
      level === "low" ? "Ниско" :
      level === "medium" ? "Средно" :
      level === "high" ? "Високо" :
      "Критично"
    );
  }

  /** @param {string} type */
  function typeLabel(type) {
    switch (type) {
      case "earthquake": return "Земетресение";
      case "flood": return "Наводнение";
      case "fire": return "Пожар";
      case "storm": return "Буря";
      default: return "Друго";
    }
  }

  /** @param {string} region */
  function regionPillClass(region) {
    const map = {
      Sofia: "pill--sofia",
      Varna: "pill--varna",
      Plovdiv: "pill--plovdiv",
      Burgas: "pill--burgas",
    };
    return map[region] || "";
  }

  /** @param {"low"|"medium"|"high"|"critical"} level */
  function badgeClass(level) {
    return (
      level === "low" ? "badge--low" :
      level === "medium" ? "badge--medium" :
      level === "high" ? "badge--high" :
      "badge--critical"
    );
  }

  /** @param {Date} d */
  function fmtTime(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function nowMinus(mins) {
    return new Date(Date.now() - mins * 60 * 1000);
  }

  const disasters = [
    {
      id: "evt-001",
      type: "flood",
      time: nowMinus(85),
      place: "кв. Аспарухово",
      region: "Varna",
      damage: "средни",
      duration: "3ч",
      level: "high",
      status: "active",
      notes: "Преливане в ниските части; ограничен достъп до няколко улици.",
    },
    {
      id: "evt-002",
      type: "storm",
      time: nowMinus(190),
      place: "кв. Младост",
      region: "Sofia",
      damage: "леки",
      duration: "1ч 20м",
      level: "medium",
      status: "active",
      notes: "Поривист вятър и локални паднали клони; възможно прекъсване на ток.",
    },
    {
      id: "evt-003",
      type: "earthquake",
      time: nowMinus(520),
      place: "район Център",
      region: "Plovdiv",
      damage: "няма данни",
      duration: "кратко",
      level: "low",
      status: "contained",
      notes: "Слаб трус; препоръчва се проверка на мебели/електроуреди.",
    },
    {
      id: "evt-004",
      type: "fire",
      time: nowMinus(55),
      place: "крайморска зона",
      region: "Burgas",
      damage: "високи",
      duration: "в развитие",
      level: "critical",
      status: "active",
      notes: "Дим в периферни райони; възможна евакуация при промяна на вятъра.",
    },
    {
      id: "evt-005",
      type: "other",
      time: nowMinus(860),
      place: "централна част",
      region: "Sofia",
      damage: "няма",
      duration: "6ч",
      level: "medium",
      status: "resolved",
      notes: "Сигнал за силна мъгла/намалена видимост; повишено внимание при шофиране.",
    },
  ];

  const alerts = [
    {
      id: "al-1001",
      time: nowMinus(40),
      region: "Burgas",
      type: "fire",
      level: "critical",
      title: "Критично: пожар — възможна евакуация",
      body: "Следвайте указанията на местните власти. Подгответе документи и лекарства.",
      status: "sent",
    },
    {
      id: "al-1002",
      time: nowMinus(90),
      region: "Varna",
      type: "flood",
      level: "high",
      title: "Високо: риск от наводнение",
      body: "Избягвайте ниските части. Не преминавайте през вода. Проверете електричеството.",
      status: "sent",
    },
    {
      id: "al-1003",
      time: nowMinus(210),
      region: "Sofia",
      type: "storm",
      level: "medium",
      title: "Средно: силен вятър и локални проблеми",
      body: "Стойте далеч от дървета и стълбове. Възможни прекъсвания на ток.",
      status: "sent",
    },
    {
      id: "al-1004",
      time: nowMinus(560),
      region: "Plovdiv",
      type: "earthquake",
      level: "low",
      title: "Ниско: слаб трус — проверете безопасността",
      body: "Проверете за паднали предмети и изтичане на газ. Следвайте официални инструкции.",
      status: "sent",
    },
    {
      id: "al-1005",
      time: nowMinus(30),
      region: "all",
      type: "other",
      level: "medium",
      title: "Инфо: проверете план за безопасност",
      body: "Дръжте фенер, вода и заредено устройство. Запазете спешните контакти.",
      status: "scheduled",
    },
  ];

  /** @type {Array<{ id:string, name:string, email:string, region:"Sofia"|"Varna"|"Plovdiv"|"Burgas", role:"user"|"operator"|"admin", status:"active"|"blocked", activity:string }>} */
  const users = [
    { id: "u-01", name: "Иван Петров", email: "ivan.petrov@example.com", region: "Sofia", role: "user", status: "active", activity: "преди 2ч" },
    { id: "u-02", name: "Мария Георгиева", email: "maria.g@example.com", region: "Varna", role: "user", status: "active", activity: "преди 18м" },
    { id: "u-03", name: "Петър Димитров", email: "p.dimitrov@example.com", region: "Plovdiv", role: "operator", status: "active", activity: "преди 6м" },
    { id: "u-04", name: "Елица Стоянова", email: "elitsa.s@example.com", region: "Burgas", role: "user", status: "blocked", activity: "преди 12д" },
    { id: "u-05", name: "Admin Operator", email: "admin@disasteralert.bg", region: "Sofia", role: "admin", status: "active", activity: "сега" },
  ];

  /** @type {Array<{ id:string, city:"Sofia"|"Varna"|"Plovdiv"|"Burgas", category:"affected"|"safe"|"shelter"|"risk", name:string, note:string }>} */
  const regions = [
    { id: "r-01", city: "Varna", category: "affected", name: "кв. Аспарухово — ниски части", note: "Възможни заливания при интензивни валежи." },
    { id: "r-02", city: "Burgas", category: "risk", name: "Крайморска зона — вятър/дим", note: "Риск от бързо разпространение при пориви." },
    { id: "r-03", city: "Sofia", category: "safe", name: "Открита зона — парк (пример)", note: "Подходяща за сборен пункт при евакуация." },
    { id: "r-04", city: "Plovdiv", category: "shelter", name: "Спортна зала (пример)", note: "Временно настаняване при нужда." },
    { id: "r-05", city: "Sofia", category: "risk", name: "Подлез (пример)", note: "Риск от заливане при проливен дъжд." },
  ];

  function ensureToastHost() {
    let host = $("#toastHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "toastHost";
    host.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:999",
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "max-width:min(420px, calc(100% - 32px))",
    ].join(";");
    document.body.appendChild(host);
    return host;
  }

  /** @param {{title:string, message:string, tone?:"info"|"ok"|"warn"|"danger"}} opts */
  function toast(opts) {
    const host = ensureToastHost();
    const el = document.createElement("div");
    const tone = opts.tone || "info";
    const border =
      tone === "ok" ? "rgba(25,195,125,0.35)" :
      tone === "warn" ? "rgba(255,138,0,0.40)" :
      tone === "danger" ? "rgba(255,59,48,0.45)" :
      "rgba(47,123,255,0.35)";
    const bg =
      tone === "ok" ? "rgba(25,195,125,0.12)" :
      tone === "warn" ? "rgba(255,138,0,0.12)" :
      tone === "danger" ? "rgba(255,59,48,0.12)" :
      "rgba(47,123,255,0.12)";

    el.style.cssText = [
      "border-radius:16px",
      `border:1px solid ${border}`,
      `background:${bg}`,
      "backdrop-filter: blur(10px)",
      "padding:12px 12px",
      "color: rgba(255,255,255,0.92)",
      "box-shadow: 0 16px 46px rgba(0,0,0,0.35)",
    ].join(";");

    el.innerHTML = `
      <div style="display:flex; justify-content: space-between; gap:10px; align-items:flex-start;">
        <div>
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px;">${escapeHtml(opts.title)}</div>
          <div style="color: rgba(234,240,255,0.80); font-size: 12px; line-height:1.35;">${escapeHtml(opts.message)}</div>
        </div>
        <button style="all:unset; cursor:pointer; padding:6px 8px; border-radius: 10px; border:1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.04); font-size: 12px;">
          OK
        </button>
      </div>
    `;
    el.querySelector("button").addEventListener("click", () => el.remove());
    host.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // Modal handling (shared)
  // ---------------------------
  function setupModals() {
    // Open
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-modal]");
      if (!btn) return;
      const id = btn.getAttribute("data-open-modal");
      const modal = id ? document.getElementById(id) : null;
      if (!modal) return;
      openModal(modal);
    });

    // Close
    document.addEventListener("click", (e) => {
      const close = e.target.closest("[data-close-modal]");
      if (!close) return;
      const modal = e.target.closest(".modal");
      if (!modal) return;
      closeModal(modal);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const open = $(".modal.is-open");
      if (open) closeModal(open);
    });
  }

  /** @param {HTMLElement|null} modal */
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("is-open");
    // basic focus
    const focusable = modal.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (focusable) focusable.focus({ preventScroll: true });
  }
  /** @param {HTMLElement|null} modal */
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
  }

  // ---------------------------
  // User UI: section navigation
  // ---------------------------
  function setupUserNav() {
    const navLinks = $$("[data-nav]");
    const sections = $$("[data-section]");
    if (navLinks.length === 0 || sections.length === 0) return;

    const setActive = (key) => {
      sections.forEach((s) => s.classList.toggle("is-active", s.getAttribute("data-section") === key));
      navLinks.forEach((a) => {
        const isCur = a.getAttribute("data-nav") === key;
        if (isCur) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });

      // Update hash without fighting the browser
      try { history.replaceState(null, "", `#${key}`); } catch (_) {}
    };

    const fromHash = () => {
      const h = (location.hash || "").replace("#", "").trim();
      const key = h || "home";
      const exists = sections.some((s) => s.getAttribute("data-section") === key);
      setActive(exists ? key : "home");
    };

    navLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setActive(a.getAttribute("data-nav"));
      });
    });

    document.addEventListener("click", (e) => {
      const j = e.target.closest("[data-nav-jump]");
      if (!j) return;
      const key = j.getAttribute("data-nav-jump");
      if (!key) return;
      setActive(key);
      if (j.hasAttribute("data-close-on-jump")) {
        const modal = j.closest(".modal");
        if (modal) closeModal(modal);
      }
    });

    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  // ---------------------------
  // Admin UI: section navigation
  // ---------------------------
  function setupAdminNav() {
    const navLinks = $$("[data-admin-nav]");
    const sections = $$("[data-admin-section]");
    if (navLinks.length === 0 || sections.length === 0) return;

    const titles = {
      adash: ["Dashboard", "Активни бедствия, известия, статистика и мониторинг."],
      adis: ["Управление на бедствия", "Добавяне, редактиране, изтриване и история."],
      aalerts: ["Управление на известия", "Изпращане, Push, по региони и история."],
      ausers: ["Управление на потребители", "Роли, блокиране и активност (демо)."],
      aanalytics: ["Статистика и анализи", "Графики и справки (демо)."],
      amap: ["Карти и региони", "Зони и обекти (демо)."],
      asystem: ["Система и настройки", "API, backup и логове (демо)."],
      aprofile: ["Админ профил", "Настройки, сигурност и изход."],
    };

    const setActive = (key) => {
      sections.forEach((s) => s.classList.toggle("is-active", s.getAttribute("data-admin-section") === key));
      navLinks.forEach((a) => {
        const isCur = a.getAttribute("data-admin-nav") === key;
        if (isCur) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      const t = titles[key];
      if (t) {
        const title = $("#adminTitle");
        const sub = $("#adminSubtitle");
        if (title) title.textContent = t[0];
        if (sub) sub.textContent = t[1];
      }
      try { history.replaceState(null, "", `#${key}`); } catch (_) {}
    };

    const fromHash = () => {
      const h = (location.hash || "").replace("#", "").trim();
      const key = h || "adash";
      const exists = sections.some((s) => s.getAttribute("data-admin-section") === key);
      setActive(exists ? key : "adash");
    };

    navLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setActive(a.getAttribute("data-admin-nav"));
      });
    });

    document.addEventListener("click", (e) => {
      const j = e.target.closest("[data-admin-jump]");
      if (!j) return;
      const key = j.getAttribute("data-admin-jump");
      if (!key) return;
      setActive(key);
    });

    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  // ---------------------------
  // Render helpers (user/admin)
  // ---------------------------
  function renderUserHome() {
    const latestBody = $("#homeLatestTable");
    if (latestBody) {
      const rows = alerts
        .slice()
        .sort((a, b) => b.time - a.time)
        .slice(0, 5)
        .map((a) => `
          <tr>
            <td>${fmtTime(a.time)}</td>
            <td>${a.region === "all" ? "Всички" : a.region}</td>
            <td>${typeLabel(a.type)}</td>
            <td><span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span></td>
            <td>${a.status === "sent" ? "Изпратено" : "Планирано"}</td>
          </tr>
        `)
        .join("");
      latestBody.innerHTML = rows;
    }

    const worst = disasters
      .filter((d) => d.status === "active")
      .slice()
      .sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level));

    const worstBadge = $("#homeWorstBadge");
    if (worstBadge) {
      const lv = worst[0]?.level || "low";
      worstBadge.className = `badge ${badgeClass(lv)}`;
      worstBadge.textContent = levelLabel(lv);
    }

    const worstList = $("#homeWorstList");
    if (worstList) {
      worstList.innerHTML = worst.slice(0, 3).map((d) => `
        <div class="list__item">
          <div>
            <strong>${typeLabel(d.type)} • ${d.region}</strong>
            <span>${fmtTime(d.time)} • ${d.place}</span>
          </div>
          <span class="badge ${badgeClass(d.level)}">${levelLabel(d.level)}</span>
        </div>
      `).join("") || `<div class="list__item"><div><strong>Няма активни събития</strong><span>Системата не отчита риск.</span></div><span class="badge badge--low">Ниско</span></div>`;
    }
  }

  function getUserFilters() {
    const region = $("#regionSelect")?.value || "all";
    const type = $("#typeSelect")?.value || "all";
    const push = $("#pushToggle")?.value || "on";
    return { region, type, push };
  }

  function renderUserAlerts() {
    const { region, type } = getUserFilters();

    const activeList = $("#alertsActiveList");
    if (activeList) {
      const active = alerts
        .filter((a) => a.status === "sent")
        .filter((a) => ["high", "critical"].includes(a.level))
        .slice()
        .sort((a, b) => b.time - a.time)
        .slice(0, 6);

      activeList.innerHTML = active.map((a) => `
        <div class="list__item">
          <div>
            <strong>${a.title}</strong>
            <span>${fmtTime(a.time)} • ${(a.region === "all" ? "Всички" : a.region)} • ${typeLabel(a.type)}</span>
          </div>
          <span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span>
        </div>
      `).join("") || `<div class="list__item"><div><strong>Няма активни предупреждения</strong><span>Всичко е спокойно за избраните филтри.</span></div><span class="badge badge--low">Ниско</span></div>`;
    }

    const filtered = alerts
      .slice()
      .sort((a, b) => b.time - a.time)
      .filter((a) => region === "all" ? true : (a.region === "all" || a.region === region))
      .filter((a) => type === "all" ? true : a.type === type);

    const allTbody = $("#alertsAllTable");
    if (allTbody) {
      allTbody.innerHTML = filtered.map((a) => `
        <tr>
          <td>${a.id}</td>
          <td>${fmtTime(a.time)}</td>
          <td>${a.region === "all" ? "Всички" : a.region}</td>
          <td>${typeLabel(a.type)}</td>
          <td><span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span></td>
          <td>${escapeHtml(a.title)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn--sm" data-open-alert="${a.id}">Виж повече</button>
              <button class="btn btn--sm btn--primary" data-quick-subscribe>Получавай известия</button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    const hist = $("#alertsHistoryList");
    if (hist) {
      const items = filtered.slice(0, 8);
      hist.innerHTML = items.map((a) => `
        <div class="list__item">
          <div>
            <strong>${a.status === "sent" ? "Изпратено" : "Планирано"} • ${a.title}</strong>
            <span>${fmtTime(a.time)} • ${(a.region === "all" ? "Всички" : a.region)} • ${levelLabel(a.level)}</span>
          </div>
          <button class="btn btn--sm" data-open-alert="${a.id}">Отвори</button>
        </div>
      `).join("");
    }

    // Home modal list ("active events")
    const modalList = $("#activeEventsModalList");
    if (modalList) {
      const activeDis = disasters.filter((d) => d.status === "active").slice().sort((a, b) => b.time - a.time);
      modalList.innerHTML = activeDis.map((d) => `
        <div class="list__item">
          <div>
            <strong>${typeLabel(d.type)} • ${d.region}</strong>
            <span>${fmtTime(d.time)} • ${d.place}</span>
          </div>
          <span class="badge ${badgeClass(d.level)}">${levelLabel(d.level)}</span>
        </div>
      `).join("") || `<div class="list__item"><div><strong>Няма активни бедствия</strong><span>Няма регистрирани инциденти.</span></div><span class="badge badge--low">Ниско</span></div>`;
    }
  }

  function renderUserMap() {
    const list = $("#mapObjectsList");
    if (!list) return;

    const city = $("#mapCity")?.value || "all";
    const cat = $("#mapCat")?.value || "all";

    const catLabel = (c) => (
      c === "affected" ? "Засегнат район" :
      c === "risk" ? "Рискова зона" :
      c === "safe" ? "Безопасна зона" :
      "Убежище"
    );

    const filtered = regions
      .filter((r) => city === "all" ? true : r.city === city)
      .filter((r) => cat === "all" ? true : r.category === cat);

    list.innerHTML = filtered.map((r) => `
      <div class="list__item">
        <div>
          <strong>${r.name}</strong>
          <span>${r.city} • ${catLabel(r.category)} • ${r.note}</span>
        </div>
        <span class="badge">${catLabel(r.category)}</span>
      </div>
    `).join("") || `<div class="list__item"><div><strong>Няма резултати</strong><span>Промени филтрите за град/категория.</span></div><span class="badge">—</span></div>`;
  }

  function renderUserStats() {
    const byType = new Map();
    for (const a of alerts) {
      byType.set(a.type, (byType.get(a.type) || 0) + 1);
    }
    const typesBody = $("#statsTopTypes");
    if (typesBody) {
      const rows = Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `
          <tr>
            <td>${typeLabel(t)}</td>
            <td>${c}</td>
            <td>${(c / 12).toFixed(1)}</td>
          </tr>
        `).join("");
      typesBody.innerHTML = rows;
    }

    const byReg = new Map();
    for (const d of disasters) {
      const r = d.region;
      const cur = byReg.get(r) || { count: 0, max: "low" };
      cur.count += 1;
      if (LEVELS.indexOf(d.level) > LEVELS.indexOf(cur.max)) cur.max = d.level;
      byReg.set(r, cur);
    }

    const regBody = $("#statsByRegion");
    if (regBody) {
      regBody.innerHTML = Array.from(byReg.entries()).map(([r, v]) => `
        <tr>
          <td>${r}</td>
          <td>${v.count}</td>
          <td><span class="badge ${badgeClass(v.max)}">${levelLabel(v.max)}</span></td>
        </tr>
      `).join("");
    }

    drawMonthlyChart($("#userStatsChart"), buildMonthlySeries());
  }

  function renderUserProfile() {
    const list = $("#profileHistoryList");
    if (!list) return;
    const items = alerts.slice().sort((a, b) => b.time - a.time).slice(0, 6);
    list.innerHTML = items.map((a) => `
      <div class="list__item">
        <div>
          <strong>Получено: ${a.title}</strong>
          <span>${fmtTime(a.time)} • ${(a.region === "all" ? "Всички" : a.region)}</span>
        </div>
        <span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span>
      </div>
    `).join("");
  }

  // ---------------------------
  // Admin renders
  // ---------------------------
  function renderAdminDashboard() {
    const activeDis = disasters.filter((d) => d.status === "active");
    const activeAl = alerts.filter((a) => a.status === "sent");
    const critical = [
      ...activeDis.filter((d) => d.level === "critical"),
      ...activeAl.filter((a) => a.level === "critical"),
    ];

    $("#kpiActiveDisasters") && ($("#kpiActiveDisasters").textContent = String(activeDis.length));
    $("#kpiActiveAlerts") && ($("#kpiActiveAlerts").textContent = String(activeAl.length));
    $("#kpiCritical") && ($("#kpiCritical").textContent = String(critical.length));
    $("#kpiUsers") && ($("#kpiUsers").textContent = String(users.length));

    const activeTable = $("#adminActiveDisastersTable");
    if (activeTable) {
      activeTable.innerHTML = activeDis
        .slice()
        .sort((a, b) => b.time - a.time)
        .map((d) => `
          <tr>
            <td>${d.id}</td>
            <td>${typeLabel(d.type)}</td>
            <td>${escapeHtml(d.place)}</td>
            <td>${d.region}</td>
            <td><span class="badge ${badgeClass(d.level)}">${levelLabel(d.level)}</span></td>
            <td>${fmtTime(d.time)}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn--sm" data-admin-edit-disaster="${d.id}">Редактирай</button>
                <button class="btn btn--sm btn--danger" data-admin-delete-disaster="${d.id}">Изтрий</button>
              </div>
            </td>
          </tr>
        `).join("");
    }

    const mon = $("#adminMonitoringList");
    if (mon) {
      const items = [
        { k: "Seismic feed", v: "OK • 1.2s latency", tone: "ok" },
        { k: "River sensors", v: "WARN • Varna lowlands", tone: "warn" },
        { k: "Fire watch", v: "CRIT • Burgas coastline", tone: "danger" },
        { k: "Storm radar", v: "OK • Sofia area", tone: "ok" },
      ];
      mon.innerHTML = items.map((x) => `
        <div class="list__item">
          <div><strong>${x.k}</strong><span>${x.v}</span></div>
          <span class="badge ${x.tone === "ok" ? "badge--low" : x.tone === "warn" ? "badge--high" : "badge--critical"}">
            ${x.tone === "ok" ? "OK" : x.tone === "warn" ? "WARN" : "CRIT"}
          </span>
        </div>
      `).join("");
    }

    const latestAlerts = $("#adminLatestAlertsTable");
    if (latestAlerts) {
      latestAlerts.innerHTML = alerts
        .slice()
        .sort((a, b) => b.time - a.time)
        .slice(0, 8)
        .map((a) => `
          <tr>
            <td>${a.id}</td>
            <td>${fmtTime(a.time)}</td>
            <td>${a.region === "all" ? "Всички" : a.region}</td>
            <td>${typeLabel(a.type)}</td>
            <td><span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span></td>
            <td>${escapeHtml(a.title)}</td>
            <td>${a.status === "sent" ? "Изпратено" : "Планирано"}</td>
          </tr>
        `).join("");
    }
  }

  function renderAdminDisasters() {
    const body = $("#adminDisastersTable");
    if (!body) return;
    body.innerHTML = disasters
      .slice()
      .sort((a, b) => b.time - a.time)
      .map((d) => `
        <tr>
          <td>${d.id}</td>
          <td>${typeLabel(d.type)}</td>
          <td>${fmtTime(d.time)}</td>
          <td>${escapeHtml(d.place)}</td>
          <td>${d.region}</td>
          <td>${escapeHtml(d.damage)}</td>
          <td>${escapeHtml(d.duration)}</td>
          <td><span class="badge ${badgeClass(d.level)}">${levelLabel(d.level)}</span></td>
          <td>${d.status === "active" ? "Активно" : d.status === "contained" ? "Овладяно" : "Приключено"}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn--sm" data-admin-edit-disaster="${d.id}">Редактирай</button>
              <button class="btn btn--sm btn--danger" data-admin-delete-disaster="${d.id}">Изтрий</button>
            </div>
          </td>
        </tr>
      `).join("");
  }

  function renderAdminAlerts() {
    const body = $("#adminAlertsTable");
    if (body) {
      body.innerHTML = alerts
        .slice()
        .sort((a, b) => b.time - a.time)
        .map((a) => `
          <tr>
            <td>${a.id}</td>
            <td>${fmtTime(a.time)}</td>
            <td>${a.region === "all" ? "Всички" : a.region}</td>
            <td>${typeLabel(a.type)}</td>
            <td><span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span></td>
            <td>${escapeHtml(a.body)}</td>
            <td>${a.status === "sent" ? "Изпратено" : "Планирано"}</td>
          </tr>
        `).join("");
    }

    const byRegion = $("#adminAlertsByRegion");
    if (byRegion) {
      const map = new Map();
      for (const a of alerts) {
        const key = a.region;
        map.set(key, (map.get(key) || 0) + 1);
      }
      const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
      byRegion.innerHTML = rows.map(([r, c]) => `
        <div class="list__item">
          <div><strong>${r === "all" ? "Всички региони" : r}</strong><span>Известия: ${c}</span></div>
          <span class="badge">Info</span>
        </div>
      `).join("");
    }

    const push = $("#adminPushLog");
    if (push) {
      const recent = alerts.slice().sort((a, b) => b.time - a.time).slice(0, 6);
      push.innerHTML = recent.map((a) => `
        <div class="list__item">
          <div><strong>${a.status === "sent" ? "Push: изпратено" : "Push: планирано"}</strong><span>${a.title}</span></div>
          <span class="badge ${badgeClass(a.level)}">${levelLabel(a.level)}</span>
        </div>
      `).join("");
    }
  }

  function renderAdminUsers() {
    const body = $("#adminUsersTable");
    if (!body) return;
    body.innerHTML = users.map((u) => `
      <tr>
        <td>${u.id}</td>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.region}</td>
        <td>${u.role}</td>
        <td>${u.status === "active" ? "Активен" : "Блокиран"}</td>
        <td>${escapeHtml(u.activity)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn--sm" data-admin-toggle-user="${u.id}">${u.status === "active" ? "Блокирай" : "Разблокирай"}</button>
            <button class="btn btn--sm" data-admin-role-user="${u.id}">Роля</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderAdminAnalytics() {
    const byReg = new Map();
    for (const d of disasters) {
      const cur = byReg.get(d.region) || { count: 0, max: "low" };
      cur.count += 1;
      if (LEVELS.indexOf(d.level) > LEVELS.indexOf(cur.max)) cur.max = d.level;
      byReg.set(d.region, cur);
    }
    const regBody = $("#adminAnalyticsRegions");
    if (regBody) {
      regBody.innerHTML = Array.from(byReg.entries()).map(([r, v]) => `
        <tr>
          <td>${r}</td>
          <td>${v.count}</td>
          <td><span class="badge ${badgeClass(v.max)}">${levelLabel(v.max)}</span></td>
        </tr>
      `).join("");
    }

    const byType = new Map();
    for (const d of disasters) byType.set(d.type, (byType.get(d.type) || 0) + 1);
    const tBody = $("#adminAnalyticsTypes");
    if (tBody) {
      tBody.innerHTML = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).map(([t, c]) => `
        <tr>
          <td>${typeLabel(t)}</td>
          <td>${c}</td>
          <td>${(c / 1).toFixed(0)}</td>
        </tr>
      `).join("");
    }

    drawMonthlyChart($("#adminAnalyticsChart"), buildMonthlySeries());
  }

  function renderAdminRegions() {
    const body = $("#adminRegionsTable");
    if (body) {
      const catLabel = (c) => (
        c === "affected" ? "Засегнат район" :
        c === "risk" ? "Рискова зона" :
        c === "safe" ? "Безопасна зона" :
        "Убежище"
      );
      body.innerHTML = regions.map((r) => `
        <tr>
          <td>${r.id}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${catLabel(r.category)}</td>
          <td>${r.city}</td>
          <td>${escapeHtml(r.note)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn--sm" data-admin-edit-region="${r.id}">Редактирай</button>
              <button class="btn btn--sm btn--danger" data-admin-delete-region="${r.id}">Изтрий</button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    const list = $("#adminZonesList");
    if (list) {
      const sample = regions.slice(0, 6);
      list.innerHTML = sample.map((r) => `
        <div class="list__item">
          <div><strong>${r.city} • ${escapeHtml(r.name)}</strong><span>${escapeHtml(r.note)}</span></div>
          <span class="badge">${r.category}</span>
        </div>
      `).join("");
    }
  }

  function renderAdminSystem() {
    const logs = $("#adminLogsList");
    if (logs) {
      const items = [
        { t: "INFO", msg: "Service started — demo mode", time: fmtTime(nowMinus(12)) },
        { t: "WARN", msg: "River sensor variance above threshold (Varna)", time: fmtTime(nowMinus(42)) },
        { t: "CRIT", msg: "Fire watch escalation (Burgas)", time: fmtTime(nowMinus(57)) },
        { t: "INFO", msg: "Alert dispatch queued (all regions)", time: fmtTime(nowMinus(28)) },
      ];
      logs.innerHTML = items.map((x) => `
        <div class="list__item">
          <div><strong>${x.t} • ${x.msg}</strong><span>${x.time}</span></div>
          <span class="badge ${x.t === "CRIT" ? "badge--critical" : x.t === "WARN" ? "badge--high" : "badge--low"}">${x.t}</span>
        </div>
      `).join("");
    }

    const sec = $("#adminSecurityList");
    if (sec) {
      const items = [
        { who: "Admin Operator", what: "Login", when: "сега", tone: "ok" },
        { who: "p.dimitrov@example.com", what: "Changed role (demo)", when: "преди 3д", tone: "warn" },
        { who: "elitsa.s@example.com", what: "Blocked", when: "преди 12д", tone: "danger" },
      ];
      sec.innerHTML = items.map((x) => `
        <div class="list__item">
          <div><strong>${x.who}</strong><span>${x.what} • ${x.when}</span></div>
          <span class="badge ${x.tone === "ok" ? "badge--low" : x.tone === "warn" ? "badge--high" : "badge--critical"}">
            ${x.tone.toUpperCase()}
          </span>
        </div>
      `).join("");
    }
  }

  // ---------------------------
  // Canvas chart (simple bars)
  // ---------------------------
  function buildMonthlySeries() {
    // Deterministic demo series from current date
    const base = new Date();
    const series = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const month = d.toLocaleString("bg-BG", { month: "short" });
      // Mix disasters + alerts counts with a stable formula
      const v = ((d.getMonth() + 1) * 3 + d.getFullYear()) % 9 + 3;
      series.push({ label: month, value: v });
    }
    return series;
  }

  /** @param {HTMLCanvasElement|null} canvas */
  function drawMonthlyChart(canvas, series) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fit for DPR
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 240;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, w, h);

    const pad = 18;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    const max = Math.max(...series.map(s => s.value), 1);
    const barW = innerW / series.length;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (innerH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + innerW, y);
      ctx.stroke();
    }

    // Bars
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      const bh = (s.value / max) * (innerH - 24);
      const x = pad + i * barW + 8;
      const y = pad + innerH - bh;
      const bw = Math.max(10, barW - 16);

      const grad = ctx.createLinearGradient(0, y, 0, y + bh);
      grad.addColorStop(0, "rgba(47,123,255,0.95)");
      grad.addColorStop(1, "rgba(255,138,0,0.72)");
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, bw, bh, 10);
      ctx.fill();

      // labels
      ctx.fillStyle = "rgba(234,240,255,0.72)";
      ctx.font = "12px ui-sans-serif, system-ui, Segoe UI, Arial";
      ctx.textAlign = "center";
      ctx.fillText(s.label, x + bw / 2, pad + innerH + 14);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ---------------------------
  // Interactions
  // ---------------------------
  function setupCopyButtons() {
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;
      const value = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(value);
        toast({ title: "Копирано", message: `Записано в клипборда: ${value}`, tone: "ok" });
      } catch {
        toast({ title: "Грешка", message: "Копирането не е позволено от браузъра.", tone: "warn" });
      }
    });
  }

  function setupQuickSubscribe() {
    const subscribe = () => toast({ title: "Известия (демо)", message: "Записан(а) си за уведомления според настройките.", tone: "ok" });
    $("#btnSubscribe")?.addEventListener("click", subscribe);
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-quick-subscribe]");
      if (btn) subscribe();
    });
  }

  function setupUserForms() {
    $("#alertSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = getUserFilters();
      renderUserAlerts();
      toast({ title: "Запазено", message: `Регион: ${f.region}, Тип: ${f.type}, Push: ${f.push}`, tone: "info" });
    });

    $("#alertSettingsForm")?.addEventListener("reset", () => {
      setTimeout(() => {
        renderUserAlerts();
        toast({ title: "Нулирано", message: "Филтрите са нулирани.", tone: "info" });
      }, 0);
    });

    // Map UI removed from the user interface (no real visualization)

    $("#profileForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      toast({ title: "Профил", message: "Промените са запазени (демо).", tone: "ok" });
    });

    $("#loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      toast({ title: "Вход", message: "Успешен вход (демо).", tone: "ok" });
    });
    $("#registerForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      toast({ title: "Регистрация", message: "Профилът е създаден (демо).", tone: "ok" });
    });
    $("#forgotForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      toast({ title: "Възстановяване", message: "Изпратен е линк (демо).", tone: "info" });
      const m = $("#modal-forgot");
      if (m) closeModal(m);
    });
  }

  function setupUserButtons() {
    $("#btnTestPush")?.addEventListener("click", () => {
      const f = getUserFilters();
      toast({
        title: "Push (демо)",
        message: `Тестово известие • Регион: ${f.region} • Тип: ${f.type}`,
        tone: "info",
      });
    });

    $("#btnExportAlerts")?.addEventListener("click", () => {
      const { region, type } = getUserFilters();
      const filtered = alerts
        .filter((a) => region === "all" ? true : (a.region === "all" || a.region === region))
        .filter((a) => type === "all" ? true : a.type === type)
        .map((a) => ({ ...a, time: a.time.toISOString() }));
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "alerts-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Експорт", message: "Файлът беше изтеглен (alerts-export.json).", tone: "ok" });
    });

    $("#btnClearFilters")?.addEventListener("click", () => {
      const r = $("#regionSelect");
      const t = $("#typeSelect");
      const p = $("#pushToggle");
      if (r) r.value = "all";
      if (t) t.value = "all";
      if (p) p.value = "on";
      renderUserAlerts();
      toast({ title: "Филтри", message: "Филтрите са изчистени.", tone: "info" });
    });

    $("#btnRefreshStats")?.addEventListener("click", () => {
      renderUserStats();
      toast({ title: "Статистика", message: "Обновено (демо).", tone: "info" });
    });

    $("#btnSaveProfile")?.addEventListener("click", () => {
      toast({ title: "Профил", message: "Запазено (демо).", tone: "ok" });
    });

    // Inline "view alert"
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-alert]");
      if (!btn) return;
      const id = btn.getAttribute("data-open-alert");
      const a = alerts.find((x) => x.id === id);
      if (!a) return;
      toast({ title: a.title, message: a.body, tone: a.level === "critical" ? "danger" : a.level === "high" ? "warn" : "info" });
    });

    // "view event" (from home cards)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-event]");
      if (!btn) return;
      const id = btn.getAttribute("data-open-event");
      const d = disasters.find((x) => x.id === id);
      if (!d) return;
      toast({ title: `${typeLabel(d.type)} • ${d.region}`, message: `${d.place} — ${d.notes}`, tone: d.level === "critical" ? "danger" : d.level === "high" ? "warn" : "info" });
    });
  }

  function setupSearchShortcut() {
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/") return;
      if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      e.preventDefault();
      toast({ title: "Бързо търсене (демо)", message: "Тук може да се добави search overlay / command palette.", tone: "info" });
    });
  }

  // ---------------------------
  // Admin actions (CRUD-like demo)
  // ---------------------------
  function setupAdminButtons() {
    $("#btnAdminAddDisaster")?.addEventListener("click", () => openModal($("#modal-admin-disaster")));
    $("#btnAdminSendAlert")?.addEventListener("click", () => openModal($("#modal-admin-alert")));

    $("#btnSimulateTick")?.addEventListener("click", () => {
      toast({ title: "Мониторинг", message: "Симулация: обновени сензорни показания (демо).", tone: "info" });
      renderAdminDashboard();
    });

    $("#btnAdminBackup")?.addEventListener("click", () => toast({ title: "Backup", message: "Backup създаден (демо).", tone: "ok" }));
    $("#btnAdminRotateLogs")?.addEventListener("click", () => toast({ title: "Logs", message: "Логовете са ротиран(и) (демо).", tone: "warn" }));
    $("#btnAdminLogout")?.addEventListener("click", () => toast({ title: "Изход", message: "Излязохте (демо).", tone: "info" }));
    $("#btnAdminRefreshAnalytics")?.addEventListener("click", () => {
      renderAdminAnalytics();
      toast({ title: "Аналитика", message: "Обновено (демо).", tone: "info" });
    });
  }

  function setupAdminForms() {
    $("#adminDisasterForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = String(fd.get("id") || "").trim() || `evt-${String(Math.floor(Math.random() * 900) + 100)}`;

      const type = /** @type any */ (fd.get("type"));
      const region = /** @type any */ (fd.get("region"));
      const level = /** @type any */ (fd.get("level"));
      const status = /** @type any */ (fd.get("status"));
      const timeVal = String(fd.get("time") || "");
      const time = timeVal ? new Date(timeVal) : new Date();

      const record = {
        id,
        type,
        time,
        place: String(fd.get("place") || ""),
        region,
        damage: String(fd.get("damage") || ""),
        duration: String(fd.get("duration") || ""),
        level,
        status,
        notes: String(fd.get("notes") || ""),
      };

      const idx = disasters.findIndex((d) => d.id === id);
      if (idx >= 0) disasters[idx] = record;
      else disasters.unshift(record);

      renderAll();
      toast({ title: "Бедствие", message: idx >= 0 ? "Записът е обновен." : "Добавено ново бедствие.", tone: "ok" });
      closeModal($("#modal-admin-disaster"));
      e.target.reset();
      $("#disId") && ($("#disId").value = "");
    });

    $("#adminAlertForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = `al-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const record = {
        id,
        time: new Date(),
        region: /** @type any */ (fd.get("region")),
        type: /** @type any */ (fd.get("type")),
        level: /** @type any */ (fd.get("level")),
        title: String(fd.get("title") || "Известие"),
        body: String(fd.get("body") || ""),
        status: /** @type any */ (fd.get("status")),
      };
      alerts.unshift(record);
      renderAll();
      toast({ title: "Известие", message: "Известие добавено/изпратено (демо).", tone: "ok" });
      closeModal($("#modal-admin-alert"));
      e.target.reset();
    });

    $("#adminRegionForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = String(fd.get("id") || "").trim() || `r-${String(Math.floor(Math.random() * 90) + 10)}`;
      const record = {
        id,
        city: /** @type any */ (fd.get("city")),
        category: /** @type any */ (fd.get("category")),
        name: String(fd.get("name") || ""),
        note: String(fd.get("note") || ""),
      };
      const idx = regions.findIndex((r) => r.id === id);
      if (idx >= 0) regions[idx] = record;
      else regions.unshift(record);
      renderAll();
      toast({ title: "Регион", message: idx >= 0 ? "Регионът е обновен." : "Добавен нов регион.", tone: "ok" });
      closeModal($("#modal-admin-region"));
      e.target.reset();
      $("#regId") && ($("#regId").value = "");
    });

    $("#adminSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      toast({ title: "Настройки", message: "Настройките са запазени (демо).", tone: "ok" });
    });

    $("#adminProfileForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      toast({ title: "Профил", message: "Профилът е обновен (демо).", tone: "ok" });
    });
  }

  function setupAdminRowActions() {
    document.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-admin-edit-disaster]");
      if (edit) {
        const id = edit.getAttribute("data-admin-edit-disaster");
        const d = disasters.find((x) => x.id === id);
        if (!d) return;
        openModal($("#modal-admin-disaster"));
        $("#disId") && ($("#disId").value = d.id);
        $("#disType") && ($("#disType").value = d.type);
        $("#disRegion") && ($("#disRegion").value = d.region);
        $("#disLevel") && ($("#disLevel").value = d.level);
        $("#disStatus") && ($("#disStatus").value = d.status);
        $("#disPlace") && ($("#disPlace").value = d.place);
        $("#disDamage") && ($("#disDamage").value = d.damage);
        $("#disDuration") && ($("#disDuration").value = d.duration);
        $("#disNotes") && ($("#disNotes").value = d.notes);
        const t = $("#disTime");
        if (t) t.value = toDatetimeLocalValue(d.time);
        return;
      }

      const del = e.target.closest("[data-admin-delete-disaster]");
      if (del) {
        const id = del.getAttribute("data-admin-delete-disaster");
        const idx = disasters.findIndex((x) => x.id === id);
        if (idx >= 0) disasters.splice(idx, 1);
        renderAll();
        toast({ title: "Бедствие", message: "Записът е изтрит (демо).", tone: "warn" });
        return;
      }

      const toggle = e.target.closest("[data-admin-toggle-user]");
      if (toggle) {
        const id = toggle.getAttribute("data-admin-toggle-user");
        const u = users.find((x) => x.id === id);
        if (!u) return;
        u.status = u.status === "active" ? "blocked" : "active";
        renderAll();
        toast({ title: "Потребител", message: `${u.name}: ${u.status === "active" ? "активиран" : "блокиран"} (демо).`, tone: u.status === "active" ? "ok" : "warn" });
        return;
      }

      const role = e.target.closest("[data-admin-role-user]");
      if (role) {
        const id = role.getAttribute("data-admin-role-user");
        const u = users.find((x) => x.id === id);
        if (!u) return;
        u.role = u.role === "user" ? "operator" : u.role === "operator" ? "admin" : "user";
        renderAll();
        toast({ title: "Роля", message: `${u.name}: нова роля — ${u.role}.`, tone: "info" });
        return;
      }

      const eReg = e.target.closest("[data-admin-edit-region]");
      if (eReg) {
        const id = eReg.getAttribute("data-admin-edit-region");
        const r = regions.find((x) => x.id === id);
        if (!r) return;
        openModal($("#modal-admin-region"));
        $("#regId") && ($("#regId").value = r.id);
        $("#regCity") && ($("#regCity").value = r.city);
        $("#regCategory") && ($("#regCategory").value = r.category);
        $("#regName") && ($("#regName").value = r.name);
        $("#regNote") && ($("#regNote").value = r.note);
        return;
      }

      const dReg = e.target.closest("[data-admin-delete-region]");
      if (dReg) {
        const id = dReg.getAttribute("data-admin-delete-region");
        const idx = regions.findIndex((x) => x.id === id);
        if (idx >= 0) regions.splice(idx, 1);
        renderAll();
        toast({ title: "Регион", message: "Регионът е изтрит (демо).", tone: "warn" });
      }
    });
  }

  function toDatetimeLocalValue(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ---------------------------
  // Render all (based on current page)
  // ---------------------------
  function renderAll() {
    // User page nodes exist?
    if ($("#section-home") || $("[data-section]")) {
      renderUserHome();
      renderUserAlerts();
      renderUserStats();
      renderUserProfile();
    }
    // Admin nodes exist?
    if ($("#adminContent") || $("[data-admin-section]")) {
      renderAdminDashboard();
      renderAdminDisasters();
      renderAdminAlerts();
      renderAdminUsers();
      renderAdminAnalytics();
      renderAdminRegions();
      renderAdminSystem();
    }
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    setupModals();
    setupCopyButtons();
    setupQuickSubscribe();
    setupUserNav();
    setupAdminNav();
    setupUserForms();
    setupUserButtons();
    setupSearchShortcut();

    setupAdminButtons();
    setupAdminForms();
    setupAdminRowActions();

    // Initial render
    renderAll();

    // Keep charts crisp on resize (lightweight)
    window.addEventListener("resize", () => {
      drawMonthlyChart($("#userStatsChart"), buildMonthlySeries());
      drawMonthlyChart($("#adminAnalyticsChart"), buildMonthlySeries());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

