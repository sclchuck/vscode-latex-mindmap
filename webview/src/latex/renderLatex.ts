import katex from 'katex';
import { LatexRenderResult, LatexRenderError } from '../types';

// 渲染缓存
const renderCache = new Map<string, LatexRenderResult>();

/**
 * 接近 Overleaf / IEEE 论文正文的节点内容样式。
 * 调整: 放宽了 line-height，避免挤压行内公式；增加 overflow-wrap 保证排版不溢出。
 */
const IEEE_CONTENT_STYLE = [
  "font-family: 'Times New Roman', Times, serif", // 正文使用 Times
  "font-size: 14px", // 稍微调整基础大小
  "line-height: 1.5", // 1.3 对公式太紧凑，改为 1.5 更贴近论文的混排呼吸感
  "font-weight: 400",
  "color: #111",
  "text-rendering: geometricPrecision",
  "overflow-wrap: break-word" // 防止长公式撑破节点
].join('; ');

const IEEE_TEXT_STYLE = [
  "font-family: inherit", // 继承父级，避免冗余
  "font-size: 1em",
  "line-height: inherit",
  "font-weight: 400",
  "color: inherit",
].join('; ');

const IEEE_ERROR_STYLE = [
  "font-family: 'Times New Roman', Times, serif",
  "color: #b00020",
  "background: rgba(176, 0, 32, 0.08)",
  "border-bottom: 1px dotted #b00020",
  "padding: 0 2px",
].join('; ');

// KaTeX 配置
const KATEX_OPTIONS = {
  throwOnError: false,
  errorColor: '#b00020',
  strict: false,
  trust: true,
  macros: {
    '\\RR': '\\mathbb{R}',
    '\\NN': '\\mathbb{N}',
    '\\ZZ': '\\mathbb{Z}',
    '\\QQ': '\\mathbb{Q}',
    '\\CC': '\\mathbb{C}',
    '\\eps': '\\varepsilon',
    '\\argmax': '\\operatorname*{arg\\,max}',
    '\\argmin': '\\operatorname*{arg\\,min}',
    '\\E': '\\mathbb{E}',
    '\\Var': '\\operatorname{Var}',
    '\\Cov': '\\operatorname{Cov}',
    '\\Pr': '\\operatorname{Pr}',
    '\\fscript': '\\mathscr{f}',
    '\\gscript': '\\mathscr{g}',
    '\\hscript': '\\mathscr{h}',
    '\\loss': '\\mathcal{L}',
  },
};

export function clearRenderCache(): void {
  renderCache.clear();
}

export function renderLatex(source: string): LatexRenderResult {
  const cached = renderCache.get(source);
  if (cached) return cached;

  const errors: LatexRenderError[] = [];

  try {
    const html = renderMixedLatexAndText(source, errors);
    const wrappedHtml = `<div class="ieee-node-content" style="${IEEE_CONTENT_STYLE}">${html}</div>`;
    
    const result = new LatexRenderResult(wrappedHtml, errors);
    renderCache.set(source, result);
    return result;
  } catch (error) {
    return new LatexRenderResult(
      `<div class="ieee-node-content" style="${IEEE_CONTENT_STYLE}">${escapeHtml(source)}</div>`,
      [new LatexRenderError(error instanceof Error ? error.message : 'Unknown error', 0)]
    );
  }
}

function renderMixedLatexAndText(source: string, errors: LatexRenderError[]): string {
  let result = '';
  let index = 0;

  while (index < source.length) {
    const next = findNextFormulaStart(source, index);

    if (!next) {
      result += renderTextSegment(source.slice(index));
      break;
    }

    if (next.start > index) {
      result += renderTextSegment(source.slice(index, next.start));
    }

    const parsed = parseFormula(source, next.start, next.kind);

    if (!parsed) {
      result += renderTextSegment(source.slice(next.start, next.start + next.open.length));
      index = next.start + next.open.length;
      continue;
    }

    result += renderFormula(parsed.raw, parsed.latex, parsed.displayMode, parsed.start, errors);
    index = parsed.end;
  }

  return result;
}

type FormulaStartKind = 'inline-dollar' | 'block-dollar' | 'inline-paren' | 'block-bracket';

interface FormulaStart {
  start: number;
  kind: FormulaStartKind;
  open: string;
}

interface ParsedFormula {
  raw: string;
  latex: string;
  displayMode: boolean;
  start: number;
  end: number;
}

function findNextFormulaStart(source: string, fromIndex: number): FormulaStart | null {
  let best: FormulaStart | null = null;
  const candidates: FormulaStart[] = [];

  const blockDollar = findUnescaped(source, '$$', fromIndex);
  if (blockDollar !== -1) candidates.push({ start: blockDollar, kind: 'block-dollar', open: '$$' });

  const inlineDollar = findSingleDollarStart(source, fromIndex);
  if (inlineDollar !== -1) candidates.push({ start: inlineDollar, kind: 'inline-dollar', open: '$' });

  const inlineParen = findUnescaped(source, '\\(', fromIndex);
  if (inlineParen !== -1) candidates.push({ start: inlineParen, kind: 'inline-paren', open: '\\(' });

  const blockBracket = findUnescaped(source, '\\[', fromIndex);
  if (blockBracket !== -1) candidates.push({ start: blockBracket, kind: 'block-bracket', open: '\\[' });

  for (const candidate of candidates) {
    if (!best || candidate.start < best.start) best = candidate;
  }
  return best;
}

