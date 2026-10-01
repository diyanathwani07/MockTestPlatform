path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
if '<form' in content:
    print("YES FORM FOUND IN STUDENT ONBOARDING")
else:
    print("NO FORM FOUND IN STUDENT ONBOARDING")
