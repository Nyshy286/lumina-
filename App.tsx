import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PDFViewer } from './components/PDFViewer';
import { AIPanel } from './components/AIPanel';
import { HelpModal } from './components/HelpModal';
import { SettingsModal } from './components/SettingsModal';
import { ToolType, Annotation, ShapeType, ToolProperties, PDFViewerHandle } from './types';

const App: React.FC = () => {
    // ... (All state remains exactly the same)
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [pdfText, setPdfText] = useState('');
    const [isContinuous, setIsContinuous] = useState(false);
    const [isHorizontal, setIsHorizontal] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [glassOpacity, setGlassOpacity] = useState(0.85);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTool, setActiveTool] = useState<ToolType>(ToolType.PAN);
    const [activeShape, setActiveShape] = useState<ShapeType>(ShapeType.RECTANGLE);
    const [toolProperties, setToolProperties] = useState<ToolProperties>({
        color: '#ef4444', lineWidth: 2, opacity: 1.0, fontFamily: 'Inter', fontSize: 16
    });
    const [history, setHistory] = useState<Annotation[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const currentAnnotations = history[historyStep];
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isPanDragging, setIsPanDragging] = useState(false); 
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const viewerRef = useRef<PDFViewerHandle>(null);

    // --- STRICT CURSOR LOGIC ---
    // Maps logic state to the CSS class defined in index.html
    const cursorClass = useMemo(() => {
        if (activeTool === ToolType.MAGNIFY) return 'cursor-none';
        if (isPanDragging) return 'cursor-grabbing-theme';
        
        switch (activeTool) {
            case ToolType.PAN: return 'cursor-grab-theme';
            case ToolType.SELECT: return 'cursor-default-theme'; 
            case ToolType.TEXT: return 'cursor-text-tool-theme';
            case ToolType.ERASER: return 'cursor-eraser-theme';
            case ToolType.PEN:
            case ToolType.HIGHLIGHT:
            case ToolType.SHAPE:
                return 'cursor-crosshair-theme';
            default: return 'cursor-default-theme';
        }
    }, [activeTool, isPanDragging]);

    const handleSpeak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const handleStopSpeak = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const handleAskAI = (text: string) => {
        const formattedText = `> "${text}"\n\n`;
        setAiInput(formattedText);
        setIsAiPanelOpen(true);
    };

    const handleAnnotationsChange = (updateFn: (prev: Annotation[]) => Annotation[]) => {
        const newAnnotations = updateFn(currentAnnotations);
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newAnnotations);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const handleUndo = () => { if (historyStep > 0) setHistoryStep(prev => prev - 1); };
    const handleRedo = () => { if (historyStep < history.length - 1) setHistoryStep(prev => prev + 1); };

    const handleClearAnnotations = () => {
        if (confirm("Are you sure you want to clear all annotations?")) handleAnnotationsChange(() => []);
    };

    // Load File
    const loadFile = (file: File) => {
        if (file && file.type === 'application/pdf') {
            setIsGlobalLoading(true);
            setPdfFile(file);
            setCurrentPage(1);
            setHistory([[]]);
            setHistoryStep(0);
            setPdfText('');
            setNumPages(0);
            setTimeout(() => setIsGlobalLoading(false), 1200);
        } else {
            alert("Please select a valid PDF file.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            loadFile(e.target.files[0]);
            e.target.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            loadFile(e.dataTransfer.files[0]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); return; }
            
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                setScale(s => Math.min(4.0, s + 0.1));
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === '-')) {
                e.preventDefault();
                setScale(s => Math.max(0.25, s - 0.1));
                return;
            }

            if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                setActiveTool(prev => prev === ToolType.MAGNIFY ? (isEditMode ? ToolType.SELECT : ToolType.PAN) : ToolType.MAGNIFY);
                return;
            }

            if (!isEditMode) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch(e.key.toLowerCase()) {
                case 'v': setActiveTool(ToolType.SELECT); break;
                case 'p': setActiveTool(ToolType.PEN); break;
                case 'h': setActiveTool(ToolType.HIGHLIGHT); break;
                case 'e': setActiveTool(ToolType.ERASER); break;
                case 't': setActiveTool(ToolType.TEXT); break;
                case 'r': setActiveTool(ToolType.SHAPE); setActiveShape(ShapeType.RECTANGLE); break;
                case 'c': setActiveTool(ToolType.SHAPE); setActiveShape(ShapeType.CIRCLE); break;
                case 'l': setActiveTool(ToolType.SHAPE); setActiveShape(ShapeType.LINE); break;
                case 'a': setActiveTool(ToolType.SHAPE); setActiveShape(ShapeType.ARROW); break;
                case '[': setToolProperties(prev => ({ ...prev, lineWidth: Math.max(1, prev.lineWidth - 1) })); break;
                case ']': setToolProperties(prev => ({ ...prev, lineWidth: Math.min(100, prev.lineWidth + 1) })); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditMode, historyStep, history, activeTool]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            setScale(s => Math.min(4.0, Math.max(0.25, s + delta)));
        }
    };

    const getCurrentPageImage = () => viewerRef.current?.getCurrentPageImage() || null;
    const getImagesForPages = (pages: number[]) => viewerRef.current?.getImagesForPages(pages) || Promise.resolve([]);
    const getTextForPages = (pages: number[]) => viewerRef.current?.getTextForPages(pages) || Promise.resolve("");

    const appStyle = { '--glass-opacity': glassOpacity } as React.CSSProperties;

    return (
        <div 
            className={`flex flex-col h-screen w-screen bg-slate-900 text-slate-200 relative app-cursor-scope ${cursorClass}`}
            style={appStyle}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onWheel={handleWheel}
            onMouseDown={() => { if(activeTool === ToolType.PAN) setIsPanDragging(true); }}
            onMouseUp={() => setIsPanDragging(false)}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900 p-8 rounded-xl shadow-2xl text-center border border-slate-700">
                        <i className="fas fa-file-import text-5xl text-blue-400 mb-4"></i>
                        <h2 className="text-2xl font-bold text-white">Drop PDF here</h2>
                    </div>
                </div>
            )}

            {isSpeaking && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] animate-fadeIn">
                    <button onClick={handleStopSpeak} className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-md border border-red-400/50 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                        <i className="fas fa-stop-circle animate-pulse"></i> <span className="text-sm font-medium">Stop Reading</span>
                    </button>
                </div>
            )}

            {!isFullscreen && (
                <Toolbar 
                    scale={scale} setScale={setScale}
                    rotation={rotation} setRotation={setRotation}
                    currentPage={currentPage} numPages={numPages}
                    onPrevPage={() => setCurrentPage(p => Math.max(1, p - 1))}
                    onNextPage={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    onPageChange={setCurrentPage}
                    onFileChange={handleFileChange}
                    isEditMode={isEditMode} toggleEditMode={() => { setIsEditMode(!isEditMode); setActiveTool(isEditMode ? ToolType.SELECT : ToolType.PAN); }}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    isAiPanelOpen={isAiPanelOpen} toggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
                    toggleHelp={() => setIsHelpOpen(!isHelpOpen)}
                    toggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
                />
            )}

            {isGlobalLoading && (
                <div className="h-1 w-full bg-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 animate-gradient-flow"></div>
                </div>
            )}

            <div className="flex-1 flex relative overflow-hidden">
                {isEditMode && !isFullscreen && (
                    <Sidebar 
                        activeTool={activeTool} setActiveTool={setActiveTool}
                        activeShape={activeShape} setActiveShape={setActiveShape}
                        properties={toolProperties} setProperties={setToolProperties}
                        onUndo={handleUndo} onRedo={handleRedo}
                        canUndo={historyStep > 0} canRedo={historyStep < history.length - 1}
                        onFitScreen={() => setScale(0.8)} onFitWidth={() => setScale(1.2)}
                    />
                )}

                <PDFViewer 
                    ref={viewerRef}
                    file={pdfFile}
                    pageNumber={currentPage}
                    scale={scale}
                    rotation={rotation}
                    isContinuous={isContinuous}
                    isHorizontal={isHorizontal}
                    onLoadSuccess={setNumPages}
                    onTextExtracted={setPdfText}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    activeShape={activeShape}
                    toolProperties={toolProperties}
                    annotations={currentAnnotations}
                    setAnnotations={handleAnnotationsChange}
                    onPrevPage={() => setCurrentPage(p => Math.max(1, p - 1))}
                    onNextPage={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    onPageChange={setCurrentPage}
                    onAskAI={handleAskAI}
                    onSpeak={handleSpeak}
                />
                
                <AIPanel 
                    isOpen={isAiPanelOpen} 
                    onClose={() => setIsAiPanelOpen(false)}
                    pdfText={pdfText}
                    getCurrentPageImage={getCurrentPageImage}
                    getImagesForPages={getImagesForPages}
                    getTextForPages={getTextForPages}
                    numPages={numPages}
                    currentPage={currentPage}
                    initialInput={aiInput}
                    setInitialInput={setAiInput}
                    onSpeak={handleSpeak}
                />

                <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                <SettingsModal 
                    isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
                    onClearAnnotations={handleClearAnnotations}
                    onResetView={() => { setScale(1.0); setRotation(0); }}
                    isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                    isContinuous={isContinuous} onToggleContinuous={() => setIsContinuous(!isContinuous)}
                    isHorizontal={isHorizontal} onToggleHorizontal={() => setIsHorizontal(!isHorizontal)}
                    glassOpacity={glassOpacity} onGlassOpacityChange={setGlassOpacity}
                />
                
                {isFullscreen && (
                    <button className="absolute top-4 right-4 z-50 bg-slate-800/80 p-2 rounded-full hover:bg-slate-700 transition-all cursor-pointer" onClick={() => setIsFullscreen(false)}>
                        <i className="fas fa-compress text-white"></i>
                    </button>
                )}
            </div>
        </div>
    );
};

export default App;