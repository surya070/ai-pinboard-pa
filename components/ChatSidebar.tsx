
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
      content: "Hello! I'm your AI Pinboard Assistant. How can I help you manage your tasks today?",
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSendMessage(undefined, transcript);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const toggleListening = async () => {
    await ensureAudioContext(); // Use user gesture to unlock audio context
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      stopSpeaking();
      recognitionRef.current?.start();
    }
  };

  const speakText = async (text: string) => {
    if (!text) return;
    
    stopSpeaking();
    setIsSpeaking(true);

    try {
      const base64Audio = await generateSpeech(text);
      if (!base64Audio) throw new Error("No audio generated");

      const ctx = await ensureAudioContext();
      const audioData = decodeBase64(base64Audio);
      if (audioData.length === 0) throw new Error("Audio decoding failed");

      const audioBuffer = await decodeAudioData(audioData, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      
      activeSourceRef.current = source;
      source.start();
    } catch (err) {
      console.error("Playback error:", err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      activeSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    await ensureAudioContext(); // Use user gesture to unlock audio context

    const prompt = customPrompt || inputValue;
    if (!prompt.trim() || isLoading) return;

    stopSpeaking();

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

      const assistantContent = response.text || "I've updated your board.";
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: assistantContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (autoSpeak) {
        speakText(assistantContent);
      }
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'model',
        content: "I'm having trouble connecting. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Plan day", icon: "fa-sun", prompt: "Look at my tasks for today and help me plan a productive schedule." },
    { label: "Urgent?", icon: "fa-fire", prompt: "What are my most urgent tasks right now?" },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl overflow-hidden relative">
      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="absolute top-16 left-0 right-0 z-20 bg-indigo-100/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between animate-slide-in border-b border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="w-1 h-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
              <div className="w-1 h-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
            </div>
            <span className="text-xs font-bold text-indigo-700">Assistant speaking...</span>
          </div>
          <button onClick={stopSpeaking} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg font-bold">Stop</button>
        </div>
      )}

      <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fas fa-robot text-xl"></i>
          <h2 className="font-bold leading-tight">Assistant</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${autoSpeak ? 'bg-indigo-400 text-white' : 'bg-indigo-700 text-indigo-300'}`}
          >
            <i className={`fas ${autoSpeak ? 'fa-volume-up' : 'fa-volume-mute'} text-xs`}></i>
          </button>
          <div className="text-[10px] bg-indigo-500 px-2 py-1 rounded-full animate-pulse font-bold uppercase tracking-wider">
            Online
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 hide-scrollbar"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm group relative ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              
              {m.role === 'model' && m.id !== 'welcome' && (
                <button 
                  onClick={() => speakText(m.content)}
                  className="absolute -right-2 -bottom-2 w-6 h-6 bg-white border border-gray-100 rounded-full shadow-md text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fas fa-play text-[8px]"></i>
                </button>
              )}

              <span className={`text-[10px] mt-1 block opacity-50 ${m.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-gray-100 flex gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
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

        <form onSubmit={handleSendMessage} className="relative flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? "Listening..." : "Type a request..."}
              className={`w-full pl-4 pr-10 py-3 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isListening ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}`}
            />
            <button 
              type="button"
              onClick={toggleListening}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
          </div>
          
          <button 
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-100 shrink-0"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSidebar;
