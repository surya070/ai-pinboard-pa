
import React, { useState, useRef, useEffect } from 'react';
import { Task, ChatMessage } from '../types';
import { getGeminiResponse } from '../services/gemini';

interface ChatSidebarProps {
  tasks: Task[];
  onTaskAction: (action: string, data: any) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ tasks, onTaskAction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I'm your AI Pinboard Assistant. How can I help you manage your tasks today?",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const prompt = customPrompt || inputValue;
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      const response = await getGeminiResponse(prompt, tasks, history);
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          onTaskAction(call.name, call.args);
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text || "I've processed your request.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'model',
        content: "I encountered an error while processing that. Please check your network and try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Plan my day", icon: "fa-sun", prompt: "Look at my tasks for today and help me plan a productive schedule. Suggest what to do first based on urgency." },
    { label: "What's urgent?", icon: "fa-fire", prompt: "Highlight the most urgent tasks I need to focus on right now." },
    { label: "Add quick task", icon: "fa-plus", prompt: "I'd like to add a quick task. Ask me for details." },
    { label: "Review deadlines", icon: "fa-calendar-check", prompt: "Summarize my upcoming deadlines for the next 7 days." },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl overflow-hidden">
      <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fas fa-robot text-xl"></i>
          <h2 className="font-bold">Personal Assistant</h2>
        </div>
        <div className="text-xs bg-indigo-500 px-2 py-1 rounded-full animate-pulse">
          Online
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 hide-scrollbar"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              <span className={`text-[10px] mt-1 block opacity-50 ${m.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-gray-100 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(undefined, action.prompt)}
              className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
            >
              <i className={`fas ${action.icon}`}></i>
              {action.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a request..."
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button 
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSidebar;
