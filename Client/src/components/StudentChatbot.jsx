import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bot, Send, X } from "lucide-react";
import "../css/admin/AdminChatbot.css"; // Reuse the same CSS since layout is identical

const StudentChatbot = () => {
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem("studentChatOpen") === "true";
  });
  
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("studentChatMessages");
    if (saved) return JSON.parse(saved);
    return [
      { sender: "bot", text: "Hello! I'm your Student Support Assistant. How can I help you today? (e.g., 'How do I check my results?' or 'I need help with a mock test')" }
    ];
  });

  useEffect(() => {
    sessionStorage.setItem("studentChatOpen", isOpen);
  }, [isOpen]);

  useEffect(() => {
    sessionStorage.setItem("studentChatMessages", JSON.stringify(messages));
  }, [messages]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

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
        const { text, offerTicket } = res.data.data;
        
        setMessages(prev => [...prev, { sender: "bot", text }]);
        
        if (offerTicket) {
           setTimeout(() => {
              setMessages(prev => [...prev, { 
                 sender: "bot", 
                 text: "It looks like you might need more specific help. Would you like to submit a support ticket?", 
                 isTicketPrompt: true 
              }]);
           }, 1000);
        }
      }
    } catch (error) {
      console.error("Student Chat API Error:", error);
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
      <div>
        <button 
          className={`acb-fab ${isOpen ? "open" : ""}`} 
          onClick={() => setIsOpen(!isOpen)}
          title="AI Student Assistant"
        >
          {isOpen ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="acb-window slide-up">
          <div className="acb-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="acb-header-info">
              <div className="acb-avatar">
                <Bot size={20} />
              </div>
              <div>
                <h3>AI Support Assistant</h3>
                <p>Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={20} />
            </button>
          </div>

          <div className="acb-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`acb-bubble-wrapper ${msg.sender}`}>
                <div className={`acb-bubble ${msg.sender}`}>
                  {msg.text}
                  {msg.isTicketPrompt && (
                     <div style={{ marginTop: "8px" }}>
                       <a href="/dashboard/help" style={{ display: "inline-block", background: "#fff", color: "var(--violet, #6E3FF3)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", textDecoration: "none", fontWeight: "bold" }}>
                         Go to Help & Support
                       </a>
                     </div>
                  )}
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

          <form className="acb-input-area" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about the platform..."
              disabled={isTyping}
            />
            <button type="submit" disabled={!input.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentChatbot;
