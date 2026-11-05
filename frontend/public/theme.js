// Apply before the first paint to avoid a light flash on dark pages.
(() => {
  let theme;
  try { theme = localStorage.getItem('achedoacoes-theme'); } catch {}
  if (theme !== 'light' && theme !== 'dark') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
})();
