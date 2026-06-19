import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Fetch Users Error:", error);
      setMessage("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("User deleted successfully.");
      fetchUsers();
    } catch (error) {
      console.error("Delete User Error:", error);
      setMessage("Failed to delete user.");
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Users" />

        <div className="admin-content">

          {message && <p className="admin-status-message">{message}</p>}

          <p className="manage-count">
            {loading ? "Loading..." : `${users.length} user(s) registered`}
          </p>

          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          u.role === "admin" ? "status-published" : "status-draft"
                        }`}
                      >
                        {u.role || "user"}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="action-cell">
                      {u.role !== "admin" && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(u._id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Users;