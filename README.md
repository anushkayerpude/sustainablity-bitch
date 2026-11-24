# LabSync: Engineering Digital Practical & Live Lab Ecosystem

> **Zero-Paper Continuous Assessment • Simultaneous Lab Lecture Verification • Multi-Language In-Browser Compilers**

LabSync is a web platform for engineering colleges, faculty, and students designed to eliminate physical, printed practical manuals. It provides cryptographic, timestamped proof of simultaneous practical execution during scheduled lab lecture hours, saving students money and reducing paper waste.

---

## 🌟 Key Features

### 1. In-Browser Multi-Language Compilers & Runner
- **Languages Supported:**
  - **C** (`gcc / clang -O2`)
  - **C++** (`g++ -std=c++17 -O2`)
  - **Java** (`javac / java`)
  - **Python 3** (`python3 -u`)
  - **JavaScript / Node.js** (`node`)
  - **SQL** (In-memory Relational DBMS engine with `JOIN`, `GROUP BY`, `HAVING`)
  - **Bash / Shell Scripting** (`/bin/bash`)
- **Interactive Workbench:**
  - Monaco code editor with syntax highlighting and auto-indent.
  - Standard input (`stdin`) console for testing custom values.
  - Automated test runner testing against benchmark test cases.
  - Auto-saving directly to the student's unique **Personal ID** (`2023-CS-042`).

### 2. 3-Tier Student Dashboard
- **1. Current Practicals:** Shows ongoing live lab lectures with active room codes (e.g. `LAB-CS-304`), venue, and timer.
- **2. Pending Practicals:** Full syllabus checklist of experiments yet to be completed.
- **3. Already Done & Verified:** Displays faculty-evaluated practicals with marks (e.g., `10.0 / 10`), remarks, and cryptographic digital signatures.

### 3. Simultaneous Lab Lecture Proof Verification
- Faculty starts an active lab lecture session with a room passcode.
- The system logs live keystrokes, compiler execution timestamps, and duration.
- Provides proof of simultaneous lab work, preventing unverified copy-pasting from outside lab hours.

### 4. Faculty Live Lab Radar & One-Click Verification
- **Live Classroom Radar:** Faculty dashboard monitors connected students live in the room, displaying keystroke activity, compile attempts, and test case pass rates in real time.
- **1-Click Review & Signing:** Faculty inspects the student's code, output, and execution timestamps, inputs marks, adds remarks, and applies a digital signature token.

### 5. Official Continuous Assessment Digital Lab Journal
- Generates an **Official Continuous Assessment Digital Lab Journal** ready for printing or PDF export.
- Features institution headers, candidate details, an index table of all completed experiments, verified source code, terminal logs, and faculty verification stamps with SHA-256 integrity checksums.

### 6. Minimalist Black & Magenta Theme
- Designed with a pure black (`#000000`) and electric magenta (`#d946ef`) color scheme for maximum clarity and contrast.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18+ (Node.js 22+ recommended for built-in `node:sqlite`)
- **Compilers** (for native code execution): `gcc`, `g++`, `python3`, `javac`, `node`

### Installation

```bash
# Clone the repository
git clone https://github.com/anushkayerpude/sustainablity-bitch.git
cd sustainablity-bitch

# Install dependencies
npm install

# Run the development server
npm run dev

# Or build for production
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Frontend:** [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (`@monaco-editor/react`)
- **Database:** Native SQLite (`node:sqlite` via `DatabaseSync`)
- **Runner Engine:** Sandboxed Node.js Child Processes with strict timeouts & buffer limits

---

## 📄 License
MIT License. Built for modern engineering education.
