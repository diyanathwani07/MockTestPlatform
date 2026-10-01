import os
desk = 'c:/Users/HP/OneDrive/Desktop'
for root, dirs, files in os.walk(desk):
    if "MockTestSeries" in root:
        continue
    for f in files:
        if f.endswith('.lottie'):
            print(os.path.join(root, f))
