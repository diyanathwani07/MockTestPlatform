# PrepMark - Mock Test Platform

A full-stack, enterprise-grade mock test preparation and assessment platform tailored for competitive examinations (CTET, UPTET, BPSC, SSC, and more).

---

## 🚀 Overview

PrepMark delivers an end-to-end examination experience with realistic test simulations, real-time analytics, instant score calculation, leaderboard standings, flashcards study mode, push notifications, and AI-powered custom test generation.

---

## 🏗️ Project Architecture

```
MockTestPlatform/
├── Client/       # React (Vite) frontend application & Capacitor Android wrapper
├── Server/       # Node.js + Express REST API & Socket.IO server
├── Artifacts/    # Documentation and technical reports
└── .gitignore    # Repository ignore rules
```

---

## 🛠️ Tech Stack

### Frontend (`Client/`)
- **Framework**: React 18, Vite
- **Styling**: Modern CSS variables with Dark/Light theme switching
- **State & Routing**: React Router v6, Context API
- **Icons & Visuals**: Lucide React, DotLottie, Canvas Confetti
- **Mobile Packaging**: Capacitor (Android APK)

### Backend (`Server/`)
- **Runtime**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for live updates and notifications
- **Push Notifications**: Firebase Admin SDK (FCM)
- **Authentication**: JWT, bcrypt

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance
- npm

### 2. Backend Setup
```bash
cd Server
npm install
# Configure your environment variables in Server/.env
npm run dev
```

### 3. Frontend Setup
```bash
cd Client
npm install
npm run dev
```

---

## 📄 License

Proprietary — All rights reserved by PrepMark.
