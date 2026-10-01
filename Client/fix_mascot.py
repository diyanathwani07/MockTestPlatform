path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/PrepMarkMascot.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const lottieUrl = "/mascot.lottie"; // Temporary placeholder',
    'const lottieUrl = "/Badge.lottie";'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated lottieUrl in PrepMarkMascot")
