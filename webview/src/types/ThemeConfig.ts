/**
 * 主题配置类
 * 定义脑图的视觉主题
 */
export class ThemeConfig {
    public readonly name: string;
    public readonly nodeBackground: string;
    public readonly nodeBorder: string;
    public readonly nodeText: string;
    public readonly rootBackground: string;
    public readonly rootBorder: string;
    public readonly rootText: string;
    public readonly lineColor: string;
    public readonly selectedBackground: string;
    public readonly selectedBorder: string;

    constructor(config: ThemeConfigInterface) {
        this.name = config.name;
        this.nodeBackground = config.nodeBackground;
        this.nodeBorder = config.nodeBorder;
        this.nodeText = config.nodeText;
        this.rootBackground = config.rootBackground;
        this.rootBorder = config.rootBorder;
        this.rootText = config.rootText;
        this.lineColor = config.lineColor;
        this.selectedBackground = config.selectedBackground;
        this.selectedBorder = config.selectedBorder;
    }

    /**
     * 获取主题配置接口
     */
    public toConfig(): ThemeConfigInterface {
        return {
            name: this.name,
            nodeBackground: this.nodeBackground,
            nodeBorder: this.nodeBorder,
            nodeText: this.nodeText,
            rootBackground: this.rootBackground,
            rootBorder: this.rootBorder,
            rootText: this.rootText,
            lineColor: this.lineColor,
            selectedBackground: this.selectedBackground,
            selectedBorder: this.selectedBorder
        };
    }
}

/**
 * 主题配置接口
 */
export interface ThemeConfigInterface {
    name: string;
    nodeBackground: string;
    nodeBorder: string;
    nodeText: string;
    rootBackground: string;
    rootBorder: string;
    rootText: string;
    lineColor: string;
    selectedBackground: string;
    selectedBorder: string;
}

/**
 * 内置主题
 */
export const themes: Record<string, ThemeConfig> = {
    'fresh-blue': new ThemeConfig({
        name: 'Fresh Blue',
        nodeBackground: '#ffffff',
        nodeBorder: '#4a90d9',
        nodeText: '#333333',
        rootBackground: '#4a90d9',
        rootBorder: '#3a7fc8',
        rootText: '#ffffff',
        lineColor: '#4a90d9',
        selectedBackground: '#e8f4fc',
        selectedBorder: '#2171b5',
    }),
    'dark': new ThemeConfig({
        name: 'Dark',
        nodeBackground: '#2d2d2d',
        nodeBorder: '#555555',
        nodeText: '#e0e0e0',
        rootBackground: '#1e1e1e',
        rootBorder: '#0e639c',
        rootText: '#ffffff',
        lineColor: '#555555',
        selectedBackground: '#3c3c3c',
        selectedBorder: '#0e639c',
    }),
    'green': new ThemeConfig({
        name: 'Green',
        nodeBackground: '#ffffff',
        nodeBorder: '#28a745',
        nodeText: '#333333',
        rootBackground: '#28a745',
        rootBorder: '#1e7e34',
        rootText: '#ffffff',
        lineColor: '#28a745',
        selectedBackground: '#e8f5e9',
        selectedBorder: '#1e7e34',
    }),
};