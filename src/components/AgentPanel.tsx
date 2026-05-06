import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../store';

export const AgentPanel = () => {
    const { messages, setMessages, items } = useAppContext();
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleChat = async () => {
        if (!input.trim()) return;
        
        const newMsgId = Date.now().toString();
        const userMsg = { id: newMsgId, role: 'user' as const, content: input };
        
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const canvasContext = items.length > 0 ? 
                `当前画布有 ${items.length} 张图片/节点。第一张尺寸: ${items[0].width}x${items[0].height}。` 
                : "当前画布为空。";

            const systemPrompt = `你是一个数字绘画和设计的AI助手（202专用设计助手中的AI），当前正在与用户用中文沟通。
你的目标是帮助用户理解如何使用无限画布、给与灵感，如果他们要求生图，你可以直接提供高质量的提示词供他们复制。你使用的是 gemini-3.1-pro-preview 模型。
上下文环境: ${canvasContext}
请提供简明扼要的回复，保持专业、高级的设计师口吻。`;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemini-3.1-pro-preview',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: input }
                    ]
                })
            });

            const textData = await res.text();
            let data;
            try {
                data = textData ? JSON.parse(textData) : {};
            } catch (e) {
                throw new Error(`Invalid response from server: ${textData.substring(0, 100)}`);
            }
            if (!res.ok) throw new Error(data.error?.message || data.error || 'Chat failed');
            
            const reply = data.choices?.[0]?.message?.content || "抱歉，没有收到回复。";
            
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: reply
            }]);
            
        } catch (e: any) {
             setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${e.message}`
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <aside className="w-[320px] border-l border-gray-200 flex flex-col bg-white shrink-0 z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <div className="text-xs font-bold text-gray-800">智能灵感助手</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        gemini-3.1-pro
                    </div>
                </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-[#FAFAFA]">
                {messages.length === 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="text-[10px] font-bold text-gray-400">系统引导</div>
                        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-2xl rounded-tl-none text-xs leading-relaxed text-gray-600">
                            已分析当前画布。如果你需要构图建议、提示词生成或者各种功能的帮助，随时问我。
                        </div>
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className="flex flex-col gap-1.5">
                        <div className={`text-[10px] font-bold ${msg.role === 'user' ? 'text-blue-600 text-right pr-1' : 'text-gray-400'}`}>
                            {msg.role === 'user' ? '你' : '助手回复'}
                        </div>
                        <div className={`px-4 py-3 border rounded-2xl text-[12px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 border-blue-600 text-white rounded-tr-none ml-6' : 'bg-white border-gray-200 rounded-tl-none text-gray-700 mr-6'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] font-bold text-gray-400">助手思考中</div>
                        <div className="p-3 bg-white border border-gray-200 rounded-2xl rounded-tl-none text-xs flex items-center gap-1.5 w-[60px] shadow-sm">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s'}}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleChat(); }}
                        className="w-full h-10 bg-gray-50 border border-gray-300 focus:bg-white rounded-xl pl-4 pr-10 text-xs focus:outline-none focus:border-blue-500 text-gray-800 transition-all shadow-sm" 
                        placeholder="向助手提问..."
                        disabled={isTyping}
                    />
                    <div 
                        onClick={handleChat}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer shadow-md shadow-blue-500/20 transition-all ${isTyping || !input ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-700'}`}
                    >
                         <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </div>
                </div>
            </div>
        </aside>
    );
};
