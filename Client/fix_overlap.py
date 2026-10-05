import sys

def fix_file(path, bottom_action_marker):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # Find the comment {/* Questions Builder */}
    qb_idx = -1
    for i, l in enumerate(lines):
        if '{/* Questions Builder */}' in l or '3. Questions Builder' in l:
            qb_idx = i
            break
            
    if qb_idx == -1:
        print(f"Could not find Questions Builder in {path}")
        return False
        
    # Insert </div> before Questions Builder
    lines.insert(qb_idx, '            </div>\n')
    
    # Find Bottom Actions
    ba_idx = -1
    for i, l in enumerate(lines):
        if bottom_action_marker in l:
            ba_idx = i
            break
            
    if ba_idx == -1:
        print(f"Could not find {bottom_action_marker} in {path}")
        return False
        
    # Find the nearest </div> before Bottom Actions and remove it
    div_idx = -1
    for i in range(ba_idx - 1, ba_idx - 10, -1):
        if '</div>' in lines[i]:
            div_idx = i
            break
            
    if div_idx != -1:
        removed = lines.pop(div_idx)
        print(f"Removed line {div_idx}: {removed.strip()} from {path}")
    else:
        print(f"Could not find </div> before Bottom Actions in {path}")
        return False
        
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
        
    print(f"Successfully fixed {path}")
    return True

fix_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/CreateQuiz.jsx', '{/* Bottom Actions */}')
fix_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/EditQuiz.jsx', '{/* Bottom Actions Row */}')
