/* ==========================================================
   Jamie's Library — 成績回傳（所有練習卷共用）
   只需要在下面貼一次 Google Apps Script 的網址，
   每一份有引用這個檔案的練習卷就都會把結果送到你的試算表。
   ========================================================== */

// ↓↓↓ 部署完 Apps Script 後，把網址貼在雙引號中間（網址結尾是 /exec）
const RESULT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxeoD7UVhiSPOsFYnEEEnkuJzr-__pRPhB0r47yaMOptydFLK8DRrq2M7XvGJ8FaYk_jQ/exec";

/* ==========================================================
   學生名單：新增或刪除學生，只要改這裡
   - 每個名字用雙引號包住，後面要有逗號
   - 刪除學生就整行刪掉；舊的成績紀錄不會受影響
   ========================================================== */
const STUDENTS = [
  "Amber Lin",
  "Casper Lin",
  "Eileen Chen",
  "Eric Liao",
  "Janet Shih",
  "Maya Lin",
];

const Library = {
  nameInput: function () {
    return document.getElementById("studentName");
  },

  // 交卷前檢查有沒有填姓名；沒填就提醒並回到姓名欄
  requireName: function () {
    const el = this.nameInput();
    if (!el) return true; // 沒有姓名欄的舊練習卷照常交卷
    const err = document.getElementById("nameError");
    if (el.value.trim()) {
      if (err) err.hidden = true;
      return true;
    }
    if (err) err.hidden = false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
    return false;
  },

  // 把含有 HTML 標籤的文字轉成純文字
  text: function (html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  },

  // 送出成績：info = { title, category, score, total, items:[{part,q,yours,correct,ok}] }
  send: function (info) {
    const status = document.getElementById("sendStatus");
    if (!RESULT_ENDPOINT) {
      console.warn("RESULT_ENDPOINT is empty: the result was not sent.");
      return;
    }
    const name = (this.nameInput() ? this.nameInput().value : "").trim();
    const items = info.items || [];
    const payload = {
      student: name,
      worksheet: info.title,
      category: info.category || "",
      score: info.score,
      total: info.total,
      page: location.pathname.split("/").pop(),
      items: items.map(function (i) {
        return { part: i.part, q: i.q, yours: i.yours, correct: i.correct, ok: !!i.ok };
      })
    };
    if (status) status.textContent = "Sending your result…";
    fetch(RESULT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload)
    }).then(function () {
      if (status) status.textContent = "✓ Your result was sent to your teacher.";
    }).catch(function () {
      if (status) status.textContent = "Could not send your result. Please tell your teacher.";
    });
  }
};

// 把練習卷上的姓名輸入框換成學生名單的下拉選單
function buildNameSelect() {
  const el = document.getElementById("studentName");
  if (!el || el.tagName !== "INPUT" || !STUDENTS.length) return; // 名單是空的就維持手動輸入
  const sel = document.createElement("select");
  sel.id = "studentName";
  sel.className = el.className;
  const first = document.createElement("option");
  first.value = "";
  first.textContent = "-- Select your name --";
  sel.appendChild(first);
  STUDENTS.slice().sort(function (a, b) { return a.localeCompare(b, "en"); }).forEach(function (n) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  });
  el.parentNode.replaceChild(sel, el);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildNameSelect);
} else {
  buildNameSelect();
}

// 選好（或開始輸入）姓名後，隱藏「請選擇姓名」的提醒
["input", "change"].forEach(function (evt) {
  document.addEventListener(evt, function (e) {
    if (e.target && e.target.id === "studentName") {
      const err = document.getElementById("nameError");
      if (err) err.hidden = true;
    }
  });
});
