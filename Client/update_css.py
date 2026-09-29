path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Register.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(".input-box input{", ".input-box input, .input-box select{")
content = content.replace(".input-box input:focus{", ".input-box input:focus, .input-box select:focus{")
content = content.replace(".input-box input {", ".input-box input, .input-box select {")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CSS")
