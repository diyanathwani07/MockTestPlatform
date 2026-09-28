import re
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/admin/AdminChatbot.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken syntax
# We will just remove any loose '50% { ... } }' block
broken_block = '''  50% { transform: translateY(-10px); box-shadow: 0 10px 30px rgba(110, 63, 243, 0.55); }
}'''
content = content.replace(broken_block, '')

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/admin/AdminChatbot.css', 'w', encoding='utf-8') as f:
    f.write(content)
