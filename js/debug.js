// 调试面板：展示当前代背后的运行细节

function updateDebugPanel(info) {
  if (!info) return;
  document.getElementById('debug-title').textContent = info.title;
  document.getElementById('debug-text').textContent = info.content;
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('debug-toggle');
  const content = document.getElementById('debug-content');
  toggleBtn.addEventListener('click', () => {
    content.classList.toggle('hidden');
    toggleBtn.textContent = content.classList.contains('hidden')
      ? '📋 调试面板 ▼'
      : '📋 调试面板 ▲';
  });
});
