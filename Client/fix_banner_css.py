path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    css = f.read()

fixes = """
/* --- BANNER SPACING FIXES --- */
.sd-banner-wrapper {
  padding: 24px 40px 0 40px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .sd-banner-wrapper {
    padding: 24px 24px 0 24px;
  }
}

@media (max-width: 768px) {
  .sd-banner-wrapper {
    padding: 16px 16px 0 16px !important;
  }
}
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(css + "\n" + fixes)
