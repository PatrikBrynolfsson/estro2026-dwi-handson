/* Shared by the three hands-on pages: show the tasks one at a time, with Previous / Next.
 *
 *   Stepper.setup(box, { key, sticky, prev, next, nextLabel })   (Previous / Next sit under the heading, above the task,
 *                                                                so they stay put whatever the length of the task text)
 *     box        a .tasks element: an <h2> and an <ol> of <li>.
 *                <li class="intro" data-spot="id1,id2"> is a "start here" card: it is not numbered, and it dims the
 *                page and scrolls to (and outlines) the elements it names. On page load and tab switch it dims and
 *                outlines without scrolling. The start cards show the first time a step is opened in this browser;
 *                after that (changed 2026-11-10) the step opens at task 1, Previous/Next skip them, and they open only
 *                from the "How to read this page" button or their (square) dots.
 *                <li data-spot="..."> on a task scrolls to and outlines those elements, without dimming.
 *                <li class="extra"> is a bonus task.
 *     key        sessionStorage key for the position (per page and step), so a reload (or the browser's Back button)
 *                keeps the card, while a new visit starts at the beginning.
 *     Landing (changed 2026-11-10): moving forward into a step (Next, a tab click, a link) opens its FIRST card; Previous
 *     on the first card of a step opens the previous step on its LAST card; a reload keeps the card you were on.
 *     sticky     keep the card in view while scrolling (full-width cards above the work area).
 *     prev/next  called on Previous at the first item / Next at the last item (null = disabled / nothing).
 *     nextLabel  label of Next at the last item.
 *     onShow     called with the shown <li> each time the card changes (also on page load).
 *   page.html?task=<task id> (the links on My answers) opens the step that holds that task and shows the task.
 *   Stepper.clear()  remove the outline and the dimming (call when the page switches tab).
 *
 * Uses the page's colour tokens: --line --guide --teal --orange --bg.
 */
