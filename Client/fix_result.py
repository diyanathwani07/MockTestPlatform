import re

path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Result.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Delete the rm-mobile-top block completely.
# It starts at: {/* MOBILE INSPO TOP SECTION */}
# It ends right before: {/* DESKTOP ORIGINAL TOP SECTION */}

pattern = r'\{\/\* MOBILE INSPO TOP SECTION \*\/}.*?(?=\{\/\* DESKTOP ORIGINAL TOP SECTION \*\/})'
new_content = re.sub(pattern, '', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Removed rm-mobile-top from Result.jsx")
