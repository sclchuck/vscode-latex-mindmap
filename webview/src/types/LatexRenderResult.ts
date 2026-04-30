/**
 * LaTeX 渲染结果类
 * 包含渲染后的 HTML 和错误信息
 */
import { LatexRenderError } from './LatexRenderError';

export class LatexRenderResult {
    public readonly html: string;
    public readonly errors: LatexRenderError[];

    constructor(html: string, errors: LatexRenderError[] = []) {
        this.html = html;
        this.errors = errors;
    }

    /**
     * 是否有错误
     */
    public hasErrors(): boolean {
        return this.errors.length > 0;
    }
}