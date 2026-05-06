import React, { useRef, useState } from 'react';
import { useAppContext } from '../store';

const GEMINI_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const GPT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '5:4', '4:5', '16:9', '9:16', '2:1', '1:2', '21:9', '9:21'];
const GPT_4K_RATIOS = ['16:9', '9:16', '2:1', '1:2', '21:9', '9:21'];

export const Toolbar = () => {
    const { model, setModel, resolution, setResolution, ratio, setRatio, addItem, selectedId, items, updateItem, removeItem } = useAppContext();
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableRatios = model === 'gemini-3-pro-image-preview' 
        ? GEMINI_RATIOS 
        : (resolution === '4k' ? GPT_4K_RATIOS : GPT_RATIOS);

    React.useEffect(() => {
        if (!availableRatios.includes(ratio)) {
            setRatio(availableRatios[0]);
        }
    }, [model, resolution, availableRatios, ratio, setRatio]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    addItem({
                        id: Date.now().toString(),
                        type: 'image',
                        x: 100, y: 100,
                        width: img.width > 500 ? 500 : img.width,
                        height: img.width > 500 ? (img.height * 500) / img.width : img.height,
                        src,
                        parentId: selectedId || undefined // if a node is selected, connect this uploaded image to it
                    });
                }
                img.src = src;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        const newNodeId = Date.now().toString();
        
        let parentNode = items.find(i => i.id === selectedId);
        
        // Add a placeholder node indicating it's generating
        addItem({
            id: newNodeId,
            type: 'image',
            x: parentNode ? parentNode.x + parentNode.width + 100 : window.innerWidth / 2 - 200,
            y: parentNode ? parentNode.y : window.innerHeight / 2 - 200,
            width: 400,
            height: 400,
            isGenerating: true,
            parentId: parentNode ? parentNode.id : undefined
        });

        try {
            const sizeStr = `${resolution}_${ratio}`; 
            
            // Build request
            const reqBody: any = {
                model: model,
                prompt: prompt,
                n: 1,
                size: sizeStr, 
                resolution: resolution,
                aspect_ratio: ratio
            };

            // If we have a selected node containing an image, use it for image-to-image
            if (parentNode && parentNode.src) {
                reqBody.image = parentNode.src; // Assuming apimart proxy accepts this
            }

            const res = await fetch('/api/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });
            const textData = await res.text();
            let data;
            try {
                data = textData ? JSON.parse(textData) : {};
            } catch (e) {
                throw new Error(`Invalid response from server: ${textData.substring(0, 100)}`);
            }
            if (!res.ok) throw new Error(data.error?.message || data.error || '生成失败');

            if (data.data && data.data.length > 0) {
                const url = data.data[0].url || data.data[0].b64_json;
                const imageSrc = url.startsWith('http') ? url : `data:image/png;base64,${url}`;
                
                updateItem(newNodeId, {
                    isGenerating: false,
                    src: imageSrc
                });
            } else {
                throw new Error('未返回图片数据');
            }
        } catch (error: any) {
            alert('生成错误: ' + error.message);
            removeItem(newNodeId);
        } finally {
            setIsGenerating(false);
            setPrompt("");
        }
    };

    return (
        <aside className="w-[300px] border-r border-gray-200 flex flex-col bg-white p-6 shrink-0 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
            <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2 block">模型引擎</label>
                <div className="space-y-2 relative">
                    <select 
                        value={model} 
                        onChange={e => setModel(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-3 pr-8 appearance-none focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-gray-800 shadow-sm"
                    >
                        <option value="gemini-3-pro-image-preview">gemini-3-pro-image (1x/2x/4k)</option>
                        <option value="gpt-image-2">gpt-image-2</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
            </div>

            <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">画质分辨率</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
                    {['1k', '2k', '4k'].map(res => (
                        <button 
                            key={res}
                            onClick={() => setResolution(res)}
                            className={`py-1.5 text-[10px] font-bold flex items-center justify-center rounded-md transition-all shadow-sm ${resolution === res ? 'bg-white text-blue-600 shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-700 shadow-none'}`}
                        >
                            {res.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-8">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block flex justify-between items-center">
                    <span>画幅比例</span>
                    <span className="text-gray-300 font-normal">支持 {availableRatios.length} 种</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {availableRatios.map(r => (
                        <button 
                            key={r}
                            onClick={() => setRatio(r)}
                            className={`aspect-square text-[9px] font-bold flex items-center justify-center rounded-lg border transition-all ${ratio === r ? 'bg-blue-50 text-blue-600 border-blue-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">提示词 (Prompt)</label>
                    {selectedId && (
                        <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                            关联图生图
                        </span>
                    )}
                </div>
                <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                    className="w-full min-h-[140px] flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs resize-none focus:outline-none focus:border-blue-500 focus:bg-white text-gray-800 leading-relaxed shadow-inner transition-colors" 
                    placeholder="描述你想要的画面，中英文皆可..."
                ></textarea>
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="mt-4 w-full h-12 bg-blue-600 rounded-xl text-xs font-bold tracking-widest text-white shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            生成中...
                        </>
                    ) : '生成图像'}
                </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-10 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all gap-2"
                >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <span className="text-[10px] font-bold tracking-wider text-gray-700">{selectedId ? '上传参考节点' : '上传本地图片'}</span>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleUpload} 
                />
            </div>
        </aside>
    );
};