(() => {
  "use strict";
  const css = `
.tasks.stepper h2 .note { display: none; }
.tasks.stepper ol { gap: 0; }
.tasks.stepper li { font-size: 17px; line-height: 1.45; grid-template-columns: 30px minmax(0, 1fr); min-height: 3.2em; }
.tasks.stepper li::before { content: attr(data-n) "."; grid-column: 1; font-size: 17px; }
.tasks.stepper li > input[type=checkbox] { display: none; }
.tasks.stepper li > label { grid-column: 2; cursor: default; }
.tasks.stepper li > input:checked ~ label { color: inherit; text-decoration: none; }
.tasks.stepper li.intro::before { content: none; }
.tasks.stepper li.intro > label { grid-column: 1 / -1; }
.tasks.stepper li.intro ul { margin: 4px 0 0; padding-left: 22px; display: flex; flex-direction: column; gap: 2px; }
.tasks.stepper li.intro ul li { display: list-item; font-size: 16px; min-height: 0; }
.tasks.stepper li.intro ul li::before { content: none; }
.step-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
.step-nav .dots { display: flex; gap: 6px; align-items: center; }
.step-nav button { white-space: nowrap; }
@media (max-width: 600px) {   /* phone: buttons on one row, dots below, so the height never changes */
  .step-nav { display: grid; grid-template-columns: auto auto; grid-template-areas: "prev next" "dots dots"; flex-wrap: nowrap; }
  .step-nav [data-prev] { grid-area: prev; justify-self: start; }
  .step-nav [data-next] { grid-area: next; justify-self: end; }
  .step-nav .dots { grid-area: dots; justify-content: center; }
}
.step-nav .dots button { width: 12px; height: 12px; padding: 0; border-radius: 50%; background: var(--line); border: 0; }
.step-nav .dots button.seen { background: var(--guide); }
.step-nav .dots button[aria-current="true"] { background: var(--teal); transform: scale(1.25); }
.step-nav .dots button.intro-dot { border-radius: 2px; width: 10px; height: 10px; }
.step-nav .dots button.intro-dot.last { margin-right: 8px; }
.tasks.stepper > h2 { display: flex; align-items: center; gap: 4px 12px; flex-wrap: wrap; }
.tasks.stepper > h2 .intro-link { margin-left: auto; font-size: 13px; font-weight: normal; padding: 3px 10px; }
.spot { outline: 3px solid var(--orange); outline-offset: 5px; border-radius: 8px; position: relative; z-index: 41; background: var(--bg); }
@media (prefers-reduced-motion: no-preference) { .spot { animation: stepper-spot 1.6s ease-in-out 3; } }
@keyframes stepper-spot { 50% { outline-color: transparent; } }
.stepper-dim { position: fixed; inset: 0; background: rgba(0, 0, 0, .55); z-index: 40; pointer-events: none; }
.tasks.stepper.spot-card { position: relative; z-index: 41; }   /* the card stays bright above the dimming (sticky wins below) */
@media (min-height: 640px) and (min-width: 700px) {
  .tasks.stepper.sticky { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 42; box-shadow: 0 6px 18px rgba(0, 0, 0, .18); }
}`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
  const dim = document.createElement("div"); dim.className = "stepper-dim"; dim.hidden = true; document.body.appendChild(dim);
  const store = {
    get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };
  const seenStore = {   // start cards seen: kept in this browser (localStorage), so later visits skip them
    get: k => { try { return localStorage.getItem("introseen:" + location.pathname + ":" + k) === "1"; } catch (e) { return false; } },
    set: k => { try { localStorage.setItem("introseen:" + location.pathname + ":" + k, "1"); } catch (e) { /* storage blocked */ } },
  };
  // Restore the stored card only on a reload or the browser's Back/Forward; any other arrival starts at card 1.
  const navType = (() => { try { const e = performance.getEntriesByType("navigation")[0]; return e ? e.type : ""; } catch (e) { return ""; } })();
  const restore = navType === "reload" || navType === "back_forward";
  let active = null;          // the stepper whose step is on screen
  let enterLast = 0;          // time Previous left a step from its first card: the step it opens lands on its last card
  let booting = true;         // during page set-up, refresh() keeps the restored card

  // ?task=<id>: switch to the step (tab) that holds this task. The n-th .tasks box belongs to the n-th [data-tab] link.
  const wantId = new URLSearchParams(location.search).get("task");
  const wantEl = wantId && document.getElementById(wantId);
  if (wantEl) {
    const boxes = [...document.querySelectorAll(".tasks")], tabs = [...document.querySelectorAll("[data-tab]")];
    const tab = boxes.length === tabs.length ? tabs[boxes.indexOf(wantEl.closest(".tasks"))] : null;
    history.replaceState(null, "", location.pathname + (tab ? "#" + tab.dataset.tab : location.hash));   // drop ?task, so a reload does not jump again
  }

  function clear() {
    document.querySelectorAll(".spot, .spot-card").forEach(e => e.classList.remove("spot", "spot-card"));
    dim.hidden = true;
  }

  // outline els; with dimming = true also dim the rest. Scroll so they sit below the card (or keep their bottom in view).
  function spotlight(card, els, { dimming, scroll }) {
    if (card.offsetParent === null) return;   // a card on a hidden tab must not clear the visible tab's outline
    clear();
    if (!els.length) return;
    els.forEach(e => { void e.offsetWidth; e.classList.add("spot"); });
    dim.hidden = !dimming;
    if (dimming) card.classList.add("spot-card");
    if (!scroll) return;
    const rects = els.map(e => e.getBoundingClientRect());
    const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
    const sticky = getComputedStyle(card).position === "sticky", cardH = sticky ? card.getBoundingClientRect().height + 16 : 16;
    const avail = window.innerHeight - cardH - 16, h = bottom - top;
    const dy = h <= avail ? top - cardH - (avail - h) / 2 : bottom - window.innerHeight + 16;
    if (Math.abs(dy) > 8) window.scrollBy({ top: dy, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function setup(box, opt) {
    const items = [...box.querySelectorAll(":scope > ol > li")], n = items.length;
    if (!n) return null;
    const intros = items.filter(li => li.classList.contains("intro")).length, nTasks = n - intros;
    box.classList.add("stepper");
    if (opt.sticky) box.classList.add("sticky");
    items.forEach((li, i) => { li.dataset.n = i + 1 - intros; });
    let title = box.querySelector(":scope > h2");
    if (!title) { title = document.createElement("h2"); box.prepend(title); }
    const nav = document.createElement("div"); nav.className = "step-nav";
    nav.innerHTML = `<button type="button" class="quiet" data-prev>← Previous</button><span class="dots"></span><button type="button" class="primary" data-next></button>`;
    title.after(nav);
    const dots = nav.querySelector(".dots"), prev = nav.querySelector("[data-prev]"), next = nav.querySelector("[data-next]");
    let seen = intros > 0 && seenStore.get(opt.key);
    const first = () => (seen ? intros : 0);
    let viewedIntro = false;   // a start card was shown since entering this step: Previous from task 1 goes back to it   // where the step starts: task 1 once the start cards were seen
    items.forEach((_, i) => {
      const d = document.createElement("button"); d.type = "button"; d.setAttribute("aria-label", i < intros ? "How to read this page, " + (i + 1) : "Task " + (i + 1 - intros));
      if (i < intros) d.classList.add("intro-dot"); if (i === intros - 1) d.classList.add("last");
      d.addEventListener("click", () => go(i)); dots.appendChild(d);
    });
    let pos = restore && store.get(opt.key) !== null ? Math.min(n - 1, Math.max(0, +store.get(opt.key))) : first();
    const me = {};
    function go(i, quiet = false) {
      pos = i;
      if (box.offsetParent !== null) active = me;
      items.forEach((li, j) => { li.hidden = j !== i; });
      [...dots.children].forEach((d, j) => { d.setAttribute("aria-current", String(j === i)); if (j <= i) d.classList.add("seen"); });
      const intro = items[i].classList.contains("intro");
      if (intro) viewedIntro = true;
      if (!intro && intros && !seen) { seen = true; seenStore.set(opt.key); }
      title.innerHTML = intro ? `Start here · how to read this page (${i + 1} of ${intros})`
        : `<span>Task ${i + 1 - intros} of ${nTasks}</span>` + (items[i].classList.contains("extra") ? ` <span class="note" style="display:inline">for fast pairs</span>` : "")
          + (intros ? `<button type="button" class="quiet intro-link" data-intro>How to read this page</button>` : "");
      prev.disabled = (i === 0 || (i === intros && !viewedIntro)) && !opt.prev;
      next.textContent = intro && i === intros - 1 ? "Start the tasks →" : i < n - 1 ? "Next →" : (opt.nextLabel || "Done");
      next.disabled = i === n - 1 && !opt.next;
      store.set(opt.key, String(i));
      const els = (items[i].dataset.spot || "").split(",").filter(Boolean).map(id => document.getElementById(id)).filter(Boolean);
      spotlight(box, els, { dimming: intro, scroll: !quiet });   // quiet (page load, tab switch): no scrolling, but still dim
      if (opt.onShow) opt.onShow(items[i]);
    }
    title.addEventListener("click", e => { if (e.target.closest("[data-intro]")) go(0); });
    // Previous from task 1 leaves the step once the start cards were seen (they open only on request)
    prev.addEventListener("click", () => { if (pos > 0 && !(pos === intros && !viewedIntro)) go(pos - 1); else if (opt.prev) { clear(); enterLast = Date.now(); opt.prev(); } });
    next.addEventListener("click", () => { if (pos < n - 1) go(pos + 1); else if (opt.next) { clear(); opt.next(); } });
    const wantPos = wantEl ? items.findIndex(li => li.contains(wantEl)) : -1;
    if (wantPos >= 0) pos = wantPos;
    go(pos, true);
    if (wantPos >= 0) setTimeout(() => {
      go(wantPos);
      const ws = items[wantPos].querySelector(".ws") || items[wantPos];
      ws.classList.add("spot"); ws.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 400);
    // refresh(): the page shows this step (tab switch). Entering it from another step starts at the first card,
    // or at the last card when Previous brought us here; re-showing the step already on screen keeps the card.
    function refresh() {
      if (booting || active === me) { go(pos, true); return; }
      const back = Date.now() - enterLast < 2000;
      enterLast = 0;
      viewedIntro = false;
      go(back ? n - 1 : first(), true);
    }
    if (booting) setTimeout(() => { booting = false; }, 0);
    return Object.assign(me, { go: (i, quiet) => go(i, quiet), refresh });
  }

  window.Stepper = { setup, clear };
})();
