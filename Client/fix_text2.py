import re

def strip_line(filepath, pattern):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We look for something like <p className="..."> \n Text \n </p>
    content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned {filepath}")

strip_line('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentResults.jsx',
           r'<p[^>]*>\s*Review your historical performance and analytics for this test\.\s*</p>')

strip_line('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/MyExams.jsx',
           r'<p[^>]*>\s*Practice mock exams for your preparation\.\s*</p>')

strip_line('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/PracticeDashboard.jsx',
           r'<p[^>]*>\s*Practice module focusing on core concepts\.\s*</p>')
