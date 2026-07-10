import React, { useState } from "react";
import axios from "axios";
import { Search, Send, Image as ImageIcon, MessageCircle, Headphones, ChevronDown, ChevronUp, ArrowRight, Eye, Plus, ChevronLeft, ChevronRight, User } from "lucide-react";
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
  const [ticketFile, setTicketFile] = useState(null);
  const [replyFile, setReplyFile] = useState(null);

  const [activeTab, setActiveTab] = useState("Help Center");
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 5;

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [reopening, setReopening] = useState(false);

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
      console.error("fetchMyTickets Error:", err);
      if (err.response?.status === 401) {
        alert("Your session has expired. Please log out and log in again.");
      } else {
        alert("Failed to fetch tickets: " + (err.response?.data?.message || err.message));
      }
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

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    setReplying(true);

    try {
      const token = localStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("message", replyMessage);
      if (replyFile) {
        formData.append("attachment", replyFile);
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tickets/${selectedTicket._id}/reply`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data" 
          } 
        }
      );
      
      const updatedTicket = res.data.ticket;
      setMyTickets(myTickets.map(t => 
        t._id === updatedTicket._id ? updatedTicket : t
      ));
      setSelectedTicket(updatedTicket);
      setReplyMessage("");
      setReplyFile(null);
      
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Failed to send reply.");
    } finally {
      setReplying(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    setReopening(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/tickets/${selectedTicket._id}/reopen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedTicket = res.data.ticket;
      setMyTickets(myTickets.map(t => 
        t._id === updatedTicket._id ? updatedTicket : t
      ));
      setSelectedTicket(updatedTicket);
      alert("Ticket reopened successfully!");
    } catch (err) {
      console.error("Error reopening ticket:", err);
      alert(err.response?.data?.message || "Failed to reopen ticket.");
    } finally {
      setReopening(false);
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
      
      const formData = new FormData();
      formData.append("subject", ticket.subject);
      formData.append("category", ticket.category);
      formData.append("message", ticket.message);
      if (ticketFile) {
        formData.append("attachment", ticketFile);
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tickets`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data" 
          } 
        }
      );
      setSuccessMsg("Your support ticket has been submitted successfully!");
      setTicket({ subject: "", category: "", message: "" });
      setTicketFile(null);
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
            <p className="hs-attach-desc">{ticketFile ? ticketFile.name : "PNG, JPG up to 5MB"}</p>
            <input type="file" className="hs-file-input" accept="image/png, image/jpeg" onChange={(e) => setTicketFile(e.target.files[0])} />
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
                                <button className="hs-ticket-action" title="View Details" onClick={() => setSelectedTicket(tkt)}>
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

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div className="ticket-modal" onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", width: "100%", maxWidth: "600px", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "18px" }}>Ticket Details</h3>
              <button onClick={() => setSelectedTicket(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                ✕
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <p style={{ margin: "0 0 4px 0", color: "var(--text-muted)", fontSize: "12px" }}>Category</p>
                  <p style={{ margin: 0, color: "var(--text-main)", fontWeight: 600 }}>{selectedTicket.category}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 4px 0", color: "var(--text-muted)", fontSize: "12px" }}>Status</p>
                  <span className={`hs-status-badge ${selectedTicket.status.toLowerCase().replace(" ", "-")}`}>
                    <div className="hs-status-dot"></div>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              <div className="ticket-content">
                <h4 style={{ margin: "0 0 16px 0", color: "var(--text-main)", fontSize: "16px" }}>{selectedTicket.subject}</h4>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", padding: "8px", borderRadius: "8px", marginTop: "4px" }}>
                    <User size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)", fontSize: "14px" }}>You</p>
                    <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.5" }}>{selectedTicket.message}</p>
                    {selectedTicket.attachment && (
                      <div style={{ marginTop: "12px" }}>
                        <img src={`${import.meta.env.VITE_API_URL}${selectedTicket.attachment}`} alt="Attachment" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* THREADED REPLIES */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                <div className="ticket-replies" style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h5 style={{ margin: 0, color: "var(--text-secondary)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Conversation History</h5>
                  {selectedTicket.replies.map((reply, idx) => {
                    const isStudent = reply.senderType === 'Student';
                    return (
                      <div key={idx} style={{ 
                        display: "flex", 
                        alignItems: "flex-start", 
                        gap: "12px",
                        flexDirection: isStudent ? "row" : "row-reverse"
                      }}>
                        <div style={{ 
                          background: isStudent ? "rgba(110, 63, 243, 0.1)" : "rgba(16, 185, 129, 0.1)", 
                          color: isStudent ? "#6E3FF3" : "#10B981", 
                          padding: "8px", 
                          borderRadius: "8px", 
                          marginTop: "4px" 
                        }}>
                          {isStudent ? <User size={20} /> : <Headphones size={20} />}
                        </div>
                        <div style={{ 
                          flex: 1, 
                          background: isStudent ? "rgba(110, 63, 243, 0.03)" : "rgba(16, 185, 129, 0.05)", 
                          padding: "12px 16px",
                          borderRadius: "12px",
                          border: `1px solid ${isStudent ? "rgba(110, 63, 243, 0.1)" : "rgba(16, 185, 129, 0.2)"}`,
                          textAlign: isStudent ? "left" : "right"
                        }}>
                          <p style={{ fontWeight: 600, margin: "0 0 6px 0", color: isStudent ? "#6E3FF3" : "#10B981", fontSize: "13px" }}>
                            {isStudent ? "You" : "Admin Support"}
                            <span style={{ fontWeight: "normal", color: "var(--text-muted)", fontSize: "11px", marginLeft: "8px", marginRight: "8px" }}>
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </p>
                          <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.5" }}>{reply.message}</p>
                          {reply.attachment && (
                            <div style={{ marginTop: "12px", textAlign: isStudent ? "left" : "right" }}>
                              <img src={`${import.meta.env.VITE_API_URL}${reply.attachment}`} alt="Attachment" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* REPLY INPUT */}
              {['Open', 'In Progress'].includes(selectedTicket.status) && (
                <form onSubmit={handleReplySubmit} style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to admin here..."
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-input)",
                      color: "var(--text-primary)",
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        id="reply-attachment"
                        style={{ display: "none" }}
                        onChange={(e) => setReplyFile(e.target.files[0])}
                      />
                      <label htmlFor="reply-attachment" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "14px" }}>
                        <ImageIcon size={20} />
                        {replyFile ? replyFile.name : "Attach Image"}
                      </label>
                    </div>
                    <button 
                      type="submit" 
                      disabled={replying || (!replyMessage.trim() && !replyFile)}
                      style={{
                        padding: "10px 24px",
                        background: "var(--primary-color)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "600",
                        cursor: replying || (!replyMessage.trim() && !replyFile) ? "not-allowed" : "pointer",
                        opacity: replying || (!replyMessage.trim() && !replyFile) ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      {replying ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                 </form>
               )}

               {selectedTicket.status === 'Resolved' && (
                 <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
                   <button 
                     onClick={handleReopenTicket}
                     disabled={reopening}
                     style={{
                       padding: "12px 32px",
                       background: "linear-gradient(135deg, #6a11cb, #7b3ff3)",
                       color: "white",
                       border: "none",
                       borderRadius: "10px",
                       fontWeight: "600",
                       fontSize: "14px",
                       cursor: reopening ? "not-allowed" : "pointer",
                       opacity: reopening ? 0.7 : 1,
                       display: "flex",
                       alignItems: "center",
                       gap: "8px",
                       boxShadow: "0 4px 14px rgba(110, 63, 243, 0.3)",
                       transition: "all 0.2s ease"
                     }}
                   >
                     {reopening ? "Reopening..." : "🔄 Reopen Query"}
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpSupport;
