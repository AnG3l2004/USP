
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

  /** Текст за карта/списъци: Рихтер, дълбочина, вятър, валеж, ниво на вода, площ на пожар. */
  function formatDisasterMetrics(d) {
    const parts = [];
    if (d.richter != null && String(d.richter).trim() !== "") {
      const x = Number(d.richter);
      if (Number.isFinite(x)) parts.push(`ML ${x.toFixed(1)} (Рихтер)`);
    }
    if (d.focal_depth_km != null && String(d.focal_depth_km).trim() !== "") {
      const x = Number(d.focal_depth_km);
      if (Number.isFinite(x)) parts.push(`дълбочина ${x.toFixed(1)} km`);
    }
    if (d.wind_gust_kmh != null && String(d.wind_gust_kmh).trim() !== "") {
      const x = Math.trunc(Number(d.wind_gust_kmh));
      if (Number.isFinite(x)) parts.push(`пориви до ${x} km/h`);
    }
    if (d.rainfall_mm != null && String(d.rainfall_mm).trim() !== "") {
      const x = Math.trunc(Number(d.rainfall_mm));
      if (Number.isFinite(x)) parts.push(`валеж ${x} mm / 24h`);
    }
    if (d.water_level_cm != null && String(d.water_level_cm).trim() !== "") {
      const x = Math.trunc(Number(d.water_level_cm));
      if (Number.isFinite(x)) parts.push(`ниво +${x} cm`);
    }
    if (d.burned_area_ha != null && String(d.burned_area_ha).trim() !== "") {
      const x = Number(d.burned_area_ha);
      if (Number.isFinite(x)) parts.push(`площ ${x.toFixed(x >= 100 ? 0 : 2)} ha`);
    }
    return parts.join(" · ");
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

  /** @type {Readonly<Record<string, [number, number]>>} център [lat, lng] за регион (България) */
  const REGION_COORDS = Object.freeze({
    Sofia: [42.6977, 23.3219],
    Varna: [43.2141, 27.9147],
    Plovdiv: [42.1354, 24.7453],
    Burgas: [42.5048, 27.4626],
  });

  /** Леко разместване на маркери с един и същ регион */
  function jitterLatLngForId(id) {
    let h = 2166136261;
    const s = String(id);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const dLat = ((h & 0xff) / 255 - 0.5) * 0.07;
    const dLng = (((h >> 8) & 0xff) / 255 - 0.5) * 0.07;
    return [dLat, dLng];
  }

  /** @param {"low"|"medium"|"high"|"critical"} level */
  function levelHexColor(level) {
    if (level === "critical") return "#dc2626";
    if (level === "high") return "#ea580c";
    if (level === "medium") return "#ca8a04";
    return "#16a34a";
  }

  /** Скрива очевидни тестови/празни редове в блока за земетресения и на картата. */
  function earthquakeRowIsPresentable(d) {
    const p = String(d.place ?? "").trim();
    const dmg = String(d.damage ?? "").trim();
    const notes = String(d.notes ?? "").trim();
    if (p.length < 2 && dmg.length < 3) return false;
    if (/^[\s:.\-_0-9]{1,8}$/.test(p)) return false;
    const compact = p.replace(/\s/g, "");
    if (compact.length >= 3 && /^(.)\1+$/.test(compact)) return false;
    if (p.includes(":::")) return false;
    const blob = `${p} ${dmg} ${notes}`.toLowerCase();
    if (/\bтест\b|\btest\b|qwerty|asdf|хфхф|хгф/.test(blob)) return false;
    return true;
  }

  let homeLeafletMap = null;
  let homeLeafletLayer = null;

  function renderHomeDisasterMap() {
    const mount = $("#heroUsgsMap");
    if (!mount || typeof L === "undefined") return;

    if (homeLeafletMap) {
      try {
        const c = homeLeafletMap.getContainer();
        if (!c || !document.body.contains(c) || c !== mount) {
          homeLeafletMap.remove();
          homeLeafletMap = null;
          homeLeafletLayer = null;
        }
      } catch (_) {
        homeLeafletMap = null;
        homeLeafletLayer = null;
      }
    }

    const rows = disasters
      .filter((d) => d.type === "earthquake" && REGION_COORDS[d.region] && earthquakeRowIsPresentable(d))
      .slice()
      .sort((a, b) => b.time - a.time)
      .slice(0, 24);

    if (!homeLeafletMap) {
      homeLeafletMap = L.map(mount, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(homeLeafletMap);
      homeLeafletLayer = L.layerGroup().addTo(homeLeafletMap);
    }

    homeLeafletLayer.clearLayers();
    /** @type {Array<[number, number]>} */
    const bounds = [];
    /** @type {Record<string, number>} */
    const perRegionIdx = Object.create(null);

    for (const d of rows) {
      const base = REGION_COORDS[d.region];
      const n = (perRegionIdx[d.region] = (perRegionIdx[d.region] || 0) + 1);
      const [dLat, dLng] = jitterLatLngForId(d.id);
      const ring = 0.055 * Math.sqrt(n);
      const ang = n * 2.39996322972865332;
      const lat = base[0] + dLat + Math.cos(ang) * ring;
      const lng = base[1] + dLng + Math.sin(ang) * ring;
      bounds.push([lat, lng]);
      const col = levelHexColor(d.level);
      const r = d.level === "critical" ? 12 : d.level === "high" ? 10 : d.level === "medium" ? 9 : 8;
      const m = L.circleMarker([lat, lng], {
        radius: r,
        color: col,
        fillColor: col,
        fillOpacity: 0.5,
        weight: 2,
      });
      const st = d.status === "active" ? "активно" : d.status === "contained" ? "локализирано" : "приключило";
      const met = formatDisasterMetrics(d);
      m.bindPopup(
        `<strong>${escapeHtml(typeLabel(d.type))}</strong><br/>` +
          `${escapeHtml(d.region)} • ${escapeHtml(d.place || "—")}<br/>` +
          (met ? `<span style="color:#334155;font-size:12px">${escapeHtml(met)}</span><br/>` : "") +
          `<span style="color:#64748b;font-size:12px">${escapeHtml(fmtTime(d.time))}</span><br/>` +
          `${escapeHtml(levelLabel(d.level))} • ${st}`,
      );
      m.addTo(homeLeafletLayer);
    }

    if (bounds.length === 1) {
      homeLeafletMap.setView(bounds[0], 7.5);
    } else if (bounds.length > 1) {
      homeLeafletMap.fitBounds(bounds, { padding: [56, 56], maxZoom: 8 });
    } else {
      homeLeafletMap.setView([42.65, 25.4], 6.5);
    }

    requestAnimationFrame(() => {
      homeLeafletMap?.invalidateSize();
      requestAnimationFrame(() => homeLeafletMap?.invalidateSize());
    });
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

  /** @type {string|null} */
  let apiBaseResolved = null;
  /** @type {Promise<string>|null} */
  let apiBasePromise = null;

  function collectApiCandidates() {
    const out = [];
    const push = (b) => {
      const base = String(b || "").trim().replace(/\/+$/, "");
      if (base && !out.includes(base)) out.push(base);
    };
    const fromMeta = document.querySelector('meta[name="alertix-api"]')?.getAttribute("content")?.trim();
    const fromWin = typeof window !== "undefined" && window.ALERTIX_API ? String(window.ALERTIX_API).trim() : "";
    const fromLs = localStorage.getItem("ALERTIX_API")?.trim();
    /* Първо meta/дефолт портове — иначе погрешен ALERTIX_API (напр. Live Server) дава фалшив /health 200 + HTML и чупи POST към API */
    [fromMeta, fromWin].forEach(push);
    [
      "http://127.0.0.1:5175",
      "http://127.0.0.1:5173",
      "http://localhost:5175",
      "http://localhost:5173",
    ].forEach(push);
    [fromLs].forEach(push);
    return out;
  }

  async function ensureApiBase() {
    if (apiBaseResolved) return apiBaseResolved;
    if (apiBasePromise) return apiBasePromise;

    apiBasePromise = (async () => {
      const candidates = collectApiCandidates();
      for (const base of candidates) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        try {
          const r = await fetch(`${base}/health`, { signal: ctrl.signal });
          if (!r.ok) continue;
          const j = await r.json();
          if (j && j.ok === true) {
            apiBaseResolved = base;
            try {
              localStorage.setItem("ALERTIX_API", base);
            } catch (_) {}
            return base;
          }
        } catch (_) {
          /* следващ кандидат */
        } finally {
          clearTimeout(t);
        }
      }
      apiBaseResolved = "http://127.0.0.1:5175";
      return apiBaseResolved;
    })();

    return apiBasePromise;
  }

  async function apiFetchJson(pathname, init) {
    await ensureApiBase();
    const base = apiBaseResolved || "http://127.0.0.1:5175";
    const res = await fetch(`${base}${pathname}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init && init.headers ? init.headers : {}),
      },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      let detail = (t || "").trim() || res.statusText;
      try {
        const j = JSON.parse(t);
        if (j && typeof j.error === "string" && j.error) detail = j.error;
      } catch (_) {
        /* не е JSON */
      }
      throw new Error(`API ${res.status}: ${detail}`);
    }
    return await res.json();
  }

  // ---------------------------
  // Auth (minimal, demo-friendly)
  // ---------------------------
  const SESSION_KEY = "ALERTIX_SESSION_USER";

  function getSessionUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u && typeof u === "object" ? u : null;
    } catch {
      return null;
    }
  }

  function setSessionUser(user) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (_) {}
  }

  function clearSessionUser() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  function currentPageName() {
    const p = String(location.pathname || "/");
    const base = p.split("/").pop() || "";
    return base || "index.html";
  }

  function redirectToLogin() {
    const next = `${currentPageName()}${location.hash || ""}`;
    location.href = `login.html?next=${encodeURIComponent(next)}`;
  }

  function applyUserHeader(user) {
    const label = $("#topbarUserLabel");
    if (label) label.textContent = user ? `Профил: ${user.name || user.email || "—"}` : "Профил: —";

    const adminLink = $("#topbarAdminLink");
    if (adminLink) {
      const can = user && (user.role === "admin" || user.role === "operator");
      adminLink.style.display = can ? "" : "none";
    }
  }

  function setupLogoutButtons() {
    const doLogout = () => {
      clearSessionUser();
      toast({ title: "Изход", message: "Излязохте от профила.", tone: "info" });
      setTimeout(() => redirectToLogin(), 250);
    };
    $("#btnLogout")?.addEventListener("click", doLogout);
    $("#btnAdminTopLogout")?.addEventListener("click", doLogout);
  }

  function setupAuthPages() {
    const page = currentPageName().toLowerCase();
    const isLogin = page === "login.html";
    const isRegister = page === "register.html";
    if (!isLogin && !isRegister) return false;

    // If already logged in -> go to next/index
    const existing = getSessionUser();
    if (existing) {
      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      location.href = next ? next : (existing.role === "admin" || existing.role === "operator" ? "admin.html" : "index.html");
      return true;
    }

    $("#loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#loginEmail")?.value?.trim() || "";
      const password = $("#loginPassword")?.value || "";
      const role = $("#loginRole")?.value || "user";
      try {
        const r = await apiFetchJson("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, role }) });
        setSessionUser(r.user);
        toast({ title: "Вход", message: `Добре дошъл/дошла, ${r.user?.name || r.user?.email || "потребител"}!`, tone: "ok" });
        const params = new URLSearchParams(location.search);
        const next = params.get("next");
        setTimeout(() => {
          location.href = next ? next : (r.user.role === "admin" || r.user.role === "operator" ? "admin.html" : "index.html");
        }, 350);
      } catch (err) {
        toast({ title: "Грешка", message: authFriendlyError(err), tone: "warn" });
      }
    });

    // Demo fill buttons (login page)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fill-login]");
      if (!btn) return;
      const kind = btn.getAttribute("data-fill-login");
      const emailEl = $("#loginEmail");
      const passEl = $("#loginPassword");
      const roleEl = $("#loginRole");
      if (!emailEl || !passEl || !roleEl) return;
      if (kind === "admin") {
        emailEl.value = "admin@alertix.local";
        passEl.value = "Admin123!";
        roleEl.value = "admin";
      } else if (kind === "operator") {
        emailEl.value = "operator@alertix.local";
        passEl.value = "Operator123!";
        roleEl.value = "operator";
      } else {
        emailEl.value = "maria.ivanova@example.com";
        passEl.value = "User123!";
        roleEl.value = "user";
      }
      toast({ title: "Демо", message: "Попълних данните за вход.", tone: "info" });
    });

    $("#registerForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#regName")?.value?.trim() || "";
      const email = $("#regEmail")?.value?.trim() || "";
      const region = $("#regRegion")?.value || "Sofia";
      const password = $("#regPassword")?.value || "";
      const password2 = $("#regPassword2")?.value || "";
      if (password !== password2) {
        toast({ title: "Регистрация", message: "Паролите не съвпадат.", tone: "warn" });
        return;
      }
      try {
        await apiFetchJson("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, region, password }) });
        toast({ title: "Регистрация", message: "Профилът е създаден. Влез с имейла и паролата.", tone: "ok" });
        setTimeout(() => {
          location.href = `login.html?email=${encodeURIComponent(email)}`;
        }, 450);
      } catch (err) {
        toast({ title: "Грешка", message: authFriendlyError(err), tone: "warn" });
      }
    });

    // Pre-fill login email if provided
    const emailPrefill = new URLSearchParams(location.search).get("email");
    if (emailPrefill && $("#loginEmail")) $("#loginEmail").value = emailPrefill;
    return true;
  }

  function authFriendlyError(err) {
    const msg = String(err?.message || err || "").trim();
    // Our apiFetchJson throws: "API <code>: <detail>"
    const m = msg.match(/^API\s+(\d+):\s*(.*)$/i);
    const code = m ? Number(m[1]) : null;
    const detail = m ? String(m[2] || "").trim() : msg;

    if (code === 401) return "Грешен имейл или парола.";
    if (code === 403) {
      if (/blocked/i.test(detail)) return "Профилът е блокиран.";
      if (/role mismatch/i.test(detail)) return "Избраната роля не съответства на този профил.";
      return "Нямаш права за това действие.";
    }
    if (code === 409) return "Вече има профил с този имейл.";
    if (/password must be at least/i.test(detail)) return "Паролата трябва да е поне 6 символа.";
    if (/valid email is required/i.test(detail)) return "Моля, въведи валиден имейл адрес.";
    if (/name is required/i.test(detail)) return "Моля, въведи име.";
    if (/password is required/i.test(detail)) return "Моля, въведи парола.";

    return detail || "Възникна грешка. Опитай отново.";
  }

  function requireAuthForApp() {
    const page = currentPageName().toLowerCase();
    if (page === "login.html" || page === "register.html") return true;

    const user = getSessionUser();
    if (!user) {
      redirectToLogin();
      return false;
    }

    // Admin page is restricted
    if (page === "admin.html") {
      const ok = user.role === "admin" || user.role === "operator";
      if (!ok) {
        location.href = "index.html";
        return false;
      }
    }

    applyUserHeader(user);
    return true;
  }

  function parseTimeMaybe(v) {
    if (v instanceof Date) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  const demoDisasters = [
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
      rainfall_mm: 55,
      water_level_cm: 72,
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
      wind_gust_kmh: 88,
      rainfall_mm: 22,
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
      richter: 3.0,
      focal_depth_km: 7.5,
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
      wind_gust_kmh: 42,
      burned_area_ha: 215.4,
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
    {
      id: "demo-eq-varna",
      type: "earthquake",
      time: nowMinus(95),
      place: "Черноморие — Кранево",
      region: "Varna",
      damage: "M 3.2",
      duration: "секунди",
      level: "low",
      status: "active",
      notes: "Слаб трус край Варна (пример без връзка с API).",
      richter: 3.2,
      focal_depth_km: 11.0,
    },
    {
      id: "demo-eq-burgas",
      type: "earthquake",
      time: nowMinus(210),
      place: "Странджа — Малко Търново",
      region: "Burgas",
      damage: "M 3.5",
      duration: "кратко",
      level: "medium",
      status: "active",
      notes: "Усещаемост в Югоизточна България (пример).",
      richter: 3.5,
      focal_depth_km: 9.2,
    },
    {
      id: "demo-eq-sofia",
      type: "earthquake",
      time: nowMinus(340),
      place: "Софийско поле — Божурище",
      region: "Sofia",
      damage: "M 4.0",
      duration: "кратко",
      level: "medium",
      status: "contained",
      notes: "Лек трус в околностите на София (пример).",
      richter: 4.0,
      focal_depth_km: 8.4,
    },
  ];

  const demoAlerts = [
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
  const demoUsers = [
    { id: "u-01", name: "Иван Петров", email: "ivan.petrov@example.com", region: "Sofia", role: "user", status: "active", activity: "преди 2ч" },
    { id: "u-02", name: "Мария Георгиева", email: "maria.g@example.com", region: "Varna", role: "user", status: "active", activity: "преди 18м" },
    { id: "u-03", name: "Петър Димитров", email: "p.dimitrov@example.com", region: "Plovdiv", role: "operator", status: "active", activity: "преди 6м" },
    { id: "u-04", name: "Елица Стоянова", email: "elitsa.s@example.com", region: "Burgas", role: "user", status: "blocked", activity: "преди 12д" },
    { id: "u-05", name: "Admin Operator", email: "admin@alertix.local", region: "Sofia", role: "admin", status: "active", activity: "сега" },
  ];

  /** @type {Array<{ id:string, city:"Sofia"|"Varna"|"Plovdiv"|"Burgas", category:"affected"|"safe"|"shelter"|"risk", name:string, note:string }>} */
  const demoRegions = [
    { id: "r-01", city: "Varna", category: "affected", name: "кв. Аспарухово — ниски части", note: "Възможни заливания при интензивни валежи." },
    { id: "r-02", city: "Burgas", category: "risk", name: "Крайморска зона — вятър/дим", note: "Риск от бързо разпространение при пориви." },
    { id: "r-03", city: "Sofia", category: "safe", name: "Открита зона — парк (пример)", note: "Подходяща за сборен пункт при евакуация." },
    { id: "r-04", city: "Plovdiv", category: "shelter", name: "Спортна зала (пример)", note: "Временно настаняване при нужда." },
    { id: "r-05", city: "Sofia", category: "risk", name: "Подлез (пример)", note: "Риск от заливане при проливен дъжд." },
  ];

  let disasters = demoDisasters.slice();
  let alerts = demoAlerts.slice();
  let users = demoUsers.slice();
  let regions = demoRegions.slice();

  async function refreshFromApi() {
    const isUserUi = Boolean($("#section-home") || $("[data-section]"));
    const isAdminUi = Boolean($("#adminContent") || $("[data-admin-section]"));
    if (!isUserUi && !isAdminUi) return;

    try {
      const next = {};

      // Always needed for user UI
      next.alerts = await apiFetchJson("/api/alerts");
      next.disasters = await apiFetchJson("/api/disasters");

      // Only needed for admin UI; if endpoints are missing, keep demo arrays
      if (isAdminUi) {
        try { next.users = await apiFetchJson("/api/users"); } catch { next.users = demoUsers.slice(); }
        try { next.regions = await apiFetchJson("/api/regions"); } catch { next.regions = demoRegions.slice(); }
      } else {
        next.users = demoUsers.slice();
        next.regions = demoRegions.slice();
      }

      alerts = next.alerts.map((a) => ({ ...a, time: parseTimeMaybe(a.time) }));
      disasters = next.disasters.map((d) => ({ ...d, time: parseTimeMaybe(d.time) }));
      users = (next.users || []).slice();
      regions = (next.regions || []).slice();

      renderAll();
      toast({ title: "База данни", message: "Данните са заредени от MySQL (API).", tone: "ok" });
    } catch (e) {
      toast({ title: "Демо режим", message: "API не е налично. Показвам примерни данни.", tone: "warn" });
    }
  }

  function ensureToastHost() {
    let host = $("#toastHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "toastHost";
    host.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:10050",
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "max-width:min(420px, calc(100% - 32px))",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(host);
    return host;
  }

  /** @param {{title:string, message:string, tone?:"info"|"ok"|"warn"|"danger"}} opts */
  function toast(opts) {
    const host = ensureToastHost();
    const el = document.createElement("div");
    const tone = opts.tone || "info";
    // Светла тема: плътен фон и тъмен текст (прозрачните „стъклени“ панели с бял текст не се четяха)
    const border =
      tone === "ok" ? "#16a34a" :
      tone === "warn" ? "#ea580c" :
      tone === "danger" ? "#dc2626" :
      "#2563eb";
    const bg =
      tone === "ok" ? "#ecfdf5" :
      tone === "warn" ? "#fff7ed" :
      tone === "danger" ? "#fef2f2" :
      "#eff6ff";

    el.style.cssText = [
      "border-radius:16px",
      `border:1px solid ${border}`,
      `background:${bg}`,
      "padding:12px 12px",
      "color:#0f172a",
      "box-shadow: 0 12px 40px rgba(15,23,42,0.14)",
      "pointer-events:auto",
    ].join(";");

    el.innerHTML = `
      <div style="display:flex; justify-content: space-between; gap:10px; align-items:flex-start;">
        <div>
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; color:#0f172a;">${escapeHtml(opts.title)}</div>
          <div style="color: rgba(15,23,42,0.72); font-size: 12px; line-height:1.35;">${escapeHtml(opts.message)}</div>
        </div>
        <button type="button" style="all:unset; cursor:pointer; padding:6px 10px; border-radius: 10px; border:1px solid rgba(15,23,42,0.14); background:#fff; color:#0f172a; font-size: 12px; font-weight:600;">
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

      if (key === "home") {
        queueMicrotask(() => renderHomeDisasterMap());
      }
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
      latestBody.innerHTML = rows || `<tr><td colspan="5" style="color:var(--muted)">Няма известия. Добави от админ панела.</td></tr>`;
    }

    const cardsHost = $("#homeActiveDisastersCards");
    if (cardsHost) {
      const activeDis = disasters
        .filter((d) => d.status === "active")
        .slice()
        .sort((a, b) => b.time - a.time)
        .slice(0, 2);
      cardsHost.innerHTML = activeDis.length
        ? activeDis.map((d) => `
          <div class="card" style="grid-column: span 6; margin:0">
            <h3>${typeLabel(d.type)} • ${d.region}</h3>
            <p>${escapeHtml(d.notes || d.place || "—")}</p>
            ${formatDisasterMetrics(d) ? `<p style="margin:8px 0 0;font-size:12px;color:var(--muted)">${escapeHtml(formatDisasterMetrics(d))}</p>` : ""}
            <div class="card__meta">
              <span class="pill ${regionPillClass(d.region)}">${d.region}</span>
              <span class="badge ${badgeClass(d.level)}">${levelLabel(d.level)}</span>
            </div>
            <div class="card__footer">
              <button class="btn btn--sm" data-open-event="${escapeHtml(d.id)}">Виж повече</button>
              <button class="btn btn--sm btn--primary" data-quick-subscribe>Получавай известия</button>
            </div>
          </div>
        `).join("")
        : `<div class="card" style="grid-column: span 12; margin:0"><p style="margin:0;color:var(--muted)">Няма активни бедствия. Добави запис от админ панела.</p></div>`;
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

    renderHeroUsgsPanel();
    renderHomeDisasterMap();
  }

  function renderHeroUsgsPanel() {
    const list = $("#heroUsgsList");
    if (!list) return;
    const items = disasters
      .filter((d) => d.type === "earthquake" && earthquakeRowIsPresentable(d))
      .slice()
      .sort((a, b) => b.time - a.time)
      .slice(0, 12);
    list.innerHTML = items.length
      ? items
          .map(
            (d) => `
        <div class="hero-usgs__row hero-usgs__row--${d.level}">
          <div>
            <strong>${escapeHtml(d.damage || "—")} · ${escapeHtml(d.place)}</strong>
            ${formatDisasterMetrics(d) ? `<span class="hero-usgs__metrics">${escapeHtml(formatDisasterMetrics(d))}</span>` : ""}
            <span>${fmtTime(d.time)} · най-близък град: ${escapeHtml(d.region)} · ${escapeHtml(levelLabel(d.level))}</span>
          </div>
          <span class="badge ${badgeClass(d.level)}">${escapeHtml(
            d.status === "active" ? "активно" : d.status === "contained" ? "локализирано" : "архив",
          )}</span>
        </div>`,
          )
          .join("")
      : `<div class="hero-usgs__empty">Няма записи за земетресения в базата. Добави редове в MySQL (виж <code>backend/manual_earthquakes.sql</code>) или през админ панела.</div>`;
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
          <td style="max-width:220px;font-size:12px;color:var(--muted)">${escapeHtml(formatDisasterMetrics(d) || "—")}</td>
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

    // Auth UI removed from the user interface for simplicity
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

    // Stats UI removed from the user interface for simplicity

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
      const met = formatDisasterMetrics(d);
      toast({
        title: `${typeLabel(d.type)} • ${d.region}`,
        message: `${d.place} — ${d.notes || "—"}${met ? `\n${met}` : ""}`,
        tone: d.level === "critical" ? "danger" : d.level === "high" ? "warn" : "info",
      });
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
    $("#adminDisasterForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = String(fd.get("id") || "").trim();

      const type = /** @type any */ (fd.get("type"));
      const region = /** @type any */ (fd.get("region"));
      const level = /** @type any */ (fd.get("level"));
      const status = /** @type any */ (fd.get("status"));
      const timeVal = String(fd.get("time") || "");
      const time = timeVal ? new Date(timeVal) : new Date();

      const payload = {
        type,
        time: time.toISOString(),
        place: String(fd.get("place") || ""),
        region,
        damage: String(fd.get("damage") || ""),
        duration: String(fd.get("duration") || ""),
        level,
        status,
        notes: String(fd.get("notes") || ""),
        richter: String(fd.get("richter") || "").trim() || null,
        focal_depth_km: String(fd.get("focal_depth_km") || "").trim() || null,
        wind_gust_kmh: String(fd.get("wind_gust_kmh") || "").trim() || null,
        rainfall_mm: String(fd.get("rainfall_mm") || "").trim() || null,
        water_level_cm: String(fd.get("water_level_cm") || "").trim() || null,
        burned_area_ha: String(fd.get("burned_area_ha") || "").trim() || null,
      };

      try {
        if (id) {
          await apiFetchJson(`/api/disasters/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
          toast({ title: "Бедствие", message: "Записът е обновен.", tone: "ok" });
        } else {
          await apiFetchJson(`/api/disasters`, { method: "POST", body: JSON.stringify(payload) });
          toast({ title: "Бедствие", message: "Добавено ново бедствие.", tone: "ok" });
        }
        closeModal($("#modal-admin-disaster"));
        e.target.reset();
        $("#disId") && ($("#disId").value = "");
        await refreshFromApi();
      } catch {
        // Fallback demo mode
        const newId = id || `evt-${String(Math.floor(Math.random() * 900) + 100)}`;
        const record = { id: newId, ...payload, time, damage: payload.damage, duration: payload.duration };
        const idx = disasters.findIndex((d) => d.id === newId);
        if (idx >= 0) disasters[idx] = record;
        else disasters.unshift(record);
        renderAll();
        toast({ title: "Демо режим", message: "Запазено локално (без база).", tone: "warn" });
        closeModal($("#modal-admin-disaster"));
        e.target.reset();
        $("#disId") && ($("#disId").value = "");
      }
    });

    $("#adminAlertForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        region: /** @type any */ (fd.get("region")),
        type: /** @type any */ (fd.get("type")),
        level: /** @type any */ (fd.get("level")),
        title: String(fd.get("title") || "Известие"),
        body: String(fd.get("body") || ""),
        status: /** @type any */ (fd.get("status")),
      };
      try {
        await apiFetchJson(`/api/alerts`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Известие", message: "Известие добавено/изпратено.", tone: "ok" });
        closeModal($("#modal-admin-alert"));
        e.target.reset();
        await refreshFromApi();
      } catch {
        // Fallback demo mode
        const record = { id: `al-${String(Math.floor(Math.random() * 9000) + 1000)}`, time: new Date(), ...payload };
        alerts.unshift(record);
        renderAll();
        toast({ title: "Демо режим", message: "Известие добавено локално (без база).", tone: "warn" });
        closeModal($("#modal-admin-alert"));
        e.target.reset();
      }
    });

    $("#adminRegionForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = String(fd.get("id") || "").trim();
      const payload = {
        city: /** @type any */ (fd.get("city")),
        category: /** @type any */ (fd.get("category")),
        name: String(fd.get("name") || ""),
        note: String(fd.get("note") || ""),
      };
      try {
        if (id) {
          await apiFetchJson(`/api/regions/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
          toast({ title: "Регион", message: "Регионът е обновен.", tone: "ok" });
        } else {
          await apiFetchJson(`/api/regions`, { method: "POST", body: JSON.stringify(payload) });
          toast({ title: "Регион", message: "Добавен нов регион.", tone: "ok" });
        }
        closeModal($("#modal-admin-region"));
        e.target.reset();
        $("#regId") && ($("#regId").value = "");
        await refreshFromApi();
      } catch {
        // Fallback demo mode
        const newId = id || `r-${String(Math.floor(Math.random() * 90) + 10)}`;
        const record = { id: newId, ...payload };
        const idx = regions.findIndex((r) => r.id === newId);
        if (idx >= 0) regions[idx] = record;
        else regions.unshift(record);
        renderAll();
        toast({ title: "Демо режим", message: "Регионът е запазен локално (без база).", tone: "warn" });
        closeModal($("#modal-admin-region"));
        e.target.reset();
        $("#regId") && ($("#regId").value = "");
      }
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
        $("#disDamage") && ($("#disDamage").value = d.damage ?? "");
        $("#disDuration") && ($("#disDuration").value = d.duration ?? "");
        $("#disNotes") && ($("#disNotes").value = d.notes ?? "");
        $("#disRichter") && ($("#disRichter").value = d.richter != null ? String(d.richter) : "");
        $("#disDepthKm") && ($("#disDepthKm").value = d.focal_depth_km != null ? String(d.focal_depth_km) : "");
        $("#disWind") && ($("#disWind").value = d.wind_gust_kmh != null ? String(d.wind_gust_kmh) : "");
        $("#disRain") && ($("#disRain").value = d.rainfall_mm != null ? String(d.rainfall_mm) : "");
        $("#disWaterCm") && ($("#disWaterCm").value = d.water_level_cm != null ? String(d.water_level_cm) : "");
        $("#disBurnedHa") && ($("#disBurnedHa").value = d.burned_area_ha != null ? String(d.burned_area_ha) : "");
        const t = $("#disTime");
        if (t) t.value = toDatetimeLocalValue(d.time);
        return;
      }

      const del = e.target.closest("[data-admin-delete-disaster]");
      if (del) {
        const id = del.getAttribute("data-admin-delete-disaster");
        (async () => {
          try {
            await apiFetchJson(`/api/disasters/${encodeURIComponent(id)}`, { method: "DELETE" });
            toast({ title: "Бедствие", message: "Записът е изтрит.", tone: "warn" });
            await refreshFromApi();
          } catch {
            const idx = disasters.findIndex((x) => x.id === id);
            if (idx >= 0) disasters.splice(idx, 1);
            renderAll();
            toast({ title: "Демо режим", message: "Записът е изтрит локално (без база).", tone: "warn" });
          }
        })();
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
        (async () => {
          try {
            await apiFetchJson(`/api/regions/${encodeURIComponent(id)}`, { method: "DELETE" });
            toast({ title: "Регион", message: "Регионът е изтрит.", tone: "warn" });
            await refreshFromApi();
          } catch {
            const idx = regions.findIndex((x) => x.id === id);
            if (idx >= 0) regions.splice(idx, 1);
            renderAll();
            toast({ title: "Демо режим", message: "Регионът е изтрит локално (без база).", tone: "warn" });
          }
        })();
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
  async function boot() {
    // Auth bootstrap
    if (setupAuthPages()) return;
    if (!requireAuthForApp()) return;

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
    setupLogoutButtons();

    // Initial render
    renderAll();
    await refreshFromApi();

    // Keep charts crisp on resize (lightweight)
    window.addEventListener("resize", () => {
      drawMonthlyChart($("#adminAnalyticsChart"), buildMonthlySeries());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    });
  } else {
    void boot();
  }
})();

