path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("try {\n    const isEmail", "try {\n    setIsLoading(true);\n    const isEmail")
content = content.replace("navigate(\"/\");\n  } catch", "navigate(\"/\");\n    setIsLoading(false);\n  } catch")
content = content.replace("\"Registration Failed\"\n  );\n}", "\"Registration Failed\"\n  );\n  setIsLoading(false);\n}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated isLoading state in handleSubmit")
