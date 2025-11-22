
// --- ENUMS ---
export enum ToolType {
    NONE = 'none',
    SELECT = 'select',
    PAN = 'pan',
    PEN = 'pen',
    HIGHLIGHT = 'highlight',
    ERASER = 'eraser',
    SHAPE = 'shape',
    TEXT = 'text',
    MAGNIFY = 'magnify' // New Tool
}

export enum ShapeType {
    RECTANGLE = 'rectangle',
    CIRCLE = 'circle',
    LINE = 'line',
    ARROW = 'arrow'
}

export enum AIMode {
    PAGE_ANALYSIS = 'page',
    DOCUMENT_CHAT = 'document',
    CUSTOM_SCOPE = 'custom'
}

// --- INTERFACES ---
export interface ToolProperties {
    color: string;
    lineWidth: number;
    opacity: number;
    fontFamily?: string;
    fontSize?: number;
}

export interface Annotation {
    id: string;
    page: number;
    type: ToolType;
    points?: { x: number, y: number }[]; // For Pen/Highlight
    bounds?: { x: number, y: number, w: number, h: number }; // For Shapes/Text
    text?: string; // For Text tool
    shapeType?: ShapeType;
    color: string;
    lineWidth: number;
    opacity: number;
    fontFamily?: string;
    fontSize?: number;
}

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    text: string;
    images?: string[]; // Array of base64 strings
    image?: string; // Legacy support
    timestamp: number;
}

export interface PDFViewerHandle {
    getCurrentPageImage: () => string | null;
    getImagesForPages: (pageNumbers: number[]) => Promise<string[]>;
    getTextForPages: (pageNumbers: number[]) => Promise<string>;
}

// --- GLOBAL TYPES ---
declare global {
    interface Window {
        pdfjsLib: {
            GlobalWorkerOptions: {
                workerSrc: string;
            };
            getDocument: (src: string | { data: Uint8Array }) => {
                promise: Promise<any>;
            };
            renderTextLayer: (params: {
                textContentSource: any;
                container: HTMLElement;
                viewport: any;
                textDivs: any[];
                textContentStream?: any;
            }) => {
                promise: Promise<void>;
                cancel: () => void;
            };
        };
    }
}