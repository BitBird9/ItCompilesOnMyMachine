/* script.js */

/** Strip tracking params (fbclid, utm_*) */
(function stripTrackingParams() {
  const url = new URL(window.location.href);
  const kill = new Set(["fbclid", "gclid"]);
  let changed = false;

  for (const k of [...url.searchParams.keys()]) {
    if (kill.has(k) || k.startsWith("utm_")) {
      url.searchParams.delete(k);
      changed = true;
    }
  }
  if (changed) history.replaceState({}, "", url);
})();

/** Smooth scrolling (respects reduced motion) */
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    const target = href ? document.querySelector(href) : null;
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });

    // close mobile menu if open
    navLinks?.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

/** Mobile nav */
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

/** Playground elements */
const codeEditor = document.getElementById("codeEditor");
const outputEl = document.getElementById("output");
const runBtn = document.getElementById("runCode");
const stopBtn = document.getElementById("stopCode");
const clearBtn = document.getElementById("clearOutput");
const copyOutBtn = document.getElementById("copyOutput");
const pyStatus = document.getElementById("pyStatus");
const timeoutSelect = document.getElementById("timeoutSelect");
const capSelect = document.getElementById("capSelect");
const exampleButtons = document.querySelectorAll(".btn-example");

/** Examples (correct + teaches right lessons) */
const codeExamples = {
  dictget: `# dict.get() gotcha: it doesn't store the default
cache = {}

a = cache.get("key", [])
a.append("first")

b = cache.get("key", [])
b.append("second")

print("a:", a)                 # ['first']
print("b:", b)                 # ['second']
print("same object?", a is b)  # False
print("cache:", cache)         # {}  <-- nothing cached

print("\\nFix: setdefault")
cache.setdefault("key", []).append("first")
cache.setdefault("key", []).append("second")
print("cache:", cache)`,
  mutabledefault: `# The REAL "shared mutable default" bug is function defaults
def add_item(x, bucket=[]):  # ❌ shared across calls
    bucket.append(x)
    return bucket

print(add_item(1))  # [1]
print(add_item(2))  # [1, 2]  <-- surprise

print("\\nFix: None default")
def add_item_safe(x, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(x)
    return bucket

print(add_item_safe(1))  # [1]
print(add_item_safe(2))  # [2]`,
  listcomp: `numbers = list(range(1, 11))
squares = [x*x for x in numbers if x % 2 == 0]
print(squares)

matrix = [[1,2,3],[4,5,6],[7,8,9]]
flat = [n for row in matrix for n in row]
print(flat)`,
  walrus: `data = [1,2,3,4,5]
if (n := len(data)) > 3:
    print(f"List is long: {n} items")

print("Reading lines:")
lines = ["hello", "world", "python", ""]
i = 0
while (line := (lines[i] if i < len(lines) else "")) != "":
    print(" ", line)
    i += 1`,
  contextmgr: `from contextlib import contextmanager
import time

@contextmanager
def timer(name):
    start = time.time()
    print(f"Starting {name}...")
    try:
      yield
    finally:
      print(f"{name} took {time.time() - start:.4f}s")

with timer("Task"):
    total = sum(range(1_000_00))
    print("Sum:", total)`
};

/** Safe output renderer */
function setOutput(text) {
  outputEl.textContent = text;
}

/** Worker management */
let worker = null;
let running = false;
let runTimeout = null;

function setStatus(kind, text) {
  pyStatus.className = `status-pill ${
    kind === "ready" ? "status-ready" :
    kind === "error" ? "status-error" :
    "status-loading"
  }`;
  pyStatus.textContent = text;
}

