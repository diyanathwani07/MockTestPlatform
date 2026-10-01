path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Result.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '<DotLottieReact src="/Yay.lottie" loop autoplay style={{ width: "200px", height: "200px", zIndex: 10 }} />'
repl1 = '<DotLottieReact src={Number(computedPercentage) >= passThreshold ? "/Yay.lottie" : "/idk.lottie"} loop autoplay style={{ width: "200px", height: "200px", zIndex: 10 }} />'
content = content.replace(target1, repl1)

target2 = '<DotLottieReact src="/Yay.lottie" loop autoplay style={{ width: "80px", height: "80px" }} />'
repl2 = '<DotLottieReact src={Number(computedPercentage) >= passThreshold ? "/Yay.lottie" : "/idk.lottie"} loop autoplay style={{ width: "80px", height: "80px" }} />'
content = content.replace(target2, repl2)

# Also conditionally change "Congratulations!" to something else if failed
target_congrats = '<h1 className="inspo-congrats">Congratulations!</h1>'
repl_congrats = '<h1 className="inspo-congrats">{Number(computedPercentage) >= passThreshold ? "Congratulations!" : "Keep Practicing!"}</h1>'
content = content.replace(target_congrats, repl_congrats)

target_desktop_congrats = '<h2>Quiz Completed!</h2>'
repl_desktop_congrats = '<h2>{Number(computedPercentage) >= passThreshold ? "Quiz Completed!" : "Keep Practicing!"}</h2>'
content = content.replace(target_desktop_congrats, repl_desktop_congrats)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Result.jsx with pass/fail lottie logic")
