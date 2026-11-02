// TEMPORARY review bar (2026-11-02): links to the printed worksheets and answer keys, for Patrik, René and Rob.
// Remove before the course: delete the review/ folder, set REVIEW = False in tools/export_app.py and re-export,
// and drop the review.js tag from index.html, mr.html and pet.html.
(function () {
  const links = [["MR worksheet", "mr_worksheet.pdf"], ["MR answers", "mr_answer_key.pdf"],
                 ["PET worksheet", "pet_worksheet.pdf"], ["PET answers", "pet_answer_key.pdf"]];
  const bar = document.createElement("div");
  bar.setAttribute("role", "note");
  bar.style.cssText = "background:#e0821a;color:#1a1a1a;font:600 13px/1.4 'Trebuchet MS','Segoe UI',sans-serif;" +
    "padding:6px max(16px,env(safe-area-inset-left,0px));display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center";
  bar.innerHTML = "<span>Review copies, temporary:</span>" + links.map(([t, f]) =>
    `<a href="review/${f}" target="_blank" rel="noopener" style="color:#1a1a1a;text-decoration:underline">${t}</a>`).join("");
  const add = () => document.body.prepend(bar);
  document.body ? add() : document.addEventListener("DOMContentLoaded", add);
})();
