import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bot, Send, X, MessageSquare } from "lucide-react";
import "../../css/admin/AdminChatbot.css";

const AdminChatbot = () => {
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem("adminChatOpen") === "true";
  });
  
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("adminChatMessages");
    if (saved) return JSON.parse(saved);
    return [
      { sender: "bot", text: "Hello Admin! I'm your assistant. Tell me where you'd like to go (e.g., 'Take me to users' or 'Show reports')." }
    ];
  });

  useEffect(() => {
    sessionStorage.setItem("adminChatOpen", isOpen);
  }, [isOpen]);

  useEffect(() => {
    sessionStorage.setItem("adminChatMessages", JSON.stringify(messages));
  }, [messages]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { sender: "user", text: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat`,
        { messages: newMessages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const { text, navigateTo } = res.data.data;
        
        setMessages(prev => [...prev, { sender: "bot", text }]);
        
        if (navigateTo) {
          setTimeout(() => {
            navigate(navigateTo);
          }, 3500); // Increased delay so admin has time to read the message before jump
        }
      }
    } catch (error) {
      console.error("Admin Chat API Error:", error);
      const errMsg = error.response?.data?.error || error.message || "Unknown error";
      setMessages(prev => [
        ...prev, 
        { sender: "bot", text: `I'm having trouble connecting to my brain right now. Error: ${errMsg}` }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="admin-chatbot-container">
      {/* Circular Sidebar Button */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', marginTop: 'auto' }}>
        <button 
          className={`acb-fab ${isOpen ? "open" : ""}`} 
          onClick={() => setIsOpen(!isOpen)}
          title="AI Assistant"
        >
          {isOpen ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="acb-window slide-up">
          <div className="acb-header">
            <div className="acb-header-info">
              <div className="acb-avatar">
                <Bot size={20} />
              </div>
              <div>
                <h3>Admin Assistant</h3>
                <p>Online</p>
              </div>
            </div>
          </div>
          
          <div className="acb-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`acb-bubble-wrapper ${msg.sender}`}>
                <div className={`acb-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="acb-bubble-wrapper bot">
                <div className="acb-bubble bot typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSend} className="acb-input-area">
            <input 
              type="text" 
              placeholder="e.g. 'Take me to users...'" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" disabled={isTyping || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminChatbot;
