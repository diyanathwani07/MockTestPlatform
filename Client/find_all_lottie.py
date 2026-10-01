import os

def find_lottie(start_dir):
    matches = []
    for root, dirs, files in os.walk(start_dir):
        for file in files:
            if "bag" in file.lower() or "lottie" in file.lower():
                matches.append(os.path.join(root, file))
    return matches

print(find_lottie('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client'))
