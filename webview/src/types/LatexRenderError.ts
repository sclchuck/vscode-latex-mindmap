/**
 * LaTeX 渲染错误类
 * 表示渲染过程中的错误信息
 */
export class LatexRenderError {
    public readonly message: string;
    public readonly position: number;

    constructor(message: string, position: number = 0) {
        this.message = message;
        this.position = position;
    }
}