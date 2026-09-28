with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/ProfilePages/MobileProfileFlow.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find the start of the menu groups
start_marker = '<h4 className="mp-menu-group-title">Account</h4>'
end_marker = '<div style={{ marginTop: "32px", paddingBottom: "24px", display: "flex", justifyContent: "center" }}>'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    menu_groups_str = content[start_idx:end_idx]
    
    # We will replace this entire section with a ternary
    replacement = '''
          {isDesktop ? (
            <div className="mp-menu-group">
              <MenuItem 
                icon={<User size={18} />} 
                title="Account Details" 
                subtitle="View and manage your account information" 
                onClick={() => setActiveScreen("account")} 
              />
              <MenuItem 
                icon={<Clock size={18} />} 
                title="Subscriptions & Order History" 
                subtitle="View your active plan, payments & order receipts" 
                onClick={() => setActiveScreen("transactions")} 
              />
              <MenuItem 
                icon={<Lock size={18} />} 
                title="Change Password" 
                subtitle="Update your account password" 
                onClick={() => setActiveScreen("password")} 
              />
              <MenuItem 
                icon={<Globe size={18} />} 
                title="Language" 
                subtitle="Choose your preferred language" 
                onClick={() => setActiveScreen("language")} 
              />
              <MenuItem 
                icon={<Info size={18} />} 
                title="About Us" 
                subtitle="Learn more about PrepMark" 
                onClick={() => setActiveScreen("about")} 
              />
            </div>
          ) : (
            <>
              <h4 className="mp-menu-group-title">Account</h4>
              <div className="mp-menu-group">
                <MenuItem 
                  icon={<User size={18} />} 
                  title="Account Details" 
                  subtitle="View and manage your account information" 
                  onClick={() => setActiveScreen("account")} 
                />
                <MenuItem 
                  icon={<Clock size={18} />} 
                  title="Subscriptions & Order History" 
                  subtitle="View your active plan, payments & order receipts" 
                  onClick={() => setActiveScreen("transactions")} 
                />
                <MenuItem 
                  icon={<Lock size={18} />} 
                  title="Change Password" 
                  subtitle="Update your account password" 
                  onClick={() => setActiveScreen("password")} 
                />
              </div>

              <h4 className="mp-menu-group-title">Preferences</h4>
              <div className="mp-menu-group">
                <MenuItem 
                  icon={<Globe size={18} />} 
                  title="Language" 
                  subtitle="Choose your preferred language" 
                  onClick={() => setActiveScreen("language")} 
                />
              </div>

              <h4 className="mp-menu-group-title">Information</h4>
              <div className="mp-menu-group">
                <MenuItem 
                  icon={<Info size={18} />} 
                  title="About Us" 
                  subtitle="Learn more about PrepMark" 
                  onClick={() => setActiveScreen("about")} 
                />
              </div>
            </>
          )}

          '''
    new_content = content[:start_idx] + replacement + content[end_idx:]
    
    with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/ProfilePages/MobileProfileFlow.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
        
