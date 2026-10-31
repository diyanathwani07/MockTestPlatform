import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bot, Send, X } from "lucide-react";
import "../css/admin/AdminChatbot.css"; // Reuse the same CSS since layout is identical
import useDraggable from "../hooks/useDraggable";

const StudentChatbot = () => {
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem("studentChatOpen") === "true";
  });
  
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("studentChatMessages");
    if (saved) return JSON.parse(saved);
    return [
      { sender: "bot", text: "Hello! I'm your PrepMark Student Assistant. Ask me anything about your mock tests, practice sets, results, live exams, or how to navigate the platform!" }
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
  const navigate = useNavigate();
  const { position, wasDragged, handlers } = useDraggable(30, window.innerWidth < 768 ? 95 : 30);

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
        const { text, offerTicket, navigateTo } = res.data.data;
        
        setMessages(prev => [...prev, { sender: "bot", text }]);
        
        if (navigateTo) {
          setTimeout(() => {
            navigate(navigateTo);
          }, 3500); // 3.5 seconds delay so student can read
        }
        
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
      const localAnswer = getStudentLocalFallback(userMessage);
      if (localAnswer) {
        setMessages(prev => [...prev, { sender: "bot", text: localAnswer.text }]);
        if (localAnswer.navigateTo) {
          setTimeout(() => {
            navigate(localAnswer.navigateTo);
          }, 2500);
        }
      } else {
        setMessages(prev => [
          ...prev, 
          { sender: "bot", text: "I'm having trouble connecting to the network right now. You can use the navigation bar to access exams, practice, and results." }
        ]);
      }
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
  const isMobile = window.innerWidth < 480;

  const windowStyle = {
    position: isMobile ? "fixed" : "absolute",
    zIndex: 9999,
    width: isMobile ? "calc(100vw - 32px)" : "350px",
    height: isMobile ? "420px" : "500px",
    maxHeight: isMobile ? "70vh" : "calc(100vh - 120px)",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1.5px solid var(--border-color, #E2E8F0)",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    
    // Dynamic Positioning
    bottom: isMobile ? "90px" : (isUpperHalf ? "auto" : "70px"),
    top: isMobile ? "auto" : (isUpperHalf ? "70px" : "auto"),
    right: isMobile ? "16px" : (isLeftHalf ? "auto" : "0"),
    left: isMobile ? "16px" : (isLeftHalf ? "0" : "auto"),
    transformOrigin: isMobile ? "bottom right" : `${isUpperHalf ? "top" : "bottom"} ${isLeftHalf ? "left" : "right"}`
  };

  return (
    <div className="admin-chatbot-container" style={{ bottom: position.bottom, right: position.right }}>
      {/* Circular Sidebar Button */}
      <div>
        <button 
          className={`acb-fab ${isOpen ? "open" : ""}`} 
          onClick={handleFabClick}
          title="AI Student Assistant"
          {...handlers}
          style={{ touchAction: 'none' }}
        >
          {isOpen ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="acb-window slide-up" style={windowStyle}>
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
                       <a href="/dashboard/help" style={{ display: "inline-block", background: "#fff", color: "var(--violet)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", textDecoration: "none", fontWeight: "bold" }}>
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


// Client-side fallback navigation resolver for immediate student assistance
function getStudentLocalFallback(query) {
  const q = (query || "").toLowerCase();
  if (q.includes("prepmark") || q.includes("about platform") || q.includes("what is prepmark")) {
    return {
      text: "PrepMark is your all-in-one exam preparation platform with mock tests, practice sets, live examinations, flashcards, and score analysis.",
      navigateTo: null
    };
  }
  if (q.includes("voice") || q.includes("audio") || q.includes("read") || q.includes("listen")) {
    return {
      text: "PrepMark has built-in Word-to-Speech audio reading inside tests so you can listen to questions read aloud.",
      navigateTo: null
    };
  }
  if (q.includes("custom") || q.includes("create quiz")) {
    return { text: "Navigating to Create Custom Quiz.", navigateTo: "/dashboard/create-custom-quiz" };
  }
  if (q.includes("live")) {
    return { text: "Navigating to Live Exams Lobby.", navigateTo: "/dashboard/live-exams" };
  }
  if (q.includes("exam") || q.includes("mock") || q.includes("test series")) {
    return { text: "Navigating to Available Exams & Mock Tests.", navigateTo: "/dashboard/exams" };
  }
  if (q.includes("practice")) {
    return { text: "Navigating to Practice Modules.", navigateTo: "/dashboard/practice" };
  }
  if (q.includes("result") || q.includes("score") || q.includes("attempt") || q.includes("analysis")) {
    return { text: "Navigating to your Results & Performance.", navigateTo: "/dashboard/results" };
  }
  if (q.includes("flashcard") || q.includes("card")) {
    return { text: "Navigating to Flashcards.", navigateTo: "/dashboard/flashcards" };
  }
  if (q.includes("leaderboard") || q.includes("rank") || q.includes("topper")) {
    return { text: "Navigating to Leaderboard.", navigateTo: "/dashboard/leaderboard" };
  }
  if (q.includes("streak") || q.includes("daily")) {
    return { text: "Navigating to Daily Study Streak.", navigateTo: "/dashboard/streak" };
  }
  if (q.includes("price") || q.includes("plan") || q.includes("subscription")) {
    return { text: "Navigating to AI Plans & Pricing.", navigateTo: "/dashboard/pricing" };
  }
  if (q.includes("profile") || q.includes("account")) {
    return { text: "Navigating to your Profile.", navigateTo: "/dashboard/profile" };
  }
  if (q.includes("help") || q.includes("support") || q.includes("ticket")) {
    return { text: "Navigating to Help & Support.", navigateTo: "/dashboard/help" };
  }
  if (q.includes("dashboard") || q.includes("home")) {
    return { text: "Navigating to Dashboard.", navigateTo: "/dashboard" };
  }
  return null;
}

export default StudentChatbot;
