import katex from 'katex';
import { LatexRenderResult, LatexRenderError } from '../types';

// 渲染缓存
const renderCache = new Map<string, LatexRenderResult>();

/**
 * 接近 Overleaf / IEEE 论文正文的节点内容样式。
 */
const IEEE_CONTENT_STYLE = [
  "font-family: 'Times New Roman', Times, serif",
  "font-size: 13.5px",
  "line-height: 1.3",
  "font-weight: 400",
  "letter-spacing: 0",
  "color: #111",
  "font-variant-ligatures: normal",
  "font-feature-settings: 'kern' 1",
  "text-rendering: geometricPrecision",
].join('; ');

const IEEE_TEXT_STYLE = [
  "font-family: 'Times New Roman', Times, serif",
  "font-size: 1em",
  "line-height: 1.3",
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

// 清除缓存
export function clearRenderCache(): void {
  renderCache.clear();
}

// 渲染 LaTeX 内容
export function renderLatex(source: string): LatexRenderResult {
  const cached = renderCache.get(source);
  if (cached) {
    return cached;
  }

  const errors: LatexRenderError[] = [];

  try {
    const html = renderMixedLatexAndText(source, errors);

    const wrappedHtml = [
      `<span class="ieee-node-content" style="${IEEE_CONTENT_STYLE}">`,
      html,
      `</span>`,
    ].join('');

    const result = new LatexRenderResult(wrappedHtml, errors);

    renderCache.set(source, result);

    return result;
  } catch (error) {
    return new LatexRenderResult(
      `<span class="ieee-node-content" style="${IEEE_CONTENT_STYLE}">${escapeHtml(source)}</span>`,
      [
        new LatexRenderError(
          error instanceof Error ? error.message : 'Unknown error',
          0
        ),
      ]
    );
  }
}

/**
 * 渲染混合文本和 LaTeX。
 */
function renderMixedLatexAndText(
  source: string,
  errors: LatexRenderError[]
): string {
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

    result += renderFormula(
      parsed.raw,
      parsed.latex,
      parsed.displayMode,
      parsed.start,
      errors
    );

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

/**
 * 查找下一个公式开始位置。
 */
function findNextFormulaStart(source: string, fromIndex: number): FormulaStart | null {
  let best: FormulaStart | null = null;

  const candidates: FormulaStart[] = [];

  const blockDollar = findUnescaped(source, '$$', fromIndex);
  if (blockDollar !== -1) {
    candidates.push({
      start: blockDollar,
      kind: 'block-dollar',
      open: '$$',
    });
  }

  const inlineDollar = findSingleDollarStart(source, fromIndex);
  if (inlineDollar !== -1) {
    candidates.push({
      start: inlineDollar,
      kind: 'inline-dollar',
      open: '$',
    });
  }

  const inlineParen = findUnescaped(source, '\\(', fromIndex);
  if (inlineParen !== -1) {
    candidates.push({
      start: inlineParen,
      kind: 'inline-paren',
      open: '\\(',
    });
  }

  const blockBracket = findUnescaped(source, '\\[', fromIndex);
  if (blockBracket !== -1) {
    candidates.push({
      start: blockBracket,
      kind: 'block-bracket',
      open: '\\[',
    });
  }

  for (const candidate of candidates) {
    if (!best || candidate.start < best.start) {
      best = candidate;
    }
  }

  return best;
}

/**
 * 解析公式。
 */
function parseFormula(
  source: string,
  start: number,
  kind: FormulaStartKind
): ParsedFormula | null {
  switch (kind) {
    case 'block-dollar': {
      const open = '$$';
      const close = '$$';
      const contentStart = start + open.length;
      const closeIndex = findUnescaped(source, close, contentStart);

      if (closeIndex === -1) return null;

      return {
        raw: source.slice(start, closeIndex + close.length),
        latex: source.slice(contentStart, closeIndex),
        displayMode: true,
        start,
        end: closeIndex + close.length,
      };
    }

    case 'inline-dollar': {
      const open = '$';
      const close = '$';
      const contentStart = start + open.length;
      const closeIndex = findSingleDollarEnd(source, contentStart);

      if (closeIndex === -1) return null;

      return {
        raw: source.slice(start, closeIndex + close.length),
        latex: source.slice(contentStart, closeIndex),
        displayMode: false,
        start,
        end: closeIndex + close.length,
      };
    }

    case 'inline-paren': {
      const open = '\\(';
      const close = '\\)';
      const contentStart = start + open.length;
      const closeIndex = findUnescaped(source, close, contentStart);

      if (closeIndex === -1) return null;

      return {
        raw: source.slice(start, closeIndex + close.length),
        latex: source.slice(contentStart, closeIndex),
        displayMode: false,
        start,
        end: closeIndex + close.length,
      };
    }

    case 'block-bracket': {
      const open = '\\[';
      const close = '\\]';
      const contentStart = start + open.length;
      const closeIndex = findUnescaped(source, close, contentStart);

      if (closeIndex === -1) return null;

      return {
        raw: source.slice(start, closeIndex + close.length),
        latex: source.slice(contentStart, closeIndex),
        displayMode: true,
        start,
        end: closeIndex + close.length,
      };
    }

    default:
      return null;
  }
}

/**
 * 渲染普通文本片段。
 */
function renderTextSegment(text: string): string {
  if (!text) return '';

  const escaped = escapeHtml(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br>');

  return `<span class="ieee-text" style="${IEEE_TEXT_STYLE}">${escaped}</span>`;
}

/**
 * 渲染公式 - 使用 KaTeX
 */
function renderFormula(
  raw: string,
  latex: string,
  displayMode: boolean,
  position: number,
  errors: LatexRenderError[]
): string {
  const trimmedLatex = latex.trim();

  if (!trimmedLatex) {
    return renderTextSegment(raw);
  }

  try {
    // 使用 KaTeX 渲染
    const html = katex.renderToString(trimmedLatex, {
      ...KATEX_OPTIONS,
      displayMode,
    });

    // KaTeX 使用 vertical-align 偏移来对齐基线
    // 对于行内公式，不需要额外样式
    if (displayMode) {
      return `<div class="katex-block" style="margin: 0.5em 0; text-align: center; overflow-x: auto;">${html}</div>`;
    }

    return `<span class="katex-inline">${html}</span>`;
  
  } catch (error) {
    errors.push(
      new LatexRenderError(
        `${displayMode ? 'Block' : 'Inline'} formula error: ${
          error instanceof Error ? error.message : 'Unknown'
        }`,
        position
      )
    );

    return `<span class="latex-error" style="${IEEE_ERROR_STYLE}">${escapeHtml(raw)}</span>`;
  }
}

/**
 * 查找未被反斜杠转义的 token。
 */
function findUnescaped(source: string, token: string, fromIndex: number): number {
  let index = source.indexOf(token, fromIndex);

  while (index !== -1) {
    if (!isEscaped(source, index)) {
      return index;
    }

    index = source.indexOf(token, index + token.length);
  }

  return -1;
}

/**
 * 查找单美元符号的开始位置。
 */
function findSingleDollarStart(source: string, fromIndex: number): number {
  let index = source.indexOf('$', fromIndex);

  while (index !== -1) {
    const prev = index > 0 ? source[index - 1] : '';
    const next = index + 1 < source.length ? source[index + 1] : '';

    const escaped = isEscaped(source, index);
    const isDoubleDollar = next === '$' || prev === '$';

    if (!escaped && !isDoubleDollar) {
      return index;
    }

    index = source.indexOf('$', index + 1);
  }

  return -1;
}

/**
 * 查找单美元符号的结束位置。
 */
function findSingleDollarEnd(source: string, fromIndex: number): number {
  let index = source.indexOf('$', fromIndex);

  while (index !== -1) {
    const prev = index > 0 ? source[index - 1] : '';
    const next = index + 1 < source.length ? source[index + 1] : '';

    const escaped = isEscaped(source, index);
    const isDoubleDollar = next === '$' || prev === '$';

    if (!escaped && !isDoubleDollar) {
      const content = source.slice(fromIndex, index);

      if (!content.includes('\n')) {
        return index;
      }

      return -1;
    }

    index = source.indexOf('$', index + 1);
  }

  return -1;
}

/**
 * 判断当前位置字符是否被反斜杠转义。
 */
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
 * HTML 转义。
 */
function escapeHtml(text: string): string {
  const replacements: [RegExp, string][] = [
    [/&/g, '&'],
    [/</g, '<'],
    [/>/g, '>'],
    [/"/g, '"'],
    [/'/g, '&#039;'],
  ];

  let result = text;

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

// 渲染纯文本
export function renderPlainText(source: string): string {
  return `<span class="ieee-node-content" style="${IEEE_CONTENT_STYLE}">${renderTextSegment(source)}</span>`;
}

// 快速检查是否包含 LaTeX
export function containsLatex(source: string): boolean {
  return (
    /(?<!\\)\$\$[\s\S]+?(?<!\\)\$\$/.test(source) ||
    /(?<!\\)\$[^\n$]+?(?<!\\)\$/.test(source) ||
    /\\\([\s\S]+?\\\)/.test(source) ||
    /\\\[[\s\S]+?\\\]/.test(source)
  );
}

// 获取错误信息
export function getErrorMessage(error: LatexRenderError): string {
  return error.message;
}