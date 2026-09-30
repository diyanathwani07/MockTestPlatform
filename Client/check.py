path_html = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/index.html'
with open(path_html, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure fonts load asynchronously, we see it has `onload="this.media='all'"`
# But let's check if it lacks preconnect
import re
# Warning says "More than 4 'preconnect' connections were found".
# Some might be added by Vite or plugins. Let's just remove our manual preconnects if they are redundant, or keep them to 2.
# "Reduce unused JavaScript - 451 KiB" is the big one.

