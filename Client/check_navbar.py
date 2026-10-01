path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    if 'admin-navbar' in f.read():
        print("Found in StudentDashboard.css")
    else:
        print("Not in StudentDashboard.css")
