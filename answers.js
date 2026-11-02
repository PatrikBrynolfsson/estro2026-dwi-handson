/* The digital worksheet, shared by the three hands-on pages and answers.html.
 *
 * Each question belongs to one task on a page: its id is the id of that task's checkbox (t1-2, b-3, c2-1 ...).
 * On a page, answers.js puts the answer fields under the task text. On answers.html, Worksheet.renderSummary()
 * lists every answer. Answers are saved in this browser only (localStorage, one key for the whole site).
 * Fields marked predict: true are locked with "Lock my prediction" before pairs check the answer.
 *
 * Field types: text (one line), long (a few lines), num (a number, with unit), choice (pick one),
 * multi (pick any), grid (a table of numbers).
 * Two sets: the DWI group (default) and the PET group. A PET page sets window.WORKSHEET = "pet" before loading
 * this file; each set has its own questions, storage key and "My answers" page.
 * Load after stepper.js. Uses the page's colour tokens.
 */
(() => {
  "use strict";
  const ADC = "× 10⁻³ mm²/s";
  const DWI_BLOCKS = {
    A: { title: "Block A · ADC & IVIM sandbox", page: "sandbox.html" },
    B: { title: "Block B · Has the tumour responded?", page: "prostate.html" },
    C: { title: "Block C · Contouring on DWI", page: "contour.html" },
  };
  const DWI_Q = [
    // ---- Block A, tab 1
    { id: "t1-1", block: "A", group: "Tab 1 · Same brain, different ADC", no: "1", q: "Which parts lose the most signal between b 0 and b 100?",
      fields: [{ k: "a", type: "text" }] },
    { id: "t1-2", block: "A", group: "Tab 1 · Same brain, different ADC", no: "2", q: "Brain tissue: ADC with each choice of b-values",
      fields: [{ k: "b0", type: "num", label: "b 0 & 800", unit: ADC }, { k: "b200", type: "num", label: "b 200 & 800", unit: ADC }] },
    { id: "t1-3", block: "A", group: "Tab 1 · Same brain, different ADC", no: "3", q: "Which region has the biggest difference between the two ADCs?",
      fields: [{ k: "pred", type: "choice", label: "My prediction", options: ["Brain tissue", "CSF", "Vessels + CSF"], predict: true },
        { k: "brain", type: "num", label: "Brain", unit: "%" }, { k: "csf", type: "num", label: "CSF", unit: "%" },
        { k: "ves", type: "num", label: "Vessels + CSF", unit: "%" }] },
    { id: "t1-4", block: "A", group: "Tab 1 · Same brain, different ADC", no: "4", q: "How much of the 11 % does the b 0 difference account for?",
      fields: [{ k: "one", type: "num", label: "Only one scan used b 0", unit: "% of the 11 %" }, { k: "both", type: "text", label: "Both used b 0" }] },
    { id: "t1-5", block: "A", group: "Tab 1 · Same brain, different ADC", no: "5", q: "Why do the vessels in the Sylvian fissure light up?",
      fields: [{ k: "a", type: "text" }] },
    // ---- Block A, tab 2
    { id: "t2-1", block: "A", group: "Tab 2 · Treatment", no: "1", q: "Predict the ADC before and after treatment",
      fields: [{ k: "pred", type: "grid", rows: ["b 0 & 800", "b 200 & 800"], cols: ["Before", "After"], unit: ADC, predict: true }] },
    { id: "t2-2", block: "A", group: "Tab 2 · Treatment", no: "2", q: "The real ADC values. Which b-values see a change?",
      fields: [{ k: "real", type: "grid", rows: ["b 0 & 800", "b 200 & 800"], cols: ["Before", "After", "Change %"], unit: ADC },
        { k: "which", type: "text", label: "Which b-values see a change?" }] },
    { id: "t2-3", block: "A", group: "Tab 2 · Treatment", no: "3", q: "Bigger than 11 %? Response or no response?",
      fields: [{ k: "verdict", type: "choice", options: ["Response", "No response", "Depends on the b-values"] }, { k: "why", type: "text", label: "Why" }] },
    { id: "t2-4", block: "A", group: "Tab 2 · Treatment", no: "4", q: "Is a lowest b-value of 50 enough?", fields: [{ k: "a", type: "text" }] },
    // ---- Block A, tab 3
    { id: "t3-1", block: "A", group: "Tab 3 · Noise", no: "1", q: "Which IVIM map shows clear anatomy, and which looks like noise?",
      fields: [{ k: "clear", type: "choice", label: "Clear", options: ["D", "f", "D*"], predict: true },
        { k: "noise", type: "choice", label: "Noise", options: ["D", "f", "D*"], predict: true }] },
    { id: "t3-2", block: "A", group: "Tab 3 · Noise", no: "2", q: "Were you right?", fields: [{ k: "a", type: "choice", options: ["Yes", "No"] }] },
    { id: "t3-3", block: "A", group: "Tab 3 · Noise", no: "3", q: "CSF behind the midbrain: blood fraction f",
      fields: [{ k: "f", type: "num", label: "f =" }, { k: "sense", type: "text", label: "Does that make sense?" }] },
    { id: "t3-4", block: "A", group: "Tab 3 · Noise", no: "4", q: "SNR 50, 10 scans: which stay close to the true value?",
      fields: [{ k: "a", type: "multi", options: ["D", "f", "D*"] }] },
    { id: "t3-5", block: "A", group: "Tab 3 · Noise", no: "5", q: "SNR 20, 10 scans: which stay close to the true value?",
      fields: [{ k: "a", type: "multi", options: ["D", "f", "D*"] }] },
    // ---- Block B
    { id: "b-2", block: "B", group: "Prostate, two scans 13 days apart", no: "2", q: "Expert ROI drawn on ADC: mean ADC",
      fields: [{ k: "s1", type: "num", label: "Scan 1", unit: ADC }, { k: "s2", type: "num", label: "Scan 2", unit: ADC },
        { k: "ch", type: "num", label: "Change", unit: "%" }] },
    { id: "b-3", block: "B", group: "Prostate, two scans 13 days apart", no: "3", q: "Change the ROI: values on scan 1",
      fields: [{ k: "t", type: "grid", rows: ["Expert, on ADC", "Grown 2 mm", "Shrunk 2 mm", "Expert, on T2w"], cols: ["Mean", "Median", "10th pct"], unit: ADC },
        { k: "least", type: "choice", label: "Moves least", options: ["Mean", "Median", "10th percentile"] }] },
    { id: "b-4", block: "B", group: "Prostate, two scans 13 days apart", no: "4", q: "Before treatment, then two weeks in: has the tumour responded?",
      fields: [{ k: "pred", type: "choice", options: ["Yes", "No", "Cannot tell"], predict: true }, { k: "why", type: "text", label: "Why", predict: true }] },
    { id: "b-5", block: "B", group: "Prostate, two scans 13 days apart", no: "5", q: "Does your conclusion depend on which ROI you used?",
      fields: [{ k: "a", type: "text" }] },
    // ---- Block C
    { id: "c1-3", block: "C", group: "Contouring", no: "1", q: "Your outline on T2w", fields: [{ k: "v", type: "num", label: "Volume", unit: "cm³" }] },
    { id: "c2-1", block: "C", group: "Contouring", no: "2", q: "On DWI, your outline will be ...",
      fields: [{ k: "pred", type: "choice", options: ["bigger", "the same", "smaller"], predict: true }] },
    { id: "c2-3", block: "C", group: "Contouring", no: "2", q: "Your outline on DWI", fields: [{ k: "v", type: "num", label: "Volume", unit: "cm³" }] },
    { id: "c3-1", block: "C", group: "Contouring", no: "3", q: "Was your prediction right?", fields: [{ k: "a", type: "choice", options: ["Yes", "No"] }] },
    { id: "c3-2", block: "C", group: "Contouring", no: "3", q: "Overlap of your two outlines", fields: [{ k: "d", type: "num", label: "Dice" }] },
    { id: "c3-4", block: "C", group: "Contouring", no: "3", q: "Shift at the back of the prostate (ruler)", fields: [{ k: "mm", type: "num", label: "Ruler", unit: "mm" }] },
    { id: "c3-5", block: "C", group: "Contouring", no: "3", q: "Where does the DWI prostate end?", fields: [{ k: "a", type: "text" }] },
    { id: "c4-1", block: "C", group: "Discuss", no: "1", q: "The ADC outline as GTV, boost volume, or guide only?",
      fields: [{ k: "use", type: "choice", options: ["GTV", "Boost volume", "Guide only"] }, { k: "why", type: "text", label: "Why" }] },
    { id: "c4-2", block: "C", group: "Discuss", no: "2", q: "Margin that would cover the shift you measured", fields: [{ k: "mm", type: "num", label: "Margin", unit: "mm" }] },
    { id: "c4-3", block: "C", group: "Discuss", no: "3", q: "Would distortion correction or registration remove the shift? What would you check?",
      fields: [{ k: "a", type: "long" }] },
  ];
  const DWI_CHECKLIST = ["Which b-values?", "Whose ROI?", "Bigger than the repeatability?", "Geometrically trustworthy?"];

  // ---------------- PET group ----------------
  const PET_BLOCKS = {
    A: { title: "Block A · SUV from the DICOM header", page: "pet_suv.html" },
    B: { title: "Block B · Attenuation correction", page: "pet_ac.html" },
    C: { title: "Block C · Reconstruction and lesion size", page: "pet_recon.html" },
    D: { title: "Block D · Contouring on PET", page: "pet_contour.html" },
  };
  const PET_Q = [
    // ---- Block A, step 1: the image
    { id: "pa1-1", block: "A", group: "1 · The image", no: "1", q: "Where is the tumour?",
      fields: [{ k: "a", type: "choice", options: ["Right upper lobe", "Right lower lobe", "Left upper lobe", "Left lower lobe"] }] },
    { id: "pa1-2", block: "A", group: "1 · The image", no: "2", q: "Window SUV 0–5 instead of 0–20: the tumour looks ...",
      fields: [{ k: "pred", type: "choice", options: ["bigger", "the same", "smaller"], predict: true },
        { k: "why", type: "text", label: "What did you see?" }] },
    { id: "pa1-3", block: "A", group: "1 · The image", no: "3", q: "The hottest voxel in the tumour",
      fields: [{ k: "suv", type: "num", label: "SUVmax" }, { k: "mean", type: "num", label: "SUVmean in your circle" }] },
    { id: "pa1-4", block: "A", group: "1 · The image", no: "4", q: "What else lights up on the MIP? Is it cancer?", fields: [{ k: "a", type: "text" }] },
    // ---- Block A, step 2: the header
    { id: "pa2-2", block: "A", group: "2 · The DICOM header", no: "2", q: "Which time do you use for the decay correction?",
      fields: [{ k: "pred", type: "choice", options: ["Series Time", "Acquisition Time"], predict: true }] },
    { id: "pa2-3", block: "A", group: "2 · The DICOM header", no: "3", q: "SUVmax by hand",
      fields: [{ k: "up", type: "num", label: "Uptake time", unit: "min" }, { k: "frac", type: "num", label: "Fraction of the dose left" },
        { k: "dose", type: "num", label: "Dose at scan start", unit: "MBq" }, { k: "suv", type: "num", label: "SUVmax" }] },
    { id: "pa2-4", block: "A", group: "2 · The DICOM header", no: "4", q: "Bonus: SUVmax per lean body mass (SUL)",
      fields: [{ k: "lbm", type: "num", label: "Lean body mass", unit: "kg" }, { k: "sul", type: "num", label: "SULmax" }] },
    // ---- Block A, step 3: what if
    { id: "pa3-1", block: "A", group: "3 · What if", no: "1", q: "Weight typed in pounds (154 instead of 70 kg): SUVmax?",
      fields: [{ k: "pred", type: "num", label: "My prediction", predict: true }, { k: "real", type: "num", label: "What you found" }] },
    { id: "pa3-2", block: "A", group: "3 · What if", no: "2", q: "Injection-room clock 30 min slow: SUVmax goes up or down, and by how much?",
      fields: [{ k: "pred", type: "num", label: "My prediction", unit: "% change", predict: true }, { k: "real", type: "num", label: "What you found", unit: "% change" }] },
    { id: "pa3-3", block: "A", group: "3 · What if", no: "3", q: "10 % of the dose stayed in the syringe: which SUVmax is right?",
      fields: [{ k: "pred", type: "choice", options: ["The one on the screen", "Higher", "Lower"], predict: true }, { k: "real", type: "num", label: "Corrected SUVmax" }] },
    { id: "pa3-4", block: "A", group: "3 · What if", no: "4", q: "Scanned at 90 instead of 55 min: can the calculation correct for it?",
      fields: [{ k: "a", type: "choice", options: ["Yes", "No"] }, { k: "why", type: "text", label: "Why" }] },
    { id: "pa3-5", block: "A", group: "3 · What if", no: "5", q: "A follow-up scan: what do you check in the DICOM header before you compare SUVs?",
      fields: [{ k: "a", type: "long" }] },
    // ---- Block B
    { id: "pb1-1", block: "B", group: "1 · With and without AC", no: "1", q: "Without AC: what looks too bright, and what too dark?",
      fields: [{ k: "pred", type: "text", label: "My prediction", predict: true }, { k: "seen", type: "text", label: "What I saw" }] },
    { id: "pb1-2", block: "B", group: "1 · With and without AC", no: "2", q: "Tumour ÷ liver, with and without AC",
      fields: [{ k: "ac", type: "num", label: "With AC" }, { k: "nac", type: "num", label: "Without AC" },
        { k: "more", type: "choice", label: "Tumour stands out more", options: ["With AC", "Without AC"] }] },
    { id: "pb1-3", block: "B", group: "1 · With and without AC", no: "3", q: "Why is the centre dark without AC, and the lungs and skin bright?", fields: [{ k: "a", type: "text" }] },
    { id: "pb1-4", block: "B", group: "1 · With and without AC", no: "4", q: "Bonus: an SUV without AC?", fields: [{ k: "a", type: "text" }] },
    { id: "pb2-1", block: "B", group: "2 · Breathing", no: "1", q: "CT with the diaphragm 2 cm higher: the tumour SUVmax ...",
      fields: [{ k: "pred", type: "choice", label: "My prediction", options: ["goes up", "stays the same", "goes down"], predict: true },
        { k: "real", type: "num", label: "SUVmax you measured" }] },
    { id: "pb2-2", block: "B", group: "2 · Breathing", no: "2", q: "Coronal, Change: where are the errors, too high or too low?", fields: [{ k: "a", type: "text" }] },
    { id: "pb2-3", block: "B", group: "2 · Breathing", no: "3", q: "The biggest error in the tumour SUVmax",
      fields: [{ k: "ct", type: "text", label: "Which CT" }, { k: "pct", type: "num", label: "Change", unit: "%" }] },
    { id: "pb2-4", block: "B", group: "2 · Breathing", no: "4", q: "In clinic, what tells you the CT and the PET do not match?", fields: [{ k: "a", type: "text" }] },
    { id: "pb2-5", block: "B", group: "2 · Breathing", no: "5", q: "Bonus: how could the department make this error smaller?", fields: [{ k: "a", type: "long" }] },
    // ---- Block C
    { id: "pc1-1", block: "C", group: "1 · Iterations and filter", no: "1", q: "More iterations: what happens to ...",
      fields: [{ k: "max", type: "choice", label: "Tumour SUVmax", options: ["up", "same", "down"], predict: true },
        { k: "mean", type: "choice", label: "Liver mean", options: ["up", "same", "down"], predict: true },
        { k: "noise", type: "choice", label: "Noise", options: ["up", "same", "down"], predict: true }] },
    { id: "pc1-2", block: "C", group: "1 · Iterations and filter", no: "2", q: "No filter: tumour SUVmax and liver noise",
      fields: [{ k: "t", type: "grid", rows: ["Tumour SUVmax", "Liver noise (SD %)"], cols: ["1 it", "3 it", "12 it"] }] },
    { id: "pc1-3", block: "C", group: "1 · Iterations and filter", no: "3", q: "3 iterations, with a filter",
      fields: [{ k: "suv", type: "num", label: "SUVmax with 5 mm" }, { k: "a", type: "text", label: "What the filter does" }] },
    { id: "pc1-4", block: "C", group: "1 · Iterations and filter", no: "4", q: "The hospital said 12.49. Which is her real SUVmax?", fields: [{ k: "a", type: "text" }] },
    { id: "pc1-5", block: "C", group: "1 · Iterations and filter", no: "5", q: "Bonus: follow-up in another hospital: what do you ask?", fields: [{ k: "a", type: "long" }] },
    { id: "pc2-1", block: "C", group: "2 · Lesion size", no: "1", q: "Will all six spheres show the same maximum?",
      fields: [{ k: "pred", type: "choice", options: ["All the same", "Small ones lower", "Small ones higher"], predict: true }] },
    { id: "pc2-2", block: "C", group: "2 · Lesion size", no: "2", q: "Recovery at 3 iterations + 5 mm",
      fields: [{ k: "s10", type: "num", label: "10 mm", unit: "%" }, { k: "s37", type: "num", label: "37 mm", unit: "%" }] },
    { id: "pc2-3", block: "C", group: "2 · Lesion size", no: "3", q: "From what size do spheres read about right?", fields: [{ k: "mm", type: "num", label: "Size", unit: "mm" }] },
    { id: "pc2-4", block: "C", group: "2 · Lesion size", no: "4", q: "A reconstruction with all six inside the EARL range", fields: [{ k: "a", type: "text" }] },
    { id: "pc2-5", block: "C", group: "2 · Lesion size", no: "5", q: "Bonus: a 1 cm node reads SUVmax 3. Its true SUV?", fields: [{ k: "suv", type: "num", label: "True SUV about" }] },
    // ---- Block D
    { id: "pd1-2", block: "D", group: "1 · Draw", no: "2", q: "Your outline",
      fields: [{ k: "v", type: "num", label: "Volume", unit: "mL" }, { k: "win", type: "choice", label: "Window", options: ["0–5", "0–10", "0–20"] }] },
    { id: "pd1-3", block: "D", group: "1 · Draw", no: "3", q: "Another window: would you draw it differently?", fields: [{ k: "a", type: "text" }] },
    { id: "pd2-1", block: "D", group: "2 · Automatic methods", no: "1", q: "Biggest and smallest volume",
      fields: [{ k: "big", type: "choice", label: "Biggest", options: ["41 %", "50 %", "SUV 2.5", "Adaptive", "Gradient"], predict: true },
        { k: "small", type: "choice", label: "Smallest", options: ["41 %", "50 %", "SUV 2.5", "Adaptive", "Gradient"], predict: true }] },
    { id: "pd2-2", block: "D", group: "2 · Automatic methods", no: "2", q: "Volumes",
      fields: [{ k: "t", type: "grid", rows: ["41 %", "50 %", "SUV 2.5", "Adaptive", "Gradient"], cols: ["mL"] }] },
    { id: "pd2-3", block: "D", group: "2 · Automatic methods", no: "3", q: "Best overlap with the expert outline",
      fields: [{ k: "best", type: "choice", label: "Method", options: ["41 %", "50 %", "SUV 2.5", "Adaptive", "Gradient"] },
        { k: "mine", type: "num", label: "Dice of your outline" }] },
    { id: "pd2-4", block: "D", group: "2 · Automatic methods", no: "4", q: "SUV 2.5: what goes wrong? Liver or brain?", fields: [{ k: "a", type: "text" }] },
    { id: "pd2-5", block: "D", group: "2 · Automatic methods", no: "5", q: "Bonus: one of these as the GTV? What instead?", fields: [{ k: "a", type: "long" }] },
    { id: "pd3-1", block: "D", group: "3 · Another reconstruction", no: "1", q: "12 iterations, no filter: the 41 % outline gets ...",
      fields: [{ k: "pred", type: "choice", options: ["bigger", "the same", "smaller"], predict: true }] },
    { id: "pd3-2", block: "D", group: "3 · Another reconstruction", no: "2", q: "SUVmax and volumes for three reconstructions",
      fields: [{ k: "t", type: "grid", rows: ["1 it, 7 mm", "3 it, 5 mm", "12 it, none"], cols: ["SUVmax", "41 % mL", "SUV 2.5 mL"] }] },
    { id: "pd3-3", block: "D", group: "3 · Another reconstruction", no: "3", q: "Why did the 41 % volume change?", fields: [{ k: "a", type: "text" }] },
    { id: "pd3-4", block: "D", group: "3 · Another reconstruction", no: "4", q: "Bonus: one 41 % threshold on the phantom: which sizes are right?", fields: [{ k: "a", type: "text" }] },
  ];
  const PET_CHECKLIST = ["SUV calculated right?", "Does the CT match the PET?", "Reconstruction and lesion size?", "Which contouring method?"];

  const SETS = {
    dwi: { key: "dwi-worksheet-v1", name: "DWI", blocks: DWI_BLOCKS, q: DWI_Q, checklist: DWI_CHECKLIST, trust: "AN ADC", answers: "answers.html" },
    pet: { key: "pet-worksheet-v1", name: "PET", blocks: PET_BLOCKS, q: PET_Q, checklist: PET_CHECKLIST, trust: "AN SUV OR A PET CONTOUR", answers: "pet_answers.html" },
  };
  const SET = SETS[window.WORKSHEET] || SETS.dwi;
  const KEY = SET.key, BLOCKS = SET.blocks, Q = SET.q, CHECKLIST = SET.checklist;

  // ---------- storage ----------
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { data = {}; }
  data.v = data.v || {}; data.lock = data.lock || {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  const get = (qid, k) => data.v[qid + "." + k];
  const set = (qid, k, val) => { data.v[qid + "." + k] = val; return save(); };

  // ---------- style ----------
  const css = `
.ws { grid-column: 2; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; font-size: 15px; }
.tasks li.intro .ws { grid-column: 1 / -1; }
.ws .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; }
.ws .f { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.ws .f > .lab { font-weight: bold; }
.ws .unit { color: var(--muted); font-size: 13px; }
.ws input[type=text], .ws textarea { font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--guide); border-radius: 6px; padding: 4px 8px; }
.ws input.num { width: 8ch; text-align: right; font-family: var(--mono, monospace); }
.ws input.txt { flex: 1 1 16em; min-width: 0; }
.ws .f.wide { flex: 1 1 100%; }
.ws textarea { width: 100%; min-height: 3.4em; resize: vertical; }
.ws .opts { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.ws .opts label { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: var(--bg); border-radius: 999px; padding: 3px 11px; cursor: pointer; }
.ws .opts label:has(input:checked) { border-color: var(--teal); background: var(--teal); color: #ffffff; }
.ws .opts input { margin: 0; accent-color: var(--teal); }
.ws .gridwrap { max-width: 100%; overflow-x: auto; }
.ws table { border-collapse: collapse; font-size: 14px; width: auto; margin: 0; }
.ws th, .ws td { padding: 2px 6px 2px 0; text-align: left; border: 0; background: none; height: auto; white-space: nowrap; }
.ws th { font-weight: normal; color: var(--muted); }
.ws .pred-tag { font-weight: bold; color: var(--orange); }
.ws .lockrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ws .locked-note { color: var(--muted); font-size: 13px; }
.ws fieldset { border: 0; margin: 0; padding: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.ws fieldset:disabled .opts label { cursor: default; opacity: .9; }
.ws .predict-part { border-left: 3px solid var(--orange); padding-left: 10px; }
.ws-saved { font-size: 12px; color: var(--muted); }
.header-links { display: flex; gap: 8px; flex-wrap: wrap; align-self: flex-start; }`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  // ---------- rendering ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let uid = 0;
  function fieldEl(q, f) {
    const wrap = document.createElement("span"); wrap.className = "f";
    const id = `ws-${q.id}-${f.k}-${++uid}`;
    const lab = f.label ? `<span class="lab">${esc(f.label)}</span>` : "";
    const unit = f.unit ? `<span class="unit">${esc(f.unit)}</span>` : "";
    const aria = esc(f.label || q.q);
    if (f.type === "text" || f.type === "num") {
      wrap.innerHTML = `${f.label ? `<label class="lab" for="${id}">${esc(f.label)}</label>` : ""}<input type="text" id="${id}" class="${f.type === "num" ? "num" : "txt"}"
        ${f.type === "num" ? 'inputmode="decimal"' : ""} autocomplete="off" aria-label="${aria}">${unit}`;
      if (f.type === "text") wrap.classList.add("wide");
      const inp = wrap.querySelector("input"); inp.value = get(q.id, f.k) || "";
      inp.addEventListener("input", () => set(q.id, f.k, inp.value));
    } else if (f.type === "long") {
      wrap.classList.add("wide");
      wrap.innerHTML = `${lab}<textarea id="${id}" aria-label="${aria}"></textarea>`;
      const t = wrap.querySelector("textarea"); t.value = get(q.id, f.k) || "";
      t.addEventListener("input", () => set(q.id, f.k, t.value));
    } else if (f.type === "choice" || f.type === "multi") {
      const multi = f.type === "multi", cur = get(q.id, f.k);
      const has = o => multi ? (cur || []).includes(o) : cur === o;
      wrap.innerHTML = `${lab}<span class="opts" role="${multi ? "group" : "radiogroup"}" aria-label="${aria}">` +
        f.options.map(o => `<label><input type="${multi ? "checkbox" : "radio"}" name="${id}" value="${esc(o)}"${has(o) ? " checked" : ""}>${esc(o)}</label>`).join("") + "</span>";
      wrap.querySelectorAll("input").forEach(inp => inp.addEventListener("change", () => {
        const val = multi ? [...wrap.querySelectorAll("input:checked")].map(x => x.value) : inp.value;
        set(q.id, f.k, val);
      }));
    } else if (f.type === "grid") {
      wrap.classList.add("wide");
      const cur = get(q.id, f.k) || {};
      wrap.innerHTML = `<div class="gridwrap"><table><tr><th></th>${f.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr>` +
        f.rows.map((r, i) => `<tr><th>${esc(r)}</th>${f.cols.map((c, j) =>
          `<td><input type="text" class="num" inputmode="decimal" autocomplete="off" data-cell="${i}-${j}" aria-label="${esc(r + ", " + c)}" value="${esc(cur[i + "-" + j] || "")}"></td>`).join("")}</tr>`).join("") +
        `</table></div>${unit ? `<span class="unit">${esc(f.unit)}${f.cols.some(c => c.includes("%")) ? " (change in %)" : ""}</span>` : ""}`;
      wrap.querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => {
        const v = { ...(get(q.id, f.k) || {}) }; v[inp.dataset.cell] = inp.value; set(q.id, f.k, v);
      }));
    }
    return wrap;
  }
  function filled(q, fields) {
    return fields.some(f => { const v = get(q.id, f.k); return v && (typeof v !== "object" || Object.values(v).some(Boolean)) && (!Array.isArray(v) || v.length); });
  }

  function renderInto(host, q) {
    const box = document.createElement("div"); box.className = "ws"; box.dataset.q = q.id;
    const pred = q.fields.filter(f => f.predict), rest = q.fields.filter(f => !f.predict);
    if (pred.length) {
      const fs = document.createElement("fieldset"); fs.className = "predict-part";
      fs.innerHTML = `<legend class="pred-tag">✎ Predict first</legend>`;
      const row = document.createElement("div"); row.className = "row";
      pred.forEach(f => row.appendChild(fieldEl(q, f))); fs.appendChild(row);
      const lr = document.createElement("div"); lr.className = "lockrow";
      lr.innerHTML = `<button type="button" class="primary" data-lock>Lock my prediction</button><span class="locked-note" data-note></span><button type="button" class="quiet" data-unlock hidden>Change it</button>`;
      box.appendChild(fs); box.appendChild(lr);
      let restBox = null;
      const lockBtn = lr.querySelector("[data-lock]"), unlock = lr.querySelector("[data-unlock]"), note = lr.querySelector("[data-note]");
      const sync = () => {
        const locked = !!data.lock[q.id];
        fs.disabled = locked; lockBtn.hidden = locked; unlock.hidden = !locked;
        note.textContent = locked ? "🔒 Locked. Now try it and see if you were right." : "";
        if (restBox) restBox.hidden = !locked && rest.length > 0 && !filled(q, rest);
      };
      lockBtn.addEventListener("click", () => {
        if (!filled(q, pred)) { note.textContent = "Fill in your prediction first."; return; }
        data.lock[q.id] = true; save(); sync();
      });
      unlock.addEventListener("click", () => { delete data.lock[q.id]; save(); sync(); });
      if (rest.length) {
        restBox = document.createElement("div"); restBox.className = "row";
        rest.forEach(f => restBox.appendChild(fieldEl(q, f)));
        box.appendChild(restBox);
      }
      sync();
    } else {
      const row = document.createElement("div"); row.className = "row";
      rest.forEach(f => row.appendChild(fieldEl(q, f))); box.appendChild(row);
    }
    host.appendChild(box);
    return box;
  }

  // On a hands-on page: answer fields under each task, plus a "My answers" link in the header.
  function mountPage() {
    let n = 0;
    for (const q of Q) {
      const cb = document.getElementById(q.id);
      const li = cb && cb.closest("li");
      if (!li || li.querySelector(".ws")) continue;
      renderInto(li, q); n++;
    }
    const back = document.querySelector("header a.back");
    if (back && n && !document.querySelector(".header-links")) {
      const links = document.createElement("div"); links.className = "header-links";
      back.before(links); links.appendChild(back);
      const a = document.createElement("a"); a.className = "back"; a.href = SET.answers; a.textContent = "My answers";
      links.appendChild(a);
    }
    if (n && !save()) {
      document.querySelectorAll(".ws").forEach(b => { const s = document.createElement("div"); s.className = "ws-saved"; s.textContent = "This browser blocks saving: your answers will be lost when you leave the page."; b.appendChild(s); });
    }
  }

  // ---------- summary (answers.html) ----------
  function show(q, f) {
    const v = get(q.id, f.k);
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
    if (f.type === "grid") {
      if (!Object.values(v).some(Boolean)) return "";
      return f.rows.map((r, i) => `${r}: ` + f.cols.map((c, j) => `${c} ${v[i + "-" + j] || "–"}`).join(", ")).join("\n");
    }
    const s = Array.isArray(v) ? v.join(", ") : String(v);
    return (f.label ? f.label + ": " : "") + s + (f.unit && f.type === "num" ? " " + f.unit : "");
  }
  function asText() {
    const lines = [SET.name + " hands-on · my answers", ""];
    let blk = null, grp = null;
    for (const q of Q) {
      if (q.block !== blk) { blk = q.block; grp = null; lines.push("", BLOCKS[blk].title.toUpperCase()); }
      if (q.group !== grp) { grp = q.group; lines.push("", grp); }
      const parts = q.fields.map(f => show(q, f)).filter(Boolean);
      lines.push(`${q.no}. ${q.q}`, ...(parts.length ? parts.map(p => "   " + p.replace(/\n/g, "\n   ")) : ["   –"]));
    }
    lines.push("", "CHECKLIST: BEFORE YOU TRUST " + SET.trust);
    CHECKLIST.forEach((c, i) => lines.push(`${i + 1}. ${c} ${data.v["checklist." + i] || "–"}`));
    return lines.join("\n");
  }
  function renderSummary(host) {
    host.innerHTML = "";
    let blk = null, sec = null, grp = null;
    for (const q of Q) {
      if (q.block !== blk) {
        blk = q.block; grp = null;
        sec = document.createElement("section"); sec.className = "sum-block";
        sec.innerHTML = `<h2>${esc(BLOCKS[blk].title)} <a class="goto" href="${BLOCKS[blk].page}">Open the page →</a></h2>`;
        host.appendChild(sec);
      }
      if (q.group !== grp) { grp = q.group; const h = document.createElement("h3"); h.textContent = grp; sec.appendChild(h); }
      const item = document.createElement("div"); item.className = "sum-q";
      item.innerHTML = `<div class="sum-head"><span class="no">${esc(q.no)}</span><span>${esc(q.q)}</span>${data.lock[q.id] ? '<span class="lk">prediction locked</span>' : ""}<a class="goto" href="${BLOCKS[blk].page}?task=${encodeURIComponent(q.id)}">Go to task →</a></div>`;
      sec.appendChild(item);
      renderInto(item, q);
    }
  }
  function renderChecklist(host) {
    host.innerHTML = CHECKLIST.map((c, i) => `<label class="cl"><b>${i + 1} · ${esc(c)}</b><input type="text" class="txt" data-i="${i}" autocomplete="off"></label>`).join("");
    host.querySelectorAll("input").forEach(inp => {
      inp.value = data.v["checklist." + inp.dataset.i] || "";
      inp.addEventListener("input", () => { data.v["checklist." + inp.dataset.i] = inp.value; save(); });
    });
  }
  function clearAll() { data = { v: {}, lock: {} }; save(); }
  function count() { return Q.filter(q => filled(q, q.fields)).length; }

  window.Worksheet = { questions: Q, get: (qid, k) => get(qid, k), mountPage, renderSummary, renderChecklist, asText, clearAll, count, total: Q.length };
  if (!document.getElementById("ws-summary")) mountPage();
})();
