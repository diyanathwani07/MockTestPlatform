path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/NotificationBell.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
old_code = """  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);"""

new_code = """  // Initial load
  useEffect(() => {
    // Prevent fetching on every route change remount
    const lastFetch = sessionStorage.getItem("_notif_fetched_time");
    const now = Date.now();
    if (lastFetch && now - parseInt(lastFetch) < 30000) {
      // If fetched less than 30s ago, skip the initial mount fetch
      return;
    }
    sessionStorage.setItem("_notif_fetched_time", now.toString());
    fetchNotifications();
  }, [fetchNotifications]);"""

content = content.replace(old_code, new_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated NotificationBell.jsx")
