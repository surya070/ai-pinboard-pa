
import React, { useState, useRef, useEffect } from 'react';
import { Task, ChatMessage } from '../types';
import { getGeminiResponse, generateSpeech } from '../services/gemini';
import { decodeBase64, decodeAudioData } from '../utils/audio';

interface ChatSidebarProps {
  tasks: Task[];
  onTaskAction: (action: string, data: any) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ tasks, onTaskAction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I'm your AI Pinboard Assistant. How can I help you today?",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSendMessage(undefined, transcript);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    return audioContextRef.current;
  };

  const toggleListening = async () => {
    await ensureAudioContext();
    if (isListening) recognitionRef.current?.stop();
    else { stopSpeaking(); recognitionRef.current?.start(); }
  };

  const speakText = async (text: string) => {
    if (!text) return;
    stopSpeaking();
    setIsSpeaking(true);
    try {
      const base64Audio = await generateSpeech(text);
      if (!base64Audio) throw new Error();
      const ctx = await ensureAudioContext();
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      activeSourceRef.current = source;
      source.start();
    } catch (err) { setIsSpeaking(false); }
  };

  const stopSpeaking = () => {
    if (activeSourceRef.current) { try { activeSourceRef.current.stop(); } catch (e) {} activeSourceRef.current = null; }
    setIsSpeaking(false);
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    await ensureAudioContext();
    const prompt = customPrompt || inputValue;
    if (!prompt.trim() || isLoading) return;
    stopSpeaking();

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: prompt, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const response = await getGeminiResponse(prompt, tasks, history);
      if (response.functionCalls) response.functionCalls.forEach((c: any) => onTaskAction(c.name, c.args));
      
      const content = response.text || "Updated!";
      const assistantMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', content, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      if (autoSpeak) speakText(content);
    } catch (err) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', content: "Error processing request.", timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  // Expanded quick messages for productivity
  const actions = [
    { label: "Plan Day", icon: "fa-sun", prompt: "Suggest a plan for my tasks today based on their priority and deadlines." },
    { label: "Deadlines", icon: "fa-calendar-check", prompt: "Review my upcoming deadlines and tell me what needs attention soon." },
    { label: "Add Task", icon: "fa-plus-circle", prompt: "I want to add a new task to my board." },
    { label: "Update", icon: "fa-edit", prompt: "I need to update or change one of my existing tasks." },
    { label: "Urgent?", icon: "fa-fire", prompt: "Which tasks are my most urgent right now?" },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl overflow-hidden relative">
      {isSpeaking && (
        <div className="absolute top-16 left-0 right-0 z-20 bg-teal-100/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between border-b border-teal-200 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="flex gap-1"><div className="w-1 h-4 bg-teal-600 rounded-full animate-bounce"></div><div className="w-1 h-4 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div></div>
            <span className="text-xs font-bold text-teal-700">Speaking...</span>
          </div>
          <button onClick={stopSpeaking} className="text-xs bg-teal-600 text-white px-2 py-1 rounded-lg font-bold">Stop</button>
        </div>
      )}
      <div className="p-4 bg-teal-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2"><i className="fas fa-robot text-xl"></i><h2 className="font-bold">Assistant</h2></div>
        <button onClick={() => setAutoSpeak(!autoSpeak)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${autoSpeak ? 'bg-teal-400' : 'bg-teal-700 text-teal-300'}`}>
          <i className={`fas ${autoSpeak ? 'fa-volume-up' : 'fa-volume-mute'} text-xs`}></i>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 hide-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm group relative ${m.role === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              {m.role === 'model' && m.id !== 'welcome' && (
                <button onClick={() => speakText(m.content)} className="absolute -right-2 -bottom-2 w-6 h-6 bg-white border border-gray-100 rounded-full shadow-md text-teal-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fas fa-play text-[8px]"></i>
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-gray-100 flex gap-1">
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-3 max-h-24 overflow-y-auto p-1 hide-scrollbar">
          {actions.map((a, i) => (
            <button 
              key={i} 
              onClick={() => handleSendMessage(undefined, a.prompt)} 
              className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2 py-1.5 rounded-lg hover:bg-teal-100 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <i className={`fas ${a.icon}`}></i>
              {a.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="relative flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              placeholder={isListening ? "Listening..." : "Type request..."} 
              className={`w-full pl-4 pr-10 py-3 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all ${isListening ? 'bg-teal-50 ring-2 ring-teal-200' : ''}`}
            />
            <button 
              type="button" 
              onClick={toggleListening} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-teal-600'}`}
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
          </div>
          <button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()} 
            className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 shadow-md shadow-teal-100 shrink-0"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSidebar;
