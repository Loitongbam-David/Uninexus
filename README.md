# 🎓 UniNexus: Academic Community Platform

UniNexus is a premium, real-time, Discord-style academic communication hub engineered specifically for university students. Designed with a sleek, glassmorphic dark-mode interface, the platform serves as an exclusive walled garden where scholars can collaborate, share documents, and safely execute multi-language code in live sandboxes.

![UniNexus Banner](https://img.shields.io/badge/Status-Production%20Ready-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Key Features

* **🛡️ University Walled Garden:** Strict JWT authentication tied exclusively to `@cuchd.in` institutional emails. No external access is permitted, guaranteeing a pure academic environment.
* **💬 Real-Time Unified Timeline:** A seamless `Socket.io` architecture that merges incoming terminal logs, text chats, and file vault uploads chronologically into a single, lightning-fast DOM pipeline. 
* **🔒 Private Pod Infrastructure:** Instantly spin up dedicated "Public Hubs" or invite-only "Private Pods" using automated Row Level Security (RLS) and Supabase database encapsulation.
* **💻 Embedded Remote Sandboxes:** A revolutionary in-chat feature! Students can trigger live compiler engines natively inside the Web UI. Features one-click multi-player Terminal environments for:
  * Python 3
  * C / C++ (GCC)
  * React.js & Vanilla JavaScript
* **📂 Interactive Virtual Vault:** Effortless drag-and-drop file chunking allows scholars to directly upload PDFs, Code algorithms, and images natively into the chat timeline.

## 🛠️ Technology Stack

**Backend Engine**
* Node.js & Express.js
* Socket.io (Bi-directional Websockets)
* Supabase (PostgreSQL, Storage Buckets, and Supabase Auth)
* Multer (Stream-based multipart form processing)

**Frontend Architecture**
* Vanilla JavaScript (SPA DOM Manipulation)
* HTML5 & Tailwind CSS (Pre-compiled Utilities)
* DiceBear API (Dynamic Avatars)
* API CodeSandbox / OneCompiler (Dynamic Execution iFrames)



## 📄 License

This project is open-source and available under the MIT License.
