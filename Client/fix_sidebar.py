path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StudentSidebar.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
old_code = """    const checkPurchases = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";"""

new_code = """    const checkPurchases = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Prevent repetitive API calls on every page navigation
        if (sessionStorage.getItem("_sidebar_fetched") === "true") return;
        sessionStorage.setItem("_sidebar_fetched", "true");

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";"""

content = content.replace(old_code, new_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentSidebar.jsx")
