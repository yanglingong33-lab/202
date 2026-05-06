import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CanvasItem = {
    id: string;
    type: 'image' | 'box';
    x: number;
    y: number;
    width: number;
    height: number;
    src?: string;
    color?: string;
    parentId?: string; // Connected node
    isGenerating?: boolean; // Loading state
};

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image?: string; 
};

type AppState = {
    items: CanvasItem[];
    setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
    addItem: (item: CanvasItem) => void;
    updateItem: (id: string, updates: Partial<CanvasItem>) => void;
    removeItem: (id: string) => void;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    
    // Generation Settings
    model: string;
    setModel: (m: string) => void;
    resolution: string;
    setResolution: (r: string) => void;
    ratio: string;
    setRatio: (r: string) => void;
};

const AppContext = createContext<AppState | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    
    // Default generation state
    const [model, setModel] = useState('gemini-3-pro-image-preview');
    const [resolution, setResolution] = useState('1k');
    const [ratio, setRatio] = useState('1:1');

    const addItem = (item: CanvasItem) => setItems(prev => [...prev, item]);
    const updateItem = (id: string, updates: Partial<CanvasItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };
    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    return (
        <AppContext.Provider value={{
            items, setItems, addItem, updateItem, removeItem,
            messages, setMessages,
            selectedId, setSelectedId,
            model, setModel, resolution, setResolution, ratio, setRatio
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext must be used within AppProvider");
    return ctx;
};
