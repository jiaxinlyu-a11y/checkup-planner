/**
 * app.js
 * ---------------------------------------------------------------------------
 * UI for the check-up planner. Reads the answers on the page, runs every rule
 * in RULES (js/rules.js) and draws the matching items in the chosen language
 * (text from js/i18n.js). Everything runs in the browser; nothing is sent.
 * The chosen language is remembered in localStorage (if it is available).
 * ---------------------------------------------------------------------------
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const num = (id) => {
    const v = parseFloat($(id).value);
    return isNaN(v) ? null : v;
  };
  const radio = (name) => {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  };
  const chk = (id) => $(id).checked;

  // ---- language ----------------------------------------------------------
  let lang = "en";
  try {
    const saved = localStorage.getItem("checkup-lang");
    if (saved === "en" || saved === "zh") lang = saved;
    else if ((navigator.language || "").toLowerCase().indexOf("zh") === 0) lang = "zh";
  } catch (e) {
    if ((navigator.language || "").toLowerCase().indexOf("zh") === 0) lang = "zh";
  }
  const ui = (key) => I18N[lang].ui[key];

  // Fill every element that carries a data-i18n / data-i18n-html key.
  function applyStatic() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = ui("title");
    document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = ui(e.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((e) => { e.innerHTML = ui(e.dataset.i18nHtml); });
  }

  // ---- answers -----------------------------------------------------------
  function readProfile() {
    const h = num("height"), w = num("weight");
    const bmi = h && w && h > 100 && h < 230 ? w / Math.pow(h / 100, 2) : null;
    return {
      age: num("age"),
      sex: radio("sex"),
      bmi: bmi,
      smoking: radio("smoking") || "never",
      packYears: num("packYears") || 0,
      quitYears: num("quitYears") || 0,
      alcohol: radio("alcohol") || "none",
      shortSleep: chk("shortSleep"),
      screenLong: chk("screenLong"),
      eyeSymptoms: chk("eyeSymptoms"),
      takeout: chk("takeout"),
      infectionRisk: chk("infectionRisk"),
      hbvContact: chk("hbvContact"),
      sexActive: chk("sexActive"),
      hpHousehold: chk("hpHousehold"),
      occ: {
        noise: chk("occNoise"), silica: chk("occSilica"), lead: chk("occLead"),
        benzene: chk("occBenzene"), formaldehyde: chk("occFormaldehyde"),
        toluene: chk("occToluene"), heat: chk("occHeat"),
      },
      famBreast: chk("famBreast"),
      famDiabetes: chk("famDiabetes"),
      famCvd: chk("famCvd"),
      famThyroid: chk("famThyroid"),
      thyroidSymptom: chk("thyroidSymptom"),
      thyroidRadiation: chk("thyroidRadiation"),
      famCrc: radio("famCrc") || "none",
      famGastric: chk("famGastric"),
    };
  }

  // Show or hide the follow-up questions that only matter in some cases.
  function syncVisibility(p) {
    $("smokeDetail").hidden = p.smoking === "never";
    $("quitWrap").hidden = p.smoking !== "former";
    $("eyeWrap").hidden = !p.screenLong;
    $("sexActiveWrap").hidden = !(p.sex === "f" && p.age != null && p.age <= 24);
    $("famBreastWrap").hidden = p.sex !== "f";
    $("bmiOut").textContent = p.bmi ? "BMI " + p.bmi.toFixed(1) : "";
  }

  // ---- drawing -----------------------------------------------------------
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function sourceNode(key) {
    const s = SRC[key];
    const label = s.label[lang];
    if (!s.url) return document.createTextNode(label);
    const a = el("a", null, label);
    a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    return a;
  }

  // Stars show the strength of the source (see the legend on the page).
  // "against" has none: those items are things to skip, not to do.
  const STARS = { regulatory: 5, guideline: 4, consensus: 3, consider: 1, against: 0 };

  function starsNode(n) {
    const s = el("span", "stars", "\u2605".repeat(n) + "\u2606".repeat(5 - n));
    s.title = ui("starsLabel").replace("{n}", n);
    s.setAttribute("aria-label", s.title);
    return s;
  }

  function renderItem(rule, m) {
    const text = I18N[lang].rules[rule.id];
    const level = m.level || rule.level;
    const d = el("details", "ck-item");
    const s = el("summary");
    s.appendChild(el("span", "t", text.title));
    const box = el("span", "lvbox");
    if (STARS[level] > 0) box.appendChild(starsNode(STARS[level]));
    box.appendChild(el("span", "lv lv-" + level, I18N[lang].levels[level]));
    s.appendChild(box);
    s.appendChild(el("span", "why", text.why[m.why]));
    // For items advised against, say right on the row who advises it and why.
    if (level === "against" && text.reason) s.appendChild(el("span", "reason", text.reason));
    d.appendChild(s);

    const body = el("div", "body");
    const weaker = m.level && m.level !== rule.level;
    const tag = (text.tagWhy && text.tagWhy[m.why]) || (weaker ? ui("outsideRange") : text.tag);
    body.appendChild(el("p", "tagline", tag));
    text.detail.split("\n\n").forEach((para) => body.appendChild(el("p", null, para)));
    const src = el("p", "srcline");
    src.appendChild(document.createTextNode(ui("sources")));
    rule.src.forEach((k, i) => {
      if (i) src.appendChild(document.createTextNode(lang === "zh" ? "；" : "; "));
      src.appendChild(sourceNode(k));
    });
    body.appendChild(src);
    d.appendChild(body);
    return d;
  }

  function render() {
    const p = readProfile();
    syncVisibility(p);
    const out = $("results");
    out.textContent = "";

    if (p.age == null || p.age < 15 || p.age > 110 || !p.sex) {
      out.appendChild(el("div", "ck-empty", ui("empty")));
      return;
    }

    const hits = [];
    RULES.forEach((r) => {
      const m = r.check(p);
      if (m) hits.push({ r: r, m: m });
    });

    const sum = el("p", "ck-summary");
    // Items advised against are not counted: they are things to skip.
    const n = hits.filter((h) => h.r.group !== 5).length;
    sum.innerHTML = n === 1 ? ui("summaryOne") : ui("summary").replace("{n}", n);
    out.appendChild(sum);

    [1, 2, 3, 4, 5].forEach((g) => {
      const rows = hits.filter((h) => h.r.group === g);
      if (!rows.length) return;
      const sec = el("section", "ck-group");
      sec.appendChild(el("h2", null, I18N[lang].groups[g].title));
      sec.appendChild(el("p", "gnote", I18N[lang].groups[g].note));
      rows.forEach((h) => sec.appendChild(renderItem(h.r, h.m)));
      out.appendChild(sec);
    });
  }

  function renderSources() {
    const ul = $("srcList");
    ul.textContent = "";
    Object.keys(SRC).forEach((k) => {
      const li = el("li");
      li.appendChild(sourceNode(k));
      ul.appendChild(li);
    });
  }

  function refresh() {
    applyStatic();
    renderSources();
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("ck-form").addEventListener("input", render);
    $("ck-form").addEventListener("change", render);
    $("langBtn").addEventListener("click", function () {
      lang = lang === "en" ? "zh" : "en";
      try { localStorage.setItem("checkup-lang", lang); } catch (e) {}
      refresh();
    });
    refresh();
  });
})();
