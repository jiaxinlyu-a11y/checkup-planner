/**
 * rules.js
 * ---------------------------------------------------------------------------
 * The rule logic for the check-up planner (index.html). One entry per rule =
 * one check-up item, who it applies to, its evidence level and its sources.
 * All wording (titles, reasons, details, tags) lives in js/i18n.js, keyed by
 * the rule `id`, so a rule here has no display text of its own.
 *
 * Rule fields
 *   id      unique id; also the key into RULE_TEXT in js/i18n.js
 *   group   1 age and sex | 2 lifestyle | 3 risk group, habits, work
 *           environment | 4 family history | 5 often offered but not advised
 *   level   guideline | consensus | regulatory | consider | against
 *   check   (p) => null (does not apply) or { why, level? }
 *           `why` is a key into that rule's `why` texts in i18n.js;
 *           `level` overrides the default when the match is weaker
 *   src     keys into SRC below
 *
 * Levels
 *   guideline   USPSTF grade A or B, or a formal guideline
 *   consensus   expert consensus (strength = share of expert votes)
 *   regulatory  occupational-health regulation or mandatory standard
 *   consider    weak evidence, or an inference from habits; never worded
 *               as "recommended" on the page
 *   against     a guideline, position statement or review advises against it
 *               for people without symptoms or a known risk; shown in its own
 *               group after the others, with no stars
 *
 * Stars (js/app.js, STARS): regulatory 5, guideline 4, consensus 3, consider 1,
 * against none. They show how strong the source is, not how serious the
 * disease is.
 *
 * Profile fields `p` (set in js/app.js): age, sex ("f"|"m"), bmi (number or
 * null), smoking ("never"|"former"|"current"), packYears, quitYears,
 * alcohol ("none"|"some"|"regular"), shortSleep, screenLong, eyeSymptoms,
 * takeout, infectionRisk, hbvContact, sexActive, hpHousehold, occ{noise,silica,lead,
 * benzene,formaldehyde,toluene,heat}, famBreast, famDiabetes, famCvd, famThyroid, thyroidSymptom,
 * thyroidRadiation, famCrc
 * ("none"|"under60"|"60plus"), famGastric.
 * ---------------------------------------------------------------------------
 */

const USPSTF_AB = "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics/uspstf-a-and-b-recommendations";

