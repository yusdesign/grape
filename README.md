# grape based on vis-network.

# 🍇 grape is for Android only.

> Load and visualize 📊 UML-like files (JSON, XML, HTML, SVG) to render their graphs.

## 🚀 Features

- 📂 Open JSON/XML/HTML/SVG files via file picker
- 🔍 Interactive graph visualization with vis-network
- 💾 Export graphs as JSON
- 📱 Touch-friendly for mobile
- 🎨 Auto-layout with physics
- 🔄 Context menu for nodes (copy ID, focus)

## 📦 Tech Stack

- **Capacitor 8** - Native bridge
- **Capawesome File Access** - File system
- **vis-network** - Graph rendering

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build web assets
npm run build

# Sync Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
