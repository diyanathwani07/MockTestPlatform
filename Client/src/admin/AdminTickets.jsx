import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, LifeBuoy, Eye, X, MessageSquare, User, Clock, ShieldCheck, FileText, CheckCircle2, Clock4, AlertCircle, Calendar as CalendarIcon, Plus, Image as ImageIcon } from 'lucide-react';
import AdminSidebar from './components/AdminSidebar';
import AdminNavbar from './components/AdminNavbar';
import '../css/AdminTickets.css';

function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyFile, setReplyFile] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    setStatusUpdating(true);
    
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/tickets/${selectedTicket._id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setTickets(tickets.map(t => 
        t._id === selectedTicket._id ? { ...t, status: newStatus } : t
      ));
      setSelectedTicket({ ...selectedTicket, status: newStatus });
      
    } catch (err) {
      console.error("Error updating ticket status:", err);
      alert("Failed to update status.");
    } finally {
      setStatusUpdating(false);
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
      
      // Update local state with the new ticket (including new replies)
      const updatedTicket = res.data.ticket;
      setTickets(tickets.map(t => 
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.userId?.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === "All Categories" || ticket.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate Stats
  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === "Open").length;
  const inProgressCount = tickets.filter(t => t.status === "In Progress").length;
  const resolvedCount = tickets.filter(t => t.status === "Resolved").length;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Support Tickets" />
        
        <div className="tk-content-wrapper">

          {/* STAT CARDS */}
          <div className="tk-stats-grid">
            <div className="tk-stat-card">
              <div className="tk-stat-icon-wrapper" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                <FileText size={24} />
              </div>
              <div className="tk-stat-content">
                <p className="tk-stat-label">Total Tickets</p>
                <h3 className="tk-stat-value">{totalTickets}</h3>
                <p className="tk-stat-desc">All time tickets</p>
              </div>
            </div>

            <div className="tk-stat-card">
              <div className="tk-stat-icon-wrapper" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <AlertCircle size={24} />
              </div>
              <div className="tk-stat-content">
                <p className="tk-stat-label">Open</p>
                <h3 className="tk-stat-value">{openCount}</h3>
                <p className="tk-stat-desc">Awaiting response</p>
              </div>
            </div>

            <div className="tk-stat-card">
              <div className="tk-stat-icon-wrapper" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                <Clock4 size={24} />
              </div>
              <div className="tk-stat-content">
                <p className="tk-stat-label">In Progress</p>
                <h3 className="tk-stat-value">{inProgressCount}</h3>
                <p className="tk-stat-desc">Being resolved</p>
              </div>
            </div>

            <div className="tk-stat-card">
              <div className="tk-stat-icon-wrapper" style={{ background: '#D1FAE5', color: '#059669' }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="tk-stat-content">
                <p className="tk-stat-label">Resolved</p>
                <h3 className="tk-stat-value">{resolvedCount}</h3>
                <p className="tk-stat-desc">Successfully resolved</p>
              </div>
            </div>
          </div>

          <div className="tk-table-container">
            {/* TOOLBAR */}
            <div className="tk-toolbar">
              <div className="tk-search">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search by ticket ID or subject..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="tk-filters">
                <div className="tk-filter-group">
                  <label>Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Reopened">Reopened</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="tk-filter-group">
                  <label>Category</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="All Categories">All Categories</option>
                    <option value="Technical Issue">Technical</option>
                    <option value="Account Access">Account</option>
                    <option value="Exam Related">Exams</option>
                    <option value="Other">General</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABLE */}
            {loading ? (
              <div className="tk-loading">
                <Loader2 size={32} className="spinner" />
                <p>Loading tickets...</p>
              </div>
            ) : (
              <div className="tk-table-wrapper" style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
                <table className="tk-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Last Update</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, idx) => {
                      const tkId = `#TP-${(idx + 149).toString().padStart(4, '0')}`;
                      const uName = ticket.userId?.fullName || 'Unknown User';
                      const initials = uName.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase();
                      
                      return (
                        <tr key={ticket._id}>
                          <td className="tk-id">{tkId}</td>
                          <td>
                            <div className="tk-subject-cell">
                              <span className="tk-subject-title">{ticket.subject}</span>
                              <span className="tk-subject-desc">{ticket.message.substring(0, 40)}...</span>
                          </div>
                        </td>
                        <td>
                          <span className={`tk-badge tk-cat-${ticket.category.substring(0, 3).toLowerCase()}`}>
                            {ticket.category.replace(' & Payments', '').replace(' Issue', '')}
                          </span>
                        </td>
                        <td>
                          <span className={`tk-status tk-status-${ticket.status.replace(/\s+/g, '-').toLowerCase()}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td>
                          <div className="tk-date-cell">
                            <span className="tk-date">{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="tk-time">{new Date(ticket.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td>
                           <div className="tk-date-cell">
                            <span className="tk-date">{new Date(ticket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="tk-time">{new Date(ticket.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td>
                          <div className="tk-actions-cell">
                            <button className="tk-icon-btn" onClick={() => setSelectedTicket(ticket)}>
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                        No tickets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
            
            {!loading && filteredTickets.length > 0 && (
              <div className="tk-pagination">
                <span className="tk-showing">Showing 1 to {filteredTickets.length} of {totalTickets} results</span>
                <div className="tk-pages">
                  <button className="tk-page-btn">«</button>
                  <button className="tk-page-btn active">1</button>
                  <button className="tk-page-btn">2</button>
                  <button className="tk-page-btn">3</button>
                  <span className="tk-page-dots">...</span>
                  <button className="tk-page-btn">20</button>
                  <button className="tk-page-btn">»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ticket Details</h3>
              <button className="close-btn" onClick={() => setSelectedTicket(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="ticket-meta">
                <div className="meta-item">
                  <User size={16} />
                  <div>
                    <p className="meta-label">Submitted By</p>
                    <p className="meta-value">{selectedTicket.userId?.fullName || 'Unknown'}</p>
                    <p className="meta-sub">{selectedTicket.userId?.email || ''}</p>
                  </div>
                </div>
                
                <div className="meta-item">
                  <ShieldCheck size={16} />
                  <div>
                    <p className="meta-label">Category</p>
                    <p className="meta-value">{selectedTicket.category}</p>
                  </div>
                </div>
                
                <div className="meta-item">
                  <Clock size={16} />
                  <div>
                    <p className="meta-label">Submitted On</p>
                    <p className="meta-value">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="ticket-content">
                <h4 className="ticket-title">{selectedTicket.subject}</h4>
                <div className="ticket-message-box">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
                    <div style={{ background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", padding: "8px", borderRadius: "8px", marginTop: "4px" }}>
                      <User size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)", fontSize: "14px" }}>Student Issue</p>
                      <p className="ticket-message" style={{ margin: 0, padding: 0, background: "transparent" }}>{selectedTicket.message}</p>
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
                      const isAdmin = reply.senderType === 'Admin';
                      return (
                        <div key={idx} style={{ 
                          display: "flex", 
                          alignItems: "flex-start", 
                          gap: "12px",
                          flexDirection: isAdmin ? "row-reverse" : "row"
                        }}>
                          <div style={{ 
                            background: isAdmin ? "rgba(16, 185, 129, 0.1)" : "rgba(110, 63, 243, 0.1)", 
                            color: isAdmin ? "#10B981" : "#6E3FF3", 
                            padding: "8px", 
                            borderRadius: "8px", 
                            marginTop: "4px" 
                          }}>
                            {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
                          </div>
                          <div style={{ 
                            flex: 1, 
                            background: isAdmin ? "rgba(16, 185, 129, 0.05)" : "rgba(110, 63, 243, 0.03)", 
                            padding: "12px 16px",
                            borderRadius: "12px",
                            border: `1px solid ${isAdmin ? "rgba(16, 185, 129, 0.2)" : "rgba(110, 63, 243, 0.1)"}`,
                            textAlign: isAdmin ? "right" : "left"
                          }}>
                            <p style={{ fontWeight: 600, margin: "0 0 6px 0", color: isAdmin ? "#10B981" : "#6E3FF3", fontSize: "13px" }}>
                              {isAdmin ? "Admin Support" : "Student"}
                              <span style={{ fontWeight: "normal", color: "var(--text-muted)", fontSize: "11px", marginLeft: "8px" }}>
                                {new Date(reply.createdAt).toLocaleString()}
                              </span>
                            </p>
                            <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.5" }}>{reply.message}</p>
                            {reply.attachment && (
                              <div style={{ marginTop: "12px", textAlign: isAdmin ? "right" : "left" }}>
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
                {['Open', 'In Progress', 'Reopened'].includes(selectedTicket.status) && (
                  <form onSubmit={handleReplySubmit} style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to the student here..."
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
                      outline: "none"
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        id="admin-reply-attachment"
                        style={{ display: "none" }}
                        onChange={(e) => setReplyFile(e.target.files[0])}
                      />
                      <label htmlFor="admin-reply-attachment" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "14px" }}>
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
                      {replying ? <Loader2 size={16} className="spinner" /> : <MessageSquare size={16} />}
                      {replying ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </form>
                )}
              </div>

              <div className="ticket-actions">
                <h4>Update Status</h4>
                <div className="status-buttons">
                  <button 
                    className={`status-btn ${selectedTicket.status === 'Open' ? 'active open' : ''}`}
                    onClick={() => handleStatusChange('Open')}
                    disabled={statusUpdating}
                  >
                    Open
                  </button>
                  <button 
                    className={`status-btn ${selectedTicket.status === 'Reopened' ? 'active reopened' : ''}`}
                    onClick={() => handleStatusChange('Reopened')}
                    disabled={statusUpdating}
                  >
                    Reopened
                  </button>
                  <button 
                    className={`status-btn ${selectedTicket.status === 'In Progress' ? 'active in-progress' : ''}`}
                    onClick={() => handleStatusChange('In Progress')}
                    disabled={statusUpdating}
                  >
                    In Progress
                  </button>
                  <button 
                    className={`status-btn ${selectedTicket.status === 'Resolved' ? 'active resolved' : ''}`}
                    onClick={() => handleStatusChange('Resolved')}
                    disabled={statusUpdating}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTickets;
