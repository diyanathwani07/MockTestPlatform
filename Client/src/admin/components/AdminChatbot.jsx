import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bot, Send, X, MessageSquare } from "lucide-react";
import "../../css/admin/AdminChatbot.css";
import useDraggable from "../../hooks/useDraggable";

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
  const { position, wasDragged, handlers } = useDraggable(30, 30);

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

  const handleFabClick = () => {
    if (wasDragged.current) return;
    setIsOpen(!isOpen);
  };

  const isUpperHalf = position.bottom > window.innerHeight / 2;
  const isLeftHalf = position.right > window.innerWidth / 2;

  const windowStyle = {
    position: "absolute",
    zIndex: 9999,
    width: "350px",
    height: "500px",
    maxHeight: "calc(100vh - 120px)",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1.5px solid var(--border-color, #E2E8F0)",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    
    // Dynamic Positioning
    bottom: isUpperHalf ? "auto" : "70px",
    top: isUpperHalf ? "70px" : "auto",
    right: isLeftHalf ? "auto" : "0",
    left: isLeftHalf ? "0" : "auto",
    transformOrigin: `${isUpperHalf ? "top" : "bottom"} ${isLeftHalf ? "left" : "right"}`
  };

  return (
    <div className="admin-chatbot-container" style={{ bottom: position.bottom, right: position.right }}>
      {/* Circular Sidebar Button */}
      <div>
        <button 
          className={`acb-fab ${isOpen ? "open" : ""}`} 
          onClick={handleFabClick}
          title="AI Assistant"
          {...handlers}
          style={{ touchAction: 'none' }}
        >
          {isOpen ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="acb-window slide-up" style={windowStyle}>
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