// Reference list. `label` is shown in the item and in the page footer.
const SRC = {
  uspstfAB: { url: USPSTF_AB, label: { en: "USPSTF A and B recommendations", zh: "USPSTF A/B 级推荐列表" } },
  uspstfDm: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes", label: { en: "USPSTF prediabetes and type 2 diabetes screening (2021)", zh: "USPSTF 糖尿病前期和 2 型糖尿病筛查（2021）" } },
  uspstfThyroid: { url: "https://www.aafp.org/pubs/afp/issues/2018/0315/od1.html", label: { en: "USPSTF thyroid cancer screening (2017), summary (AFP 2018)", zh: "USPSTF 甲状腺癌筛查（2017），摘要（AFP 2018）" } },
  uspstfOvarian: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/ovarian-cancer-screening", label: { en: "USPSTF ovarian cancer screening (2018)", zh: "USPSTF 卵巢癌筛查（2018）" } },
  uspstfPancreas: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/pancreatic-cancer-screening", label: { en: "USPSTF pancreatic cancer screening (2019)", zh: "USPSTF 胰腺癌筛查（2019）" } },
  uspstfEcg: { url: "https://uspreventiveservicestaskforce.org/uspstf/recommendation/cardiovascular-disease-risk-screening-with-electrocardiography", label: { en: "USPSTF cardiovascular disease risk screening with electrocardiography (2018)", zh: "USPSTF 心电图筛查心血管病风险（2018）" } },
  uspstfCarotid: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/carotid-artery-stenosis-screening", label: { en: "USPSTF carotid artery stenosis screening (2021)", zh: "USPSTF 颈动脉狭窄筛查（2021）" } },
  uspstfCopd: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/chronic-obstructive-pulmonary-disease-screening", label: { en: "USPSTF COPD screening (2022)", zh: "USPSTF 慢阻肺筛查（2022）" } },
  uspstfTestis: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/testicular-cancer-screening", label: { en: "USPSTF testicular cancer screening (2011)", zh: "USPSTF 睾丸癌筛查（2011）" } },
  tumorReview: { url: "https://journal.waocp.org/article_92301.html", label: { en: "Matsas et al. 2026, systematic review of tumor markers in people without symptoms (Asian Pacific J Cancer Prev)", zh: "Matsas 等 2026，无症状人群肿瘤标志物的系统综述（亚太癌症预防杂志）" } },
  acrWbct: { url: "https://acr.org/Advocacy/Position-Statements/Whole-Body-CT-Screening", label: { en: "American College of Radiology: whole-body CT screening (statement dated 2002)", zh: "美国放射学会（ACR）：全身 CT 筛查（2002 年声明）" } },
  uspstfCrc: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening", label: { en: "USPSTF colorectal cancer screening (2021)", zh: "USPSTF 结直肠癌筛查（2021）" } },
  acsCrc: { url: "https://www.cancer.org/cancer/types/colon-rectal-cancer/detection-diagnosis-staging/acs-recommendations.html", label: { en: "American Cancer Society: colorectal cancer screening", zh: "美国癌症协会（ACS）：结直肠癌筛查" } },
  cjeCrc: { url: "https://html.rhhz.net/zhlxbx/20210626.htm", label: { en: "Chinese Journal of Epidemiology 2021 review: colorectal screening starting age", zh: "中华流行病学杂志 2021 综述：结直肠癌筛查起始年龄" } },
  cnLipid: { url: "https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2023.1190934/full", label: { en: "2023 Chinese guideline for lipid management", zh: "2023 中国血脂管理指南" } },
  acsBreast: { url: "https://www.cancer.org/cancer/types/breast-cancer/screening-tests-and-early-detection/american-cancer-society-recommendations-for-the-early-detection-of-breast-cancer.html", label: { en: "American Cancer Society: breast cancer early detection", zh: "美国癌症协会（ACS）：乳腺癌早期发现" } },
  pumch: { url: "https://www.pumch.cn/en/detail/28686.html", label: { en: "Peking Union Medical College Hospital report on the Chinese breast screening guideline", zh: "北京协和医院关于中国乳腺癌筛查指南的报道" } },
  uspstfCerv: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening", label: { en: "USPSTF cervical cancer screening (2018)", zh: "USPSTF 宫颈癌筛查（2018）" } },
  cnCerv: { url: "https://gocm-frontend.bmj.com/content/3/4/189", label: { en: "China cervical cancer screening guideline (2023)", zh: "中国宫颈癌筛查指南（2023）" } },
  uspstfLung: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening", label: { en: "USPSTF lung cancer screening (2021)", zh: "USPSTF 肺癌筛查（2021）" } },
  acsLung: { url: "https://www.cancer.org/cancer/types/lung-cancer/detection-diagnosis-staging/detection.html", label: { en: "American Cancer Society: lung cancer screening", zh: "美国癌症协会（ACS）：肺癌筛查" } },
  cnLung: { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5973012", label: { en: "China low-dose CT lung cancer screening guideline (2018)", zh: "中国肺癌低剂量 CT 筛查指南（2018）" } },
  uspstfAlc: { url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/unhealthy-alcohol-use-in-adolescents-and-adults-screening-and-behavioral-counseling-interventions", label: { en: "USPSTF unhealthy alcohol use screening (2018)", zh: "USPSTF 危险饮酒筛查（2018）" } },
  acgAlc: { url: "https://www.aafp.org/afp/2025/0300/practice-guidelines-alcohol-associated-liver-disease", label: { en: "ACG guideline on alcohol-associated liver disease, summary (AFP 2025)", zh: "美国胃肠病学会（ACG）酒精性肝病指南摘要（AFP 2025）" } },
  hpFamily: { url: "https://gut.bmj.com/content/71/2/238", label: { en: "Chinese consensus on H. pylori infection in the family (Gut 2021)", zh: "中国家庭幽门螺杆菌感染共识（Gut 2021）" } },
  taipei: { url: "https://pubmed.ncbi.nlm.nih.gov/40912906/", label: { en: "Taipei Global Consensus II on H. pylori (2025)", zh: "Taipei Global Consensus II：幽门螺杆菌（2025）" } },
  oshaNoise: { url: "https://www.osha.gov/noise", label: { en: "OSHA: occupational noise exposure", zh: "美国 OSHA：职业噪声暴露" } },
  oshaSilica: { url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1053", label: { en: "OSHA 1910.1053: respirable crystalline silica", zh: "美国 OSHA 1910.1053：可吸入结晶二氧化硅" } },
  gbz: { url: null, label: { en: "GBZ 188-2025, Technical specifications for occupational health surveillance (National Health Commission of China, in force 2026-08-01)", zh: "GBZ 188—2025《职业健康监护技术规范》（国家卫生健康委员会，2026-08-01 实施）" } },
  aasm: { url: "https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/", label: { en: "AASM and Sleep Research Society consensus on sleep duration (2015)", zh: "美国睡眠医学会与睡眠研究学会关于睡眠时长的共识（2015）" } },
  eyewiki: { url: "https://eyewiki.aao.org/Computer_Vision_Syndrome_(Digital_Eye_Strain)", label: { en: "AAO EyeWiki: computer vision syndrome", zh: "美国眼科学会 EyeWiki：计算机视觉综合征" } },
  uspstfVision: { url: "https://www.aafp.org/afp/2022/0800/uspstf-impaired-visual-acuity", label: { en: "USPSTF impaired visual acuity screening, summary (AFP 2022)", zh: "USPSTF 视力损害筛查摘要（AFP 2022）" } },
  ascrs: { url: "https://www.aafp.org/pubs/afp/issues/2025/1200/practice-guidelines-hemorrhoids.html", label: { en: "ASCRS hemorrhoid guideline, summary (AFP 2025)", zh: "美国结直肠外科医师学会（ASCRS）痔疮指南摘要（AFP 2025）" } },
  usmstf: { url: "https://www.ajmc.com/view/us-multi-society-task-forces-new-colorectal-cancer-screening-recommendations", label: { en: "US Multi-Society Task Force colorectal recommendations 2017 (AJMC summary)", zh: "美国多学会工作组 2017 结直肠癌建议（AJMC 摘要）" } },
  cjeCrc2: { url: "https://html.rhhz.net/zhlxbx/20220919.htm", label: { en: "Chinese Journal of Epidemiology 2022 review: colorectal screening with family history", zh: "中华流行病学杂志 2022 综述：有家族史者的结直肠癌筛查" } },
};

const between = (x, lo, hi) => x >= lo && x <= hi;

const RULES = [
  // ---- Group 1: age and sex --------------------------------------------
  { id: "bp", group: 1, level: "guideline", src: ["uspstfAB"],
    check: p => p.age >= 18 ? { why: "a" } : null },
  { id: "glucose", group: 1, level: "guideline", src: ["uspstfDm"],
    check: p => {
      const over = p.bmi != null && p.bmi >= 25;
      if (over && between(p.age, 35, 70)) return { why: "a" };
      if (over && between(p.age, 18, 34)) return { why: "b", level: "consider" };
      if (p.famDiabetes && between(p.age, 18, 70)) return { why: "c", level: "consider" };
      return null;
    } },
  { id: "cv", group: 1, level: "guideline", src: ["uspstfAB", "cnLipid"],
    check: p => {
      if (between(p.age, 40, 75)) return { why: "a" };
      if (p.age >= 18 && p.famCvd) return { why: "c" };
      if (between(p.age, 18, 39) && p.bmi != null && p.bmi >= 25) return { why: "b", level: "consider" };
      return null;
    } },
  { id: "crc", group: 1, level: "guideline", src: ["uspstfCrc", "acsCrc", "cjeCrc", "ascrs"],
    check: p => {
      if (between(p.age, 45, 75)) return { why: "a" };
      if (between(p.age, 76, 85)) return { why: "b", level: "consider" };
      return null;
    } },
  { id: "mammo", group: 1, level: "guideline", src: ["uspstfAB", "acsBreast", "pumch"],
    check: p => p.sex === "f" && between(p.age, 40, 74) ? { why: "a" } : null },
  { id: "cervical", group: 1, level: "guideline", src: ["uspstfCerv", "cnCerv"],
    check: p => p.sex === "f" && between(p.age, 21, 65) ? { why: "a" } : null },
  { id: "hcv", group: 1, level: "guideline", src: ["uspstfAB"],
    check: p => between(p.age, 18, 79) ? { why: "a" } : null },
  { id: "hiv", group: 1, level: "guideline", src: ["uspstfAB"],
    check: p => between(p.age, 15, 65) ? { why: "a" } : null },
  { id: "mood", group: 1, level: "guideline", src: ["uspstfAB"],
    check: p => p.age >= 18 ? { why: p.age <= 64 ? "a" : "b" } : null },

  // ---- Group 2: lifestyle ----------------------------------------------
  { id: "lung", group: 2, level: "guideline", src: ["uspstfLung", "acsLung", "cnLung"],
    check: p => {
      if (p.smoking === "never") return null;
      if (!between(p.age, 50, 80) || p.packYears < 20) return null;
      if (p.smoking === "former" && p.quitYears > 15) return null;
      return { why: p.smoking === "current" ? "a" : "b" };
    } },
  { id: "aaa", group: 2, level: "guideline", src: ["uspstfAB"],
    check: p => p.sex === "m" && between(p.age, 65, 75) && p.smoking !== "never" ? { why: "a" } : null },
  { id: "quit", group: 2, level: "guideline", src: ["uspstfAB"],
    check: p => p.smoking === "current" && p.age >= 18 ? { why: "a" } : null },
  { id: "auditc", group: 2, level: "guideline", src: ["uspstfAlc", "acgAlc"],
    check: p => p.age >= 18 && p.alcohol !== "none" ? { why: "a" } : null },
  { id: "fibrosis", group: 2, level: "consider", src: ["acgAlc"],
    check: p => p.age >= 18 && p.alcohol === "regular" ? { why: "a" } : null },
  { id: "sleep", group: 2, level: "consider", src: ["aasm"],
    check: p => p.age >= 18 && p.shortSleep ? { why: "a" } : null },
  { id: "eye", group: 2, level: "consider", src: ["eyewiki", "uspstfVision"],
    check: p => p.screenLong && p.eyeSymptoms ? { why: "a" } : null },

  // ---- Group 3: risk group, habits, work environment --------------------
  { id: "hbv", group: 3, level: "guideline", src: ["uspstfAB"],
    check: p => {
      if (p.age < 15) return null;
      if (p.hbvContact) return { why: "b" };
      return p.infectionRisk ? { why: "a" } : null;
    } },
  { id: "syphilis", group: 3, level: "guideline", src: ["uspstfAB"],
    check: p => p.age >= 15 && p.infectionRisk ? { why: "a" } : null },
  { id: "chlamydia", group: 3, level: "guideline", src: ["uspstfAB"],
    check: p => {
      if (p.sex !== "f") return null;
      if (p.age <= 24 && p.sexActive) return { why: "a" };
      if (p.age >= 25 && p.infectionRisk) return { why: "b" };
      return null;
    } },
  { id: "ltbi", group: 3, level: "guideline", src: ["uspstfAB"],
    check: p => p.age >= 18 && p.infectionRisk ? { why: "a" } : null },
  { id: "hp-house", group: 3, level: "consensus", src: ["hpFamily", "taipei"],
    check: p => p.hpHousehold ? { why: "a" } : null },
  { id: "hp-fam", group: 3, level: "consensus", src: ["hpFamily", "taipei"],
    check: p => p.famGastric ? { why: "a" } : null },
  { id: "hp-takeout", group: 3, level: "consider", src: ["hpFamily"],
    check: p => p.takeout ? { why: "a" } : null },
  { id: "noise", group: 3, level: "regulatory", src: ["oshaNoise", "gbz"],
    check: p => p.occ.noise ? { why: "a" } : null },
  { id: "silica", group: 3, level: "regulatory", src: ["oshaSilica", "gbz"],
    check: p => p.occ.silica ? { why: "a" } : null },
  { id: "lead", group: 3, level: "regulatory", src: ["gbz"],
    check: p => p.occ.lead ? { why: "a" } : null },
  { id: "benzene", group: 3, level: "regulatory", src: ["gbz"],
    check: p => p.occ.benzene ? { why: "a" } : null },
  { id: "formaldehyde", group: 3, level: "regulatory", src: ["gbz"],
    check: p => p.occ.formaldehyde ? { why: "a" } : null },
  { id: "toluene", group: 3, level: "regulatory", src: ["gbz"],
    check: p => p.occ.toluene ? { why: "a" } : null },
  { id: "heat", group: 3, level: "regulatory", src: ["gbz"],
    check: p => p.occ.heat ? { why: "a" } : null },

  // ---- Group 4: family history ------------------------------------------
  { id: "brca", group: 4, level: "guideline", src: ["uspstfAB"],
    check: p => p.sex === "f" && p.famBreast ? { why: "a" } : null },
  { id: "crc-fam", group: 4, level: "guideline", src: ["usmstf", "cjeCrc2"],
    check: p => {
      if (p.famCrc === "under60") return { why: "a" };
      if (p.famCrc === "60plus") return { why: "b" };
      return null;
    } },

  // ---- Group 5: often offered, but not advised ----------------------------
  { id: "thyroid-us", group: 5, level: "against", src: ["uspstfThyroid"],
    check: p => {
      if (p.age < 18) return null;
      if (p.thyroidSymptom) return { why: "c", level: "consider" };
      if (p.famThyroid || p.thyroidRadiation) return { why: "b", level: "consider" };
      return { why: "a" };
    } },
  { id: "ovarian-us", group: 5, level: "against", src: ["uspstfOvarian"],
    check: p => {
      if (p.sex !== "f" || p.age < 18) return null;
      if (p.famBreast) return null; // recommendation excludes known high-risk hereditary syndromes
      return { why: "a" };
    } },
  { id: "pancreas-scan", group: 5, level: "against", src: ["uspstfPancreas"],
    check: p => p.age >= 18 ? { why: "a" } : null },
  { id: "ecg", group: 5, level: "against", src: ["uspstfEcg"],
    // USPSTF: D for low risk, I (insufficient) for intermediate/high risk. This
    // tool cannot compute risk, so it only treats clearly low-risk adults as low risk.
    check: p => {
      const low = p.age >= 18 && p.age < 40 && p.smoking !== "current" && !p.famCvd && !(p.bmi != null && p.bmi >= 30);
      return low ? { why: "a" } : null;
    } },
  { id: "carotid-us", group: 5, level: "against", src: ["uspstfCarotid"],
    check: p => p.age >= 18 ? { why: "a" } : null },
  { id: "copd-spiro", group: 5, level: "against", src: ["uspstfCopd"],
    check: p => p.age >= 18 ? { why: "a" } : null },
  { id: "testis-exam", group: 5, level: "against", src: ["uspstfTestis"],
    check: p => p.sex === "m" && p.age >= 15 ? { why: "a" } : null },
  { id: "tumor-markers", group: 5, level: "against", src: ["tumorReview"],
    check: p => p.age >= 18 ? { why: "a" } : null },
  { id: "wbct", group: 5, level: "against", src: ["acrWbct"],
    check: p => p.age >= 18 ? { why: "a" } : null },
];
