path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add DotLottieReact to imports if missing (it might be there)
if "DotLottieReact" not in content:
    content = content.replace('import { ChevronRight, CheckCircle2, ArrowLeft, BookOpen, Target } from "lucide-react";', 'import { ChevronRight, CheckCircle2, ArrowLeft, BookOpen, Target } from "lucide-react";\nimport { DotLottieReact } from "@lottiefiles/dotlottie-react";')

old_step_3 = """{/* STEP 3: EXAM SELECTION */}
          {step === 3 && (
            <div className="animate-fade-in mt-6 text-left">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px", textAlign: "center" }}>"""

new_step_3 = """{/* STEP 3: EXAM SELECTION */}
          {step === 3 && (
            <div className="animate-fade-in mt-6 text-left">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <DotLottieReact src="/Bag.lottie" loop autoplay style={{ width: "120px", height: "120px" }} />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px", textAlign: "center" }}>"""

content = content.replace(old_step_3, new_step_3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentOnboarding.jsx with Bag.lottie in Step 3")