function ensureWorker() {
  if (worker) return worker;

  worker = new Worker("py-worker.js");
  worker.onmessage = (e) => {
    const msg = e.data;

    if (msg?.type === "ready") {
      setStatus("ready", "Python ready");
      runBtn.disabled = false;
      return;
    }

    if (msg?.type === "fatal") {
      setStatus("error", "Python failed to load");
      setOutput(String(msg.error || "Unknown error"));
      runBtn.disabled = true;
      stopBtn.disabled = true;
      return;
    }

    if (msg?.type === "result") {
      finishRun();
      setOutput(msg.output);
      return;
    }
  };

  worker.onerror = (err) => {
    finishRun();
    setStatus("error", "Worker crashed");
    setOutput(String(err?.message || err));
  };

  // init
  setStatus("loading", "Loading Python…");
  runBtn.disabled = true;
  stopBtn.disabled = true;
  worker.postMessage({ type: "init" });

  return worker;
}

function killWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function startRun() {
  running = true;
  stopBtn.disabled = false;
  runBtn.disabled = true;
}

function finishRun() {
  running = false;
  stopBtn.disabled = true;
  runBtn.disabled = false;
  if (runTimeout) {
    clearTimeout(runTimeout);
    runTimeout = null;
  }
}

function runCode() {
  const code = codeEditor.value || "";
  if (!code.trim()) {
    setOutput("⚠️ Please write some code first.");
    return;
  }

  const w = ensureWorker();
  const timeoutMs = Number(timeoutSelect.value || 3000);
  const capBytes = Number(capSelect.value || 16000);

  startRun();
  setOutput("Running…");

  // hard timeout: kill worker and recreate
  runTimeout = setTimeout(() => {
    setOutput(`⏱️ Timed out after ${timeoutMs}ms. (Try a longer timeout or optimize the code.)`);
    setStatus("ready", "Python ready");
    killWorker();
    ensureWorker();
    finishRun();
  }, timeoutMs);

  w.postMessage({ type: "run", code, capBytes });
}

/** Stop button kills worker immediately */
function stopCode() {
  if (!running) return;
  setOutput("■ Stopped.");
  setStatus("ready", "Python ready");
  killWorker();
  ensureWorker();
  finishRun();
}

/** Hook up UI */
runBtn.addEventListener("click", runCode);
stopBtn.addEventListener("click", stopCode);

clearBtn.addEventListener("click", () => setOutput("Run your code to see output here…"));

copyOutBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(outputEl.textContent || "");
    copyOutBtn.textContent = "Copied!";
    setTimeout(() => (copyOutBtn.textContent = "Copy"), 1200);
  } catch {
    copyOutBtn.textContent = "Failed";
    setTimeout(() => (copyOutBtn.textContent = "Copy"), 1200);
  }
});

/** Tab key indentation + Ctrl/Cmd+Enter */
codeEditor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const value = codeEditor.value;
    codeEditor.value = value.slice(0, start) + "    " + value.slice(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});

/** Load examples */
exampleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-example");
    const ex = codeExamples[key];
    if (!ex) return;
    codeEditor.value = ex;
    setOutput("Example loaded. Click Run.");
  });
});

/** Challenge placeholders */
document.querySelectorAll(".btn-challenge").forEach((b) => {
  b.addEventListener("click", () => alert("🚀 Coding challenges coming soon!"));
});

/** Tip card copy buttons (always safe) */
document.querySelectorAll('[data-copy]').forEach((block) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-clear";
  btn.style.position = "absolute";
  btn.style.top = "0.5rem";
  btn.style.right = "0.5rem";
  btn.textContent = "Copy";

  block.style.position = "relative";
  block.appendChild(btn);

  btn.addEventListener("click", async () => {
    const code = block.querySelector("code")?.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy"), 1200);
    } catch {
      btn.textContent = "Failed";
      setTimeout(() => (btn.textContent = "Copy"), 1200);
    }
  });
});

/** Initialize */
function boot() {
  // default snippet
  codeEditor.value = codeExamples.dictget;
  setOutput("Run your code to see output here…");
  ensureWorker();

  console.log("%c🚀 Welcome to itcompilesonmymachine!", "color:#00d4ff;font-size:18px;font-weight:800;");
  console.log("%cReal Python runs in a worker via Pyodide.", "color:#a0a8c0;font-size:12px;");
}

window.addEventListener("load", boot);