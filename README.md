# Enterprise Real-Time Chat & Communications Engine 🚀

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

A production-grade, highly scalable, and secure real-time messaging, presence tracking, and communications backend built with **Node.js, Express 5, TypeScript, MongoDB (Mongoose), Socket.io**, and **WebRTC**.

Repository: [https://github.com/Ahteshamull/TypeScript_Backend](https://github.com/Ahteshamull/TypeScript_Backend)

---

## 🌟 Key Architecture & Highlights

### 1. 🖥️ Live Real-Time Server & Performance Metrics Dashboard
- Accessing the root endpoint (`GET /`) serves an **auto-refreshing, dark-mode glassmorphism dashboard** showing live system health without external frontend dependencies:
  - **Live Request Hit Counter:** Real-time incoming API request counter.
  - **Node.js Memory Footprint:** Heap Used, Heap Total, External Memory, and Resident Set Size (RSS).
  - **Host RAM & System Specs:** Host machine total memory, used memory %, free RAM, and CPU core topology.
  - **Uptime & DB Health:** Server and system uptime metrics alongside MongoDB connection state.

### 2. ⚡ Enterprise Real-Time Messaging & Presence Engine
- **Lifecycle Delivery Pipeline:** Real-time progression across states: `sent` ➔ `delivered` ➔ `seen` with acknowledgment callbacks.
- **Multi-Device Presence Tracking:** Tracks multi-tab and multi-device connections in-memory with automatic database sync (`isOnline`, `lastSeen`).
- **Typing Indicators:** Real-time typing alerts for 1-on-1 and group channels.
- **Message Reactions:** Live emoji reactions toggleable per message.
- **Real-Time Unsend/Deletion:** Instant message deletion across all active clients.
- **P2P Calling Signaling:** WebRTC audio and video calling support with Metered TURN and Google STUN fallback.

### 3. 🔒 Production-Grade Security & Performance
- **Response Compression:** Gzip and Brotli network payload compression reducing chat history payloads by ~70-80%.
- **Targeted Rate Limiting:** Dedicated `authLimiter` and `otpLimiter` preventing brute-force login and OTP spamming.
- **Strict Data Validation:** Zod schema validation applied across all request payloads before controller execution.
- **Memory & File Upload Shielding:** Multer memory-storage strictly capped at 25MB with multi-format MIME type filters.
- **Database Optimization:** Mongoose connection pooling (`maxPoolSize: 50`), DNS SRV lookup protection (`dns.setServers`), and `.lean()` hydration for fast, low-memory reads.
- **Email Delivery System:** Semantic, responsive HTML email templates for OTP verification and password reset flows.

---

## 📁 Repository Structure

```
├── src/
│   ├── app/                      # Express application, central router, and dashboard
│   │   ├── app.ts                # Express app configuration & middlewares
│   │   └── routes.ts             # Central module route aggregator & TURN credentials
│   ├── config/                   # Environment & third-party configurations
│   │   ├── cloudinary.ts         # Cloudinary SDK setup
│   │   ├── database.ts           # Mongoose connection with DNS SRV & pooling
│   │   └── index.ts              # Typed environment variables
│   ├── interfaces/               # Global TypeScript definitions
│   │   └── index.d.ts            # Extended Express Request types
│   ├── modules/                  # Modular Feature Domain Layers
│   │   ├── auth/                 # Authentication, OTP, and password recovery
│   │   ├── messages/             # Real-time messages, inbox aggregation, and reactions
│   │   ├── uploads/              # Media and file upload controllers
│   │   └── users/                # User profile management & user directory
│   ├── shared/                   # Cross-cutting architectural utilities
│   │   ├── errors/               # Centralized ApiError class
│   │   ├── middlewares/          # Auth, validation, rate limiting, and global error handler
│   │   └── utils/                # Dashboard template, HTML email templates, Cloudinary uploader
│   ├── socket/                   # Enterprise Socket.io events & presence tracking
│   │   └── index.ts              # Socket connection, messaging, and WebRTC signaling
│   └── server.ts                 # Server bootstrap & graceful shutdown
├── Dockerfile                    # Multi-stage production container build
├── start.sh                      # Production startup script with Coturn TURN integration
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MongoDB** (Local instance or MongoDB Atlas)
- **Cloudinary Account** (for multimedia file storage)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Ahteshamull/TypeScript_Backend.git
cd TypeScript_Backend
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/chat_app?retryWrites=true&w=majority

# Security
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Optional: Metered.ca TURN (For WebRTC Calling)
METERED_API_KEY=your_metered_api_key
METERED_APP_NAME=your_metered_app_name
```

### 4. Running the Application
```bash
# Start development server with hot-reloading
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

Once running, visit **`http://localhost:5000/`** to view the live performance metrics dashboard!

---

## 🔌 API Reference (Action-Oriented Routes)

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/create-user` | Register a new user account | Public (Rate-limited) |
| `POST` | `/login-user` | Authenticate user & receive JWT | Public (Rate-limited) |
| `POST` | `/forgot-password` | Request password reset OTP via email | Public (Rate-limited) |
| `POST` | `/verify-otp` | Verify 6-digit OTP code | Public (Rate-limited) |
| `POST` | `/reset-password` | Reset password using verified token | Public (Rate-limited) |

### Users (`/api/v1/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/get-profile` | Fetch logged-in user's profile | Authenticated |
| `PATCH` | `/update-profile` | Update profile information & avatar | Authenticated |
| `GET` | `/get-all-users` | Retrieve directory of registered users | Authenticated |

### Messages & Conversations (`/api/v1/messages`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/get-conversations` | Fetch user inbox list with unread counters | Authenticated |
| `GET` | `/get-messages/:receiverId` | Fetch paginated chat history | Authenticated |
| `POST` | `/send-media-message` | Upload & send multimedia message | Authenticated |
| `GET` | `/get-total-unread-count` | Get total unread badge count | Authenticated |
| `GET` | `/search-messages` | Full-text search through chat messages | Authenticated |
| `DELETE` | `/clear-chat/:targetId` | Clear 1-on-1 conversation history | Authenticated |
| `POST` | `/toggle-reaction/:messageId`| Add/toggle emoji reaction on a message | Authenticated |

### File Uploads (`/api/v1/uploads`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/file` | Upload any file (Image, Video, Audio, Doc up to 25MB) | Authenticated |
| `POST` | `/image` | Upload image to Cloudinary | Authenticated |

### WebRTC Utilities (`/api/v1`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/turn-credentials` | Retrieve active STUN/TURN ICE server credentials | Public |

---

## ⚡ Socket.io Event Dictionary

Authenticate the socket connection by passing the JWT in `auth.token`:
```javascript
const socket = io("http://localhost:5000", {
  auth: { token: "your_jwt_token" }
});
```

### Client ➔ Server Events
| Event | Payload | Description |
| :--- | :--- | :--- |
| `send_message` | `{ receiver, content, imageUrl, videoUrl, audioUrl }` | Send a real-time message (supports ACK callback) |
| `mark_delivered` | `{ messageId, senderId }` | Confirm message delivery receipt |
| `mark_seen` | `{ messageId, receiverId, groupName }` | Mark specific message as read/seen |
| `mark_conversation_seen` | `{ targetId }` | Mark all unread messages from a contact as read |
| `typing_start` | `{ receiverId, groupName }` | Emit typing start indicator |
| `typing_stop` | `{ receiverId, groupName }` | Emit typing stop indicator |
| `delete_message` | `{ messageId, receiverId, groupName }` | Delete/unsend a message |
| `toggle_reaction` | `{ messageId, emoji, receiverId }` | Toggle emoji reaction |
| `get_online_users` | `(callback) => void` | Fetch list of currently online user IDs |

### Server ➔ Client Events
| Event | Payload | Description |
| :--- | :--- | :--- |
| `user_online` | `{ userId, timestamp }` | Triggered when a user connects |
| `user_offline` | `{ userId, lastSeen }` | Triggered when a user disconnects |
| `receive_message` | `IMessage` | Delivers new incoming message |
| `message_delivered` | `{ messageId, deliveredAt }` | Notifies sender of message delivery |
| `message_seen` | `{ messageId, seenAt }` | Notifies sender that message was viewed |
| `user_typing` | `{ senderId, groupName }` | Informs client that contact is typing |
| `message_deleted` | `{ messageId, deletedBy }` | Notifies clients to remove deleted message |
| `message_reaction_updated` | `{ messageId, reactions }` | Broadcasts updated emoji reactions |

---

## 🐳 Docker Deployment

The application is containerized with multi-stage builds and Coturn TURN server support:

```bash
# Build the Docker image
docker build -t typescript-chat-backend .

# Run container
docker run -d \
  --name chat-backend \
  -p 5059:5059 \
  -p 3478:3478/tcp \
  -p 3478:3478/udp \
  --env-file .env \
  typescript-chat-backend
```

---

## 📄 License
This project is open-source and licensed under the **ISC License**.
