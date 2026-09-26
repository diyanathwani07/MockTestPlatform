with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the redirect in StudentDashboard
old_code = 'useEffect(() => { if (user && user.role === "user" && !user.onboardingCompleted) { navigate("/onboarding"); } }, [user, navigate]);'
new_code = 'useEffect(() => { if (user && user.role === "user" && !user.onboardingCompleted && window.innerWidth <= 560) { navigate("/onboarding"); } }, [user, navigate]);'

content = content.replace(old_code, new_code)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

