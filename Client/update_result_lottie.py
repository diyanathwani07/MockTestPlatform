path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Result.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"/Yay.lottie" : "/idk.lottie"', '"/Badge.lottie" : "/idk.lottie"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Result.jsx")
