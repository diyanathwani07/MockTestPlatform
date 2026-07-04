import React, { useState } from "react";
import axios from "axios";
import { Search, Send, Image as ImageIcon, MessageCircle, Headphones, ChevronDown, ChevronUp, ArrowRight, Eye, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { usePreview } from "../context/PreviewContext";
import "../css/StudentDashboard.css";
import "../css/HelpSupport.css";

function HelpSupport() {
  const { previewMode } = usePreview();
  const [ticket, setTicket] = useState({ subject: "", category: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const [activeTab, setActiveTab] = useState("Help Center");
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 5;

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${datePart}, ${timePart}`;
  };

  // Chatbot States
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi there! 👋 I'm your AI Support Assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

  const fetchMyTickets = async () => {
    try {
      setLoadingTickets(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tickets/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "My Tickets") {
      fetchMyTickets();
    }
  }, [activeTab]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    const newMessages = [...messages, { sender: "user", text: userMessage }];
    setMessages(newMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat`,
        { messages: newMessages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessages(prev => [
          ...prev, 
          { sender: "bot", text: res.data.data.text, offerTicket: res.data.data.offerTicket }
        ]);
      }
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages(prev => [
        ...prev, 
        { sender: "bot", text: "I'm having trouble connecting to my brain right now. Would you like to submit a support ticket?", offerTicket: true }
      ]);
    } finally {
      setIsTyping(false);
    }
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
      setShowTicketForm(false);
      setActiveTab("My Tickets");
      fetchMyTickets();
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

  const ticketFormJSX = showTicketForm ? (
    <div className="hs-ticket-section slide-down" style={{ marginTop: '20px', marginBottom: '20px' }}>
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
  ) : null;

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

          {/* TABS NAVIGATION */}
          <div className="hs-tabs">
            <button className={`hs-tab-btn ${activeTab === 'Help Center' ? 'active' : ''}`} onClick={() => setActiveTab('Help Center')}>Help Center</button>
            <button className={`hs-tab-btn ${activeTab === 'My Tickets' ? 'active' : ''}`} onClick={() => setActiveTab('My Tickets')}>My Tickets</button>
          </div>

          {activeTab === "My Tickets" && (
            <div className="hs-tickets-section">
              <div className="hs-tickets-header">
                <div>
                  <h2>My Support Tickets</h2>
                  <p>Track the status of your raised support tickets</p>
                </div>
                <button className="hs-new-ticket-btn" onClick={() => setShowTicketForm(!showTicketForm)}>
                  <Plus size={16} /> {showTicketForm ? 'Close Form' : 'Create New Ticket'}
                </button>
              </div>
              
              {ticketFormJSX}

              {loadingTickets ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading tickets...</div>
              ) : myTickets.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>You haven't raised any support tickets yet.</div>
              ) : (
                <>
                  <div className="hs-tickets-table-container">
                    <table className="hs-tickets-table">
                      <thead>
                        <tr>
                          <th>Ticket ID</th>
                          <th>Subject</th>
                          <th>Status</th>
                          <th>Last Update</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myTickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage).map(tkt => {
                          const statusClass = tkt.status.toLowerCase().replace(" ", "-");
                          return (
                            <tr key={tkt._id}>
                              <td className="hs-ticket-id">TKT-{tkt._id.substring(tkt._id.length - 8).toUpperCase()}</td>
                              <td className="hs-ticket-subject">{tkt.subject}</td>
                              <td>
                                <div className={`hs-status-badge ${statusClass}`}>
                                  <div className="hs-status-dot"></div>
                                  {tkt.status}
                                </div>
                              </td>
                              <td>{formatDate(tkt.updatedAt || tkt.createdAt)}</td>
                              <td>
                                <button className="hs-ticket-action" title="View Details">
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {myTickets.length > ticketsPerPage && (
                    <div className="hs-pagination">
                      <button 
                        className="hs-page-btn" 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button className="hs-page-btn active">{currentPage}</button>
                      <button 
                        className="hs-page-btn" 
                        disabled={currentPage * ticketsPerPage >= myTickets.length} 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Status Legend */}
              <div className="hs-status-legend">
                <div className="hs-legend-item">
                  <div className="hs-legend-header"><div className="hs-status-dot" style={{background: '#3B82F6'}}></div> Open</div>
                  <p className="hs-legend-desc">Your ticket has been received</p>
                </div>
                <div className="hs-legend-item">
                  <div className="hs-legend-header"><div className="hs-status-dot" style={{background: '#F59E0B'}}></div> In Progress</div>
                  <p className="hs-legend-desc">Our team is working on it</p>
                </div>
                <div className="hs-legend-item">
                  <div className="hs-legend-header"><div className="hs-status-dot" style={{background: '#10B981'}}></div> Resolved</div>
                  <p className="hs-legend-desc">Your issue has been resolved</p>
                </div>
                <div className="hs-legend-item">
                  <div className="hs-legend-header"><div className="hs-status-dot" style={{background: '#6B7280'}}></div> Closed</div>
                  <p className="hs-legend-desc">Ticket is closed</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Help Center" && (
            <>
              {/* FAQ SECTION */}
          <div className="hs-faq-section">
            <div className="hs-faq-header">
              <h2>Frequently Asked Questions</h2>
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
              <div ref={chatEndRef} />
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
          {ticketFormJSX}
          </>
          )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpSupport;
