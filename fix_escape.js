const fs = require('fs');
let c = fs.readFileSync('webview/src/latex/renderLatex.ts', 'utf8');

// 修复 HTML 转义函数
c = c.replace(
  /function escapeHtml\(text: string\): string \{[\s\S]*?return text\.replace\(\/\[&<>"'\]\/g, \(m\) => map\[m\]\);[\s\S]*?\}/,
  `function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}`
);

fs.writeFileSync('webview/src/latex/renderLatex.ts', c);
console.log('Fixed escapeHtml function');
