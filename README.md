# Check-up Planner

English | [中文](README.zh-CN.md)

A small web tool that builds a personalised check-up plan instead of the default hospital package. You enter age, sex, height and weight, lifestyle, work environment and (optionally) family history; it lists the check-up items that apply, each with an evidence level and its sources. The page works in English and Chinese.

Everything runs in the browser. Nothing you enter is sent or stored (only your language choice is remembered). There is no build step and no dependency.

## Run it

Open `index.html` in a browser. To serve it locally instead:

```
python -m http.server 8000
```

then visit `http://localhost:8000`.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The page: the question form, the results area, the sources section |
| `js/rules.js` | The rule logic (`RULES`) and the reference list (`SRC`) |
| `js/i18n.js` | All display text in English and Chinese: form labels, titles, reasons, details, tags |
| `js/app.js` | Reads the form, runs every rule, draws the matching items, switches language |
| `css/style.css` | Layout and colours; light and dark follow the system setting |

## How a rule works

Each entry in `RULES` is one check-up item. It carries the logic only:

```js
{ id: "hcv", group: 1, level: "guideline", src: ["uspstfAB"],
  check: p => between(p.age, 18, 79) ? { why: "a" } : null }
```

`check` receives the answers and returns `null` (does not apply) or `{ why, level? }`. `why` picks one of the reason texts for that rule; `level` is only returned when the match is weaker than the rule's normal level, for example when the person is outside the age range a guideline studied.

The wording lives in `js/i18n.js`, under the same `id`, once per language:

```js
hcv: { title: "Hepatitis C antibody", tag: "USPSTF B (2020)",
  why: { a: "Adults 18 to 79" },
  detail: "USPSTF recommends hepatitis C screening in adults 18 to 79." }
```

To add a rule: append an entry to `RULES`, add its text under `I18N.en.rules` and `I18N.zh.rules`, and add any new references to `SRC` (with an English and a Chinese label).

## Evidence levels

- **Guideline** (4 stars): USPSTF grade A or B, or a formal guideline.
- **Consensus** (3 stars): an expert consensus; its strength is the share of expert votes, not a formal evidence grade.
- **Regulatory** (5 stars): an occupational-health regulation or mandatory standard (US OSHA, China GBZ 188-2025).
- **Consider** (1 star): weak evidence, or an inference from habits. Shown as a suggestion, never as a recommendation.
- **Not advised** (no stars): a guideline, position statement or review advises against it for people without symptoms or a known risk. These items appear in their own group after the others, and each row says who advises against it and why in one or two sentences. There are nine: thyroid ultrasound, ovarian cancer screening (CA-125, transvaginal ultrasound), pancreatic cancer screening scans, ECG for low-risk adults, carotid ultrasound, spirometry for COPD, testicular exam, tumor-marker blood tests (a 2026 systematic review, not a guideline) and whole-body CT (an ACR statement dated 2002).

Stars show how strong the source is, not how serious the disease is or how much you personally need the test. The mapping is one line in `js/app.js` (`STARS`).

## Sources

41 rules, mostly from the US Preventive Services Task Force, with American Cancer Society and ACG guidance, Chinese guidelines (lipids 2023, cervical screening 2023, low-dose CT lung screening 2018, H. pylori family consensus 2021), OSHA, and the Chinese occupational-health standard GBZ 188-2025. The full reference list is in the page footer and in `SRC`. Where US and Chinese numbers differ, both are written into the item. Some Chinese colorectal family-history figures are quoted from a review rather than the guideline itself, and the item says so.

The tool does not recommend supplements. Habit-based triggers (takeout and shared dishes for H. pylori, short sleep, long screen time) are labelled "Consider" and say plainly that they are inferences or associations.

## Limits

- The rules were written from the sources above and have not been reviewed by a clinician.
- Infection-risk questions use a single "higher risk" checkbox; the definitions live in the USPSTF pages.
- Occupational rules cover seven exposures: noise, silica dust, lead, benzene, formaldehyde, toluene or xylene, and heat. GBZ 188-2025 covers many more.
- BMI 25 is used as the overweight line for the glucose rule.

## Disclaimer

This is a screening reference based on published guidelines. It is not a diagnosis and cannot replace a doctor's advice.
