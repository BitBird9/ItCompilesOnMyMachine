/* py-worker.js */
let pyodide = null;

function capJoin(chunks, capBytes) {
  // capBytes is approximate, but good enough
  let out = "";
  for (const chunk of chunks) {
    if ((out.length + chunk.length) > capBytes) {
      const remaining = Math.max(0, capBytes - out.length);
      out += chunk.slice(0, remaining);
      out += "\n…[output truncated]\n";
      return out;
    }
    out += chunk;
  }
  return out;
}

async function initPyodide() {
  if (pyodide) return;

  // Load from official CDN
  importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js");
  pyodide = await loadPyodide({
    stdout: () => {}, // we capture in python via sys.stdout
    stderr: () => {}
  });

  // Preload tiny helper that captures stdout/stderr safely.
  await pyodide.runPythonAsync(`
import sys, io, traceback

def __run_user_code(code: str):
    _stdout = io.StringIO()
    _stderr = io.StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = _stdout, _stderr
    try:
        # Run in fresh globals to reduce cross-run surprises
        glb = {"__name__": "__main__"}
        exec(code, glb, glb)
        return {"ok": True, "stdout": _stdout.getvalue(), "stderr": _stderr.getvalue()}
    except Exception:
        tb = traceback.format_exc()
        return {"ok": False, "stdout": _stdout.getvalue(), "stderr": _stderr.getvalue() + tb}
    finally:
        sys.stdout, sys.stderr = old_out, old_err
  `);
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg?.type === "init") {
    try {
      await initPyodide();
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "fatal", error: String(e) });
    }
    return;
  }

  if (msg?.type === "run") {
    const { code, capBytes } = msg;

    try {
      await initPyodide();

      // Call the helper and return structured result
      const res = pyodide.globals.get("__run_user_code")(code).toJs();

      const chunks = [];
      if (res.stdout) chunks.push(res.stdout);
      if (res.stderr) chunks.push(res.stderr);

      const output = capJoin(chunks, capBytes ?? 16000);

      self.postMessage({
        type: "result",
        ok: !!res.ok,
        output: output || "(no output)"
      });
    } catch (e) {
      self.postMessage({
        type: "result",
        ok: false,
        output: `Worker error: ${String(e)}`
      });
    }
  }
};