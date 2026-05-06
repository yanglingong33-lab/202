/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './store';
import { Toolbar } from './components/Toolbar';
import { CanvasArea } from './components/CanvasArea';
import { AgentPanel } from './components/AgentPanel';

export default function App() {
  const [showAgent, setShowAgent] = useState(true);

  return (
    <AppProvider>
      <div className="flex flex-col w-screen h-screen bg-[#F7F8FA] text-[#1A1A1A] font-sans overflow-hidden">
        {/* Global Header */}
        <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center font-bold text-white italic text-lg shadow-sm">202</div>
            <span className="text-sm font-semibold tracking-wide text-gray-800">202专用设计助手 <span className="text-gray-400 font-normal ml-2 text-xs border border-gray-200 px-1.5 py-0.5 rounded">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100 hidden sm:block">Engine: apimart</div>
            <div className="h-8 px-4 bg-gray-50 border border-gray-200 shadow-sm rounded-full flex items-center text-xs font-medium hover:bg-gray-100 hover:shadow cursor-pointer transition-all text-gray-700">
              导出画板
            </div>
            <button 
              onClick={() => setShowAgent(!showAgent)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm"
              title="切换助手"
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </button>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden relative">
          {/* Main Left Side (Toolbar/Controls) */}
          <Toolbar />
          
          {/* Main Canvas Area */}
          <CanvasArea />
          
          {/* Right Side (AI Agent) */}
          {showAgent && <AgentPanel />}
        </main>

        {/* Status Bar */}
        <footer className="h-7 bg-white border-t border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> 系统运行中</span>
            <span className="text-gray-300">|</span>
            <span>无限作图模式</span>
          </div>
          <div className="text-[10px] font-medium text-gray-400 tracking-wide">
            支持 4K 原生画质与节点连续图生图
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}
