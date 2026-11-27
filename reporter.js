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

/* ==========================================================
   LEAVE GUARD: warns before a student leaves a quiz by accident
   (Back to Library link, browser back button / swipe back, refresh, close tab).
   Active only after the student starts answering and before the quiz is submitted.
   ========================================================== */
(function () {
  let dirty = false;    // student has started answering and has not submitted yet
  let locked = false;   // quiz was submitted: ignore clicks until Try Again
  let extra = 0;        // history entries added by this guard
  let backHref = "";

  function isSubmit(t) { return t.closest("#submitBtn, .btn-submit, [onclick*='gradeQuiz']"); }
  function isRetry(t) { return t.closest("#retryBtn, .btn-retry, [onclick*='resetQuiz']"); }
  function isBack(t) { return t.closest("a.back-link, a[href='index.html']"); }
  function markDirty() {
    if (locked || dirty) return;
    dirty = true;
    if (extra === 0) { try { history.pushState({ guard: 1 }, "", location.href); extra++; } catch (e) {} }
  }

  // --- confirmation window ---
  let box = null;
  function build() {
    box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);font-family:'Comic Sans MS','Chalkboard SE','Segoe UI',Tahoma,sans-serif";
    box.innerHTML =
      '<div style="background:#fff;max-width:420px;width:100%;border-radius:20px;padding:26px 22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.35);border:4px solid #f59e0b">' +
      '<div style="font-size:3rem;line-height:1">✋</div>' +
      '<h2 style="margin:8px 0 6px;font-size:1.5rem;color:#b45309">Wait! Leave this quiz?</h2>' +
      '<p style="margin:0 0 18px;font-size:1.1rem;color:#334155">Your answers are not submitted yet. If you leave now, you will have to start again.</p>' +
      '<button type="button" id="lgStay" style="display:block;width:100%;padding:15px 14px;margin-bottom:12px;font-size:1.3rem;font-weight:bold;border:none;border-radius:16px;background:#0284c7;color:#fff;cursor:pointer;font-family:inherit;box-shadow:0 4px 0 #075985">Stay and keep working</button>' +
      '<button type="button" id="lgLeave" style="display:inline-block;width:auto;padding:5px 14px;font-size:.85rem;font-weight:normal;border:2px solid #cbd5e1;border-radius:10px;background:#fff;color:#94a3b8;cursor:pointer;font-family:inherit">Leave quiz</button>' +
      '</div>';
    document.body.appendChild(box);
    box.querySelector("#lgStay").onclick = function () {
      box.style.display = "none";
      if (extra === 0) { try { history.pushState({ guard: 1 }, "", location.href); extra++; } catch (e) {} }
    };
    box.querySelector("#lgLeave").onclick = function () {
      dirty = false; box.style.display = "none";
      if (backHref) { location.href = backHref; } else { history.back(); }
    };
  }
  function ask(href) {
    if (!box) build();
    backHref = href || "";
    box.style.display = "flex";
    box.querySelector("#lgStay").focus();
  }

  document.addEventListener("click", function (e) {
    const t = e.target; if (!t || !t.closest) return;
    if (isRetry(t)) { locked = false; dirty = false; return; }
    if (box && box.contains(t)) return;
    const a = isBack(t);
    if (a) { if (dirty) { e.preventDefault(); ask(a.getAttribute("href")); } return; }
    if (isSubmit(t)) return;
    if (t.closest("#studentName")) return;
    markDirty();
  }, true);
  ["input", "change"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      const t = e.target;
      if (!t || t.id === "studentName" || (box && box.contains(t))) return;
      markDirty();
    }, true);
  });

  // browser back button / swipe back
  window.addEventListener("popstate", function () {
    if (extra > 0) extra--;
    if (dirty) { ask(""); }
    else if (extra === 0) { history.back(); }
  });
  // refresh / close tab (the browser shows its own message)
  window.addEventListener("beforeunload", function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ""; return ""; }
  });

  // quiz submitted: no more warnings
  const origSend = Library.send;
  Library.send = function (info) { dirty = false; locked = true; return origSend.call(this, info); };
})();
