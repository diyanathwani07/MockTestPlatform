import os

def find_bag(start_dir):
    matches = []
    for root, dirs, files in os.walk(start_dir):
        # limit search to not go too deep in node_modules or something, but whatever
        for file in files:
            if "bag.lottie" in file.lower() or "bag_lottie" in file.lower():
                matches.append(os.path.join(root, file))
    return matches

print(find_bag('c:/Users/HP/OneDrive/Desktop'))
