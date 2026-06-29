import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, MessageSquare } from "lucide-react";
import "../../css/admin/AdminChatbot.css";

const AdminChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello Admin! I'm your assistant. Tell me where you'd like to go (e.g., 'Take me to users' or 'Show reports')." }
  ]);
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      processCommand(userMessage);
    }, 1000);
  };

  const processCommand = (query) => {
    const lowerQuery = query.toLowerCase();
    let responseText = "";
    let navigateTo = null;

    if (lowerQuery.includes("today") || lowerQuery.includes("date") || lowerQuery.includes("day")) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      responseText = `Today is ${today}.`;
    } else if (lowerQuery.includes("preset")) {
      responseText = "To create a Preset Quiz, go to 'Create Quiz', select 'Preset', add specific questions from the Question Bank, and publish. All students will receive the exact same questions.";
      navigateTo = "/admin/create-quiz";
    } else if (lowerQuery.includes("how to create") || lowerQuery.includes("how do i create")) {
      responseText = "To create a quiz, go to 'Create Quiz', enter the exam details, choose between a Random or Preset format, set the timer and marking scheme, and then publish it.";
      navigateTo = "/admin/create-quiz";
    } else if (lowerQuery.includes("add") && lowerQuery.includes("question") && lowerQuery.includes("quiz")) {
      responseText = "You can add questions directly while creating/editing a quiz, or manage them globally in the 'Question Bank'. To add one to an existing quiz, go to 'Manage Quizzes', click 'Edit', and use the 'Add Question' panel.";
      navigateTo = "/admin/manage-quizzes";
    } else if (lowerQuery.includes("edit") && lowerQuery.includes("already taken")) {
      responseText = "It is not recommended to edit questions or answers on a published quiz that has already been attempted, as it will invalidate historical results. We recommend duplicating the quiz and publishing a new version instead.";
      navigateTo = "/admin/manage-quizzes";
    } else if (lowerQuery.includes("negative marking")) {
      responseText = "Navigate to 'Manage Quizzes', click 'Edit' on your quiz, and update the 'Negative Marking' field in the Quiz Configuration step before saving.";
      navigateTo = "/admin/manage-quizzes";
    } else if (lowerQuery.includes("reset") && lowerQuery.includes("password")) {
      responseText = "Navigate to the 'Users' page, locate the student via the search bar, click on the action menu next to their name, and select 'Reset Password'. A temporary password will be generated for them.";
      navigateTo = "/admin/users";
    } else if (lowerQuery.includes("ban") || lowerQuery.includes("suspend")) {
      responseText = "Yes. In the 'Users' management page, click the 'Suspend/Ban' toggle next to the student's profile. They will immediately lose access to their dashboard.";
      navigateTo = "/admin/users";
    } else if (lowerQuery.includes("wrong most often") || lowerQuery.includes("toughest")) {
      responseText = "Go to the 'Reports' page. The advanced analytics dashboard will show you the 'Toughest Questions' and detailed statistics on candidate accuracy for each subject.";
      navigateTo = "/admin/reports";
    } else if (lowerQuery.includes("export") || lowerQuery.includes("csv")) {
      responseText = "On the 'Results' page, you can filter by specific exams or date ranges. Once filtered, click the 'Export to CSV' button in the top right corner to download the data.";
      navigateTo = "/admin/results";
    } else if (lowerQuery.includes("who deleted") || lowerQuery.includes("track")) {
      responseText = "Go to the 'Audit Log' page. Here you can track all administrative actions. You can filter the log by action type (e.g., 'DELETE') or by the specific admin user.";
      navigateTo = "/admin/audit-log";
    } else if (lowerQuery.includes("reply") && lowerQuery.includes("ticket")) {
      responseText = "Open 'Support Tickets'. Click on any open ticket to view the student's message and attachments. Use the reply box to respond, which will automatically email the student and update their dashboard.";
      navigateTo = "/admin/tickets";
    } else if (lowerQuery.includes("dashboard") || lowerQuery.includes("home")) {
      responseText = "Navigating to the Admin Dashboard...";
      navigateTo = "/admin/dashboard";
    } else if (lowerQuery.includes("create") && (lowerQuery.includes("quiz") || lowerQuery.includes("test") || lowerQuery.includes("exam"))) {
      responseText = "Taking you to the Quiz Creator...";
      navigateTo = "/admin/create-quiz";
    } else if (lowerQuery.includes("manage") && (lowerQuery.includes("quiz") || lowerQuery.includes("test") || lowerQuery.includes("exam"))) {
      responseText = "Opening the Quiz Management page...";
      navigateTo = "/admin/manage-quizzes";
    } else if (lowerQuery.includes("question") || lowerQuery.includes("bank")) {
      responseText = "Navigating to the Question Bank...";
      navigateTo = "/admin/questions";
    } else if (lowerQuery.includes("user") || lowerQuery.includes("student")) {
      responseText = "Opening the Users Management page...";
      navigateTo = "/admin/users";
    } else if (lowerQuery.includes("result") || lowerQuery.includes("score")) {
      responseText = "Taking you to the Results overview...";
      navigateTo = "/admin/results";
    } else if (lowerQuery.includes("report") || lowerQuery.includes("analytics")) {
      responseText = "Opening the Reports & Analytics page...";
      navigateTo = "/admin/reports";
    } else if (lowerQuery.includes("ticket") || lowerQuery.includes("support") || lowerQuery.includes("help")) {
      responseText = "Navigating to Support Tickets...";
      navigateTo = "/admin/tickets";
    } else if (lowerQuery.includes("audit") || lowerQuery.includes("log")) {
      responseText = "Opening the Audit Logs...";
      navigateTo = "/admin/audit-log";
    } else if (lowerQuery.includes("setting") || lowerQuery.includes("config")) {
      responseText = "Taking you to Settings...";
      navigateTo = "/admin/settings";
    } else if (lowerQuery.includes("hello") || lowerQuery.includes("hi ") || lowerQuery.includes("hey")) {
      responseText = "Hello there! How can I assist you with the dashboard today?";
    } else {
      responseText = "I'm not sure how to navigate there. Try asking for 'Users', 'Reports', 'Create Quiz', or 'Tickets'.";
    }

    setMessages(prev => [...prev, { sender: "bot", text: responseText }]);
    setIsTyping(false);

    if (navigateTo) {
      setTimeout(() => {
        navigate(navigateTo);
        // setIsOpen(false); // Optionally close the chatbot after navigating
      }, 800);
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
