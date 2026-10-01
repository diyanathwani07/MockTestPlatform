import os
files = os.listdir('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/public')
print([f for f in files if "bag" in f.lower() or "lottie" in f.lower()])