function parseFormula(source: string, start: number, kind: FormulaStartKind): ParsedFormula | null {
  switch (kind) {
    case 'block-dollar': {
      const open = '$$';
      const close = '$$';
      const contentStart = start + open.length;
      const closeIndex = findUnescaped(source, close, contentStart);
      if (closeIndex === -1) return null;
      return { raw: source.slice(start, closeIndex + close.length), latex: source.slice(contentStart, closeIndex), displayMode: true, start, end: closeIndex + close.length };
    }
    case 'inline-dollar': {
      const open = '$';
      const contentStart = start + open.length;
      const closeIndex = findSingleDollarEnd(source, contentStart);
      if (closeIndex === -1) return null;
      return { raw: source.slice(start, closeIndex + open.length), latex: source.slice(contentStart, closeIndex), displayMode: false, start, end: closeIndex + open.length };
    }
    case 'inline-paren': {
      const open = '\\(';
      const close = '\\)';
      const contentStart = start + open.length;
      const closeIndex = findUnescaped(source, close, contentStart);
      if (closeIndex === -1) return null;
      return { raw: source.slice(start, closeIndex + close.length), latex: source.slice(contentStart, closeIndex), displayMode: false, start, end: closeIndex + close.length };
    }
    case 'block-bracket': {
      const open = '\\[';
      const close = '\\]';
      const contentStart = start + open.length;
      const closeIndex = findUnescaped(source, close, contentStart);
      if (closeIndex === -1) return null;
      return { raw: source.slice(start, closeIndex + close.length), latex: source.slice(contentStart, closeIndex), displayMode: true, start, end: closeIndex + close.length };
    }
    default: return null;
  }
}

function renderTextSegment(text: string): string {
  if (!text) return '';
  const escaped = escapeHtml(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>');
  return `<span class="ieee-text" style="${IEEE_TEXT_STYLE}">${escaped}</span>`;
}

function renderFormula(raw: string, latex: string, displayMode: boolean, position: number, errors: LatexRenderError[]): string {
  const trimmedLatex = latex.trim();
  if (!trimmedLatex) return renderTextSegment(raw);

  try {
    const html = katex.renderToString(trimmedLatex, { ...KATEX_OPTIONS, displayMode });
    
    // 调整：避免外部样式干扰 KaTeX 自带的对其逻辑
    if (displayMode) {
      // 块级公式：使用稍微多一点的外边距
      return `<div class="katex-block-wrapper" style="margin: 0.8em 0; text-align: center; overflow-x: auto; overflow-y: hidden;">${html}</div>`;
    }
    
    // 行内公式：让 KaTeX 自身的基线对齐生效
    return `<span class="katex-inline-wrapper" style="margin: 0 0.1em;">${html}</span>`;
  } catch (error) {
    errors.push(new LatexRenderError(`Formula error: ${error instanceof Error ? error.message : 'Unknown'}`, position));
    return `<span class="latex-error" style="${IEEE_ERROR_STYLE}">${escapeHtml(raw)}</span>`;
  }
}

function findUnescaped(source: string, token: string, fromIndex: number): number {
  let index = source.indexOf(token, fromIndex);
  while (index !== -1) {
    if (!isEscaped(source, index)) return index;
    index = source.indexOf(token, index + token.length);
  }
  return -1;
}

function findSingleDollarStart(source: string, fromIndex: number): number {
  let index = source.indexOf('$', fromIndex);
  while (index !== -1) {
    const prev = index > 0 ? source[index - 1] : '';
    const next = index + 1 < source.length ? source[index + 1] : '';
    if (!isEscaped(source, index) && next !== '$' && prev !== '$') return index;
    index = source.indexOf('$', index + 1);
  }
  return -1;
}

function findSingleDollarEnd(source: string, fromIndex: number): number {
  let index = source.indexOf('$', fromIndex);
  while (index !== -1) {
    const prev = index > 0 ? source[index - 1] : '';
    const next = index + 1 < source.length ? source[index + 1] : '';
    if (!isEscaped(source, index) && next !== '$' && prev !== '$') {
      const content = source.slice(fromIndex, index);
      if (!content.includes('\n')) return index; // 行内公式不能跨行
      return -1;
    }
    index = source.indexOf('$', index + 1);
  }
  return -1;
}

function isEscaped(source: string, index: number): boolean {
  let slashCount = 0;
  let cursor = index - 1;
  while (cursor >= 0 && source[cursor] === '\\') {
    slashCount++;
    cursor--;
  }
  return slashCount % 2 === 1;
}

/**
 * [严重 BUG 修复]: 之前的替换结果是字符本身，会导致解析崩溃
 */
function escapeHtml(text: string): string {
  const replacements: [RegExp, string][] = [
    [/&/g, '&amp;'],
    [/</g, '&lt;'],
    [/>/g, '&gt;'],
    [/"/g, '&quot;'],
    [/'/g, '&#039;'],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function renderPlainText(source: string): string {
  return `<div class="ieee-node-content" style="${IEEE_CONTENT_STYLE}">${renderTextSegment(source)}</div>`;
}

export function containsLatex(source: string): boolean {
  return (
    /(?<!\\)\$\$[\s\S]+?(?<!\\)\$\$/.test(source) ||
    /(?<!\\)\$[^\n$]+?(?<!\\)\$/.test(source) ||
    /\\\([\s\S]+?\\\)/.test(source) ||
    /\\\[[\s\S]+?\\\]/.test(source)
  );
}

export function getErrorMessage(error: LatexRenderError): string {
  return error.message;
}