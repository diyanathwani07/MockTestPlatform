path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StudentBottomNav.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add drop-shadow to nav
target_nav = """<nav className="md:hidden fixed bottom-0 left-0 w-full z-[999] select-none" style={{ height: 'calc(75px + env(safe-area-inset-bottom))' }}>"""
replacement_nav = """<nav className="md:hidden fixed bottom-0 left-0 w-full z-[999] select-none" style={{ height: 'calc(75px + env(safe-area-inset-bottom))', filter: 'drop-shadow(0 -4px 24px rgba(0, 0, 0, 0.08))' }}>"""
content = content.replace(target_nav, replacement_nav)

# 2. Fix active icon color: change text-white to text-[var(--primary)]
target_active_icon = """<IconComponent size={16} className="text-white relative z-10" />"""
replacement_active_icon = """<IconComponent size={16} className="text-[var(--primary)] relative z-10" />"""
content = content.replace(target_active_icon, replacement_active_icon)

# 3. Fix active label color: change text-white to text-[var(--primary)]
target_active_label = """<span className="text-[9px] text-white font-medium leading-none tracking-wide">{label}</span>"""
replacement_active_label = """<span className="text-[9px] text-[var(--primary)] font-medium leading-none tracking-wide">{label}</span>"""
content = content.replace(target_active_label, replacement_active_label)

# 4. Remove opacity-70 on inactive state so text-[var(--bottom-nav-text)] is fully visible and crisp
target_inactive = """<div className="flex flex-col justify-center items-center h-full opacity-70">"""
replacement_inactive = """<div className="flex flex-col justify-center items-center h-full opacity-90">"""
content = content.replace(target_inactive, replacement_inactive)

# 5. Fix the center button icon which is also hardcoded text-white
target_center_icon = """<ClipboardList size={22} className="text-white relative z-10 -top-[2px]" strokeWidth={2.5} />"""
replacement_center_icon = """<ClipboardList size={22} className="text-white relative z-10 -top-[2px]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />"""
content = content.replace(target_center_icon, replacement_center_icon)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
