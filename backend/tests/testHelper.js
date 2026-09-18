export async function ensureServer(port = 5000) {
  try {
    const res = await fetch(`http://localhost:${port}/health`);
    if (res.ok) {
      return;
    }
  } catch (_) {}

  // Server is not running externally, boot in-process
  await import('../src/index.js');

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
}
