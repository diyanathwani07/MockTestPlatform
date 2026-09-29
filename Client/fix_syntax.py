path_sub = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path_sub, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken syntax
bad_str = 'flexShrink: 0\n                }}\n                className="hide-on-desktop"\n                }}'
good_str = 'flexShrink: 0\n                }}\n                className="hide-on-desktop"'

if bad_str in content:
    content = content.replace(bad_str, good_str)
    with open(path_sub, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed bad syntax!")
else:
    print("Bad syntax not found, let's look closer")
