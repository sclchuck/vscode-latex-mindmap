/**
 * 布局配置类
 * 定义脑图树形布局的参数
 */
import type { LayoutDirection } from './LayoutDirection';

export class LayoutConfig {
    public readonly nodeWidth: number;
    public readonly nodeHeight: number;
    public readonly horizontalSpacing: number;
    public readonly verticalSpacing: number;
    public readonly direction: LayoutDirection;

    constructor(
        nodeWidth: number = 150,
        nodeHeight: number = 50,
        horizontalSpacing: number = 80,
        verticalSpacing: number = 30,
        direction: LayoutDirection = "right"
    ) {
        this.nodeWidth = nodeWidth;
        this.nodeHeight = nodeHeight;
        this.horizontalSpacing = horizontalSpacing;
        this.verticalSpacing = verticalSpacing;
        this.direction = direction;
    }

    /**
     * 创建默认配置
     */
    public static createDefault(): LayoutConfig {
        return new LayoutConfig();
    }
}
