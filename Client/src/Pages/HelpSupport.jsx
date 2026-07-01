import React, { useState } from "react";
import axios from "axios";
import { Search, Send, Image as ImageIcon, MessageCircle, Headphones, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { usePreview } from "../context/PreviewContext";
import "../css/StudentDashboard.css"; // Reuse dashboard layout styles
import "../css/HelpSupport.css";

function HelpSupport() {
  const { previewMode } = usePreview();
  const [ticket, setTicket] = useState({ subject: "", category: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  // Chatbot States
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi there! 👋 I'm your AI Support Assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);

  const faqs = [
    { question: "How do I start a mock test?", answer: "Navigate to the 'My Exams' tab on the sidebar. You will see a list of all available mock tests. Click the 'Start Test' button on any available exam to begin." },
    { question: "Can I attempt a test multiple times?", answer: "Currently, each mock test can only be attempted once to simulate a real exam environment. If you face technical issues, please submit a ticket." },
    { question: "How are my results calculated?", answer: "Your results are calculated based on the total correct answers, minus any negative marking (if applicable to that specific exam)." },
    { question: "How can I reset my password?", answer: "If you are logged out, click 'Forgot Password' on the login screen. If you are logged in, navigate to Settings to change your password." }
  ];

  const toggleFaq = (index) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setChatInput("");
    setIsTyping(true);

    // Simulate AI thinking and keyword matching
    setTimeout(() => {
      const lowerQuery = userMessage.toLowerCase();
      let response = "";
      let foundMatch = false;

      // Basic keyword matching logic against FAQs
      if (lowerQuery.includes("start") || lowerQuery.includes("begin") || (lowerQuery.includes("test") && !lowerQuery.includes("multiple") && !lowerQuery.includes("disconnect"))) {
        response = "To start a mock test, navigate to the 'My Exams' tab on the sidebar and click 'Start Test' on any available exam.";
        foundMatch = true;
      } else if (lowerQuery.includes("save") || lowerQuery.includes("mark for review") || lowerQuery.includes("difference")) {
        response = "'Save & Next' submits your chosen answer and moves you to the next question. 'Mark for Review' flags the question so you can easily return to it later from the Question Palette.";
        foundMatch = true;
      } else if (lowerQuery.includes("multiple") || lowerQuery.includes("again") || lowerQuery.includes("re-attempt") || lowerQuery.includes("twice")) {
        response = "Currently, each mock test can only be attempted once to simulate a real exam environment.";
        foundMatch = true;
      } else if (lowerQuery.includes("disconnect") || lowerQuery.includes("internet") || lowerQuery.includes("drop") || lowerQuery.includes("offline")) {
        response = "Your progress is continuously synced. If you disconnect, try refreshing the page or logging back in. If the timer hasn't expired, you can resume the test from where you left off.";
        foundMatch = true;
      } else if (lowerQuery.includes("past") || lowerQuery.includes("scores") || lowerQuery.includes("performance") || (lowerQuery.includes("see") && lowerQuery.includes("result"))) {
        response = "You can view all your past performances by navigating to the 'Results' tab in the sidebar. Click on 'View Details' for any specific exam to see a comprehensive breakdown.";
        foundMatch = true;
      } else if (lowerQuery.includes("calculate") || lowerQuery.includes("negative marking") || (lowerQuery.includes("how is") && lowerQuery.includes("score"))) {
        response = "Your results are calculated based on total correct answers minus any negative marking. Unattempted questions do not affect your score.";
        foundMatch = true;
      } else if (lowerQuery.includes("leaderboard") || lowerQuery.includes("rank")) {
        response = "The Leaderboard ranks students based on their highest scores in recent mock tests. If two students have the same score, the one who completed the test in less time is ranked higher.";
        foundMatch = true;
      } else if (lowerQuery.includes("password") || lowerQuery.includes("reset") || lowerQuery.includes("login")) {
        response = "You can reset your password by clicking 'Forgot Password' on the login screen, or via your Profile if you are logged in.";
        foundMatch = true;
      } else if (lowerQuery.includes("profile") || lowerQuery.includes("update") || lowerQuery.includes("name") || lowerQuery.includes("photo")) {
        response = "Go to the 'Profile' section from the top right menu or sidebar. Here you can update your personal information, contact details, and profile picture.";
        foundMatch = true;
      } else if (lowerQuery.includes("not loading") || lowerQuery.includes("stuck") || lowerQuery.includes("blank")) {
        response = "Try clearing your browser cache or opening the platform in an Incognito/Private window. If the issue persists, please submit a support ticket using the button below.";
        foundMatch = true;
      } else if (lowerQuery.includes("hello") || lowerQuery.includes("hi ") || lowerQuery.includes("hey")) {
        response = "Hello! How can I assist you with your exam prep today?";
        foundMatch = true;
      } else {
        response = "I'm sorry, I couldn't find an exact answer to that in my knowledge base. Would you like to submit a support ticket?";
      }

      setMessages(prev => [...prev, { sender: "bot", text: response, offerTicket: !foundMatch }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleChange = (e) => {
    setTicket({ ...ticket, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticket.subject || !ticket.category || !ticket.message) {
      alert("Please fill in all required fields.");
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tickets`,
        ticket,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg("Your support ticket has been submitted successfully!");
      setTicket({ subject: "", category: "", message: "" });
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Failed to submit ticket. Please try again.";
      if (err.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
      } else {
        alert(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Help & Support" />

        <div className="sd-content" style={{ paddingTop: '20px' }}>
          <div className="hs-page-container">
          {/* HERO SECTION */}
          <div className="hs-hero">
            <div className="hs-hero-content">
              <h1>How can we help you?</h1>
              <p>Find answers to common questions or reach out to our support team.</p>
              
              <div className="hs-search-bar">
                <Search className="hs-search-icon" size={20} />
                <input type="text" placeholder="Search for help articles..." />
              </div>
            </div>

            <div className="hs-hero-illustrations">
              {/* Left Chat Bubble Illustration */}
              <div className="hs-ill-chat">
                <div className="hs-bubble hs-bubble-primary">
                  <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                </div>
                <div className="hs-bubble hs-bubble-secondary">?</div>
              </div>

              {/* Right Headset Illustration */}
              <div className="hs-ill-headset">
                <Headphones size={80} className="hs-headset-icon" />
              </div>
            </div>
          </div>

          {/* FAQ SECTION */}
          <div className="hs-faq-section">
            <div className="hs-faq-header">
              <h2>Frequently Asked Questions</h2>
              <span className="hs-view-all">View All <ArrowRight size={14} /></span>
            </div>
            
            <div className="hs-faq-list">
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className={`hs-faq-item ${openFaq === index ? 'open' : ''}`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="hs-faq-question">
                    <span>{faq.question}</span>
                    {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {openFaq === index && (
                    <div className="hs-faq-answer">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI CHATBOT SECTION */}
          <div className="hs-chat-section">
            <div className="hs-chat-header">
              <div className="hs-chat-bot-info">
                <div className="hs-chat-avatar">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3>AI Support Assistant</h3>
                  <p>Ask me anything about the platform</p>
                </div>
              </div>
            </div>
            
            <div className="hs-chat-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`hs-chat-bubble-wrapper ${msg.sender}`}>
                  <div className={`hs-chat-bubble ${msg.sender}`}>
                    {msg.text}
                  </div>
                  {msg.offerTicket && !showTicketForm && (
                    <button className="hs-chat-ticket-btn" onClick={() => setShowTicketForm(true)}>
                      Submit a Ticket
                    </button>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="hs-chat-bubble-wrapper bot">
                  <div className="hs-chat-bubble bot typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleChatSubmit} className="hs-chat-input-area">
              <input 
                type="text" 
                placeholder="Type your question here..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isTyping}
              />
              <button type="submit" disabled={isTyping || !chatInput.trim()}>
                <Send size={18} />
              </button>
            </form>
          </div>

          {/* TICKET FORM SECTION */}
          {showTicketForm ? (
            <div className="hs-ticket-section slide-down">
              <div className="hs-ticket-header">
                <h2>Submit a Support Ticket</h2>
                <p>Describe your issue and we'll get back to you.</p>
              </div>
            
            {successMsg && <div className="hs-success-msg">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="hs-form-grid">
              
              <div className="hs-form-left">
                <div className="hs-form-row">
                  <div className="hs-form-group">
                    <label>Subject <span>*</span></label>
                    <input 
                      type="text" 
                      name="subject" 
                      placeholder="Briefly describe your issue" 
                      value={ticket.subject}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="hs-form-group">
                    <label>Category <span>*</span></label>
                    <select name="category" value={ticket.category} onChange={handleChange}>
                      <option value="" disabled>Select a category</option>
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Account">Account Access</option>
                      <option value="Exam Related">Exam Related</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="hs-form-group">
                  <label>Message <span>*</span></label>
                  <textarea 
                    name="message" 
                    placeholder="Please provide as much detail as possible..."
                    rows="6"
                    value={ticket.message}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>

              <div className="hs-form-right">
                <div className="hs-attachment-box">
                  <div className="hs-attachment-icon-wrapper">
                    <ImageIcon size={24} />
                  </div>
                  <p className="hs-attach-title">Attach Screenshot (Optional)</p>
                  <p className="hs-attach-desc">PNG, JPG up to 5MB</p>
                  <input type="file" className="hs-file-input" accept="image/png, image/jpeg" />
                </div>
              </div>

              <div className="hs-form-actions">
                <button 
                  type="submit" 
                  disabled={loading || previewMode} 
                  className="hs-submit-btn"
                  title={previewMode ? "Ticket submission is disabled in Preview Mode" : ""}
                  style={{ opacity: previewMode ? 0.6 : 1, cursor: previewMode ? "not-allowed" : "pointer" }}
                >
                  {previewMode ? "Preview Mode (Disabled)" : (loading ? "Submitting..." : "Submit Ticket")} 
                  <Send size={16} />
                </button>
              </div>

            </form>
          </div>
          ) : (
            <div className="hs-ticket-reveal">
              <p>Still can't find what you're looking for?</p>
              <button onClick={() => setShowTicketForm(true)}>Open Support Ticket</button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpSupport;
