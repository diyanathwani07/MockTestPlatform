with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace in useEffect
content = content.replace('if (user.onboardingCompleted === false) { \n          navigate("/onboarding");', 'if (user.onboardingCompleted === false && isMobile) { \n          navigate("/onboarding");')

# Replace in handleSubmit
content = content.replace('if (!res.data.user.onboardingCompleted) { navigate("/onboarding"); } else { navigate("/dashboard"); }', 'if (!res.data.user.onboardingCompleted && isMobile) { navigate("/onboarding"); } else { navigate("/dashboard"); }')

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('navigate("/onboarding");', 'if (isMobile) { navigate("/onboarding"); } else { navigate("/dashboard"); }')

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
