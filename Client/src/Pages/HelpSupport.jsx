import React, { useState } from "react";
import axios from "axios";
import { Search, Send, Image as ImageIcon, MessageCircle, Headphones, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/HelpSupport.css";

function HelpSupport() {
  const [ticket, setTicket] = useState({ subject: "", category: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

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
      alert("Failed to submit ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Help & Support" />

        <div className="sd-content">
          
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

          {/* TICKET FORM SECTION */}
          <div className="hs-ticket-section">
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
                <button type="submit" disabled={loading} className="hs-submit-btn">
                  {loading ? "Submitting..." : "Submit Ticket"} 
                  <Send size={16} />
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default HelpSupport;
