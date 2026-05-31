<p align="center">
  <h1 align="center">🚨 RoadSOS</h1>
  <p align="center"><strong>Your Emergency Road Companion</strong></p>
  <p align="center">
    A real-time emergency road safety platform with GPS tracking, SMS alerts, interactive maps, traffic reporting, and offline-first architecture — built as a hybrid web + Android application.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Capacitor-8-blue?logo=capacitor" alt="Capacitor" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Leaflet-Maps-green?logo=leaflet" alt="Leaflet" />
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Benefits & Advantages](#-benefits--advantages)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Database Models](#-database-models)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**RoadSOS** is a full-featured emergency road safety application designed to save lives during road emergencies. It empowers users to instantly alert emergency contacts, report incidents on an interactive map, track traffic hazards in real-time, and access critical safety information — all from a single platform.

Whether you're stranded on a highway with a vehicle breakdown, witnessing an accident, or encountering a road hazard, RoadSOS connects you to help within seconds through **SMS alerts with GPS coordinates**, **real-time map visualization**, and **community-driven traffic reporting**.

The application is built as a **hybrid platform** — functioning seamlessly as a responsive web app in any browser and as a native Android application via Capacitor.

---

## 🚀 Key Features

### 🆘 SOS Emergency Alert System
- **One-tap SOS button** to report emergencies instantly
- Categorized emergency types: **Accident, Breakdown, Medical, Fire, Flood, Other**
- Captures **real-time GPS coordinates** automatically
- Allows adding a **detailed description** of the emergency
- Events tracked with statuses: **Active → Responding → Resolved**
- Real-time SOS markers displayed on the interactive map

### 📲 SMS Emergency Notifications
- **Automatic SMS alerts** sent to all registered emergency contacts when SOS is triggered
- Messages include a **Google Maps link** with exact GPS coordinates (`https://maps.google.com/maps?q=lat,lng`)
- Includes critical user info: **name, blood group, vehicle number**
- Powered by **Fast2SMS API** for reliable delivery across India
- Supports **custom SMS** sending to any phone number

### 🗺️ Interactive Real-Time Map
- Full-screen **Leaflet map** with OpenStreetMap tiles
- **Live user location tracking** with a pulsing blue marker
- Color-coded **SOS incident markers** showing active emergencies nearby
- **Traffic event markers** with distinct icons for each hazard type
- Clickable markers with **detail popups** (type, description, reporter, time)
- **"Center on me"** button for quick navigation to current location
- **Auto-refresh every 30 seconds** for real-time situational awareness

### 📍 GPS & Geolocation
- Continuous **real-time location tracking** via Browser Geolocation API
- **Capacitor Geolocation plugin** for enhanced native Android accuracy
- Automatic location capture on SOS and traffic report submissions
- Location data shared with emergency contacts via SMS

### 🚦 Traffic Reporting System
- Community-driven **traffic event reporting**
- Multiple event types: **Accident, Congestion, Construction, Police, Hazard, Road Closure, Other**
- Four-level severity rating: **Low, Medium, High, Critical**
- Color-coded severity badges for quick visual identification
- Slide-up panel with smooth animations
- Recent traffic events list with relative timestamps

### 📴 Offline-First Architecture
- **IndexedDB-based caching** stores SOS and traffic reports when offline
- Automatic **sync when connectivity is restored**
- Offline status banner with **cached report count indicator**
- Ensures no emergency report is ever lost due to poor connectivity
- SSR-safe implementation (no-ops on server side)

### 👤 User Profile Management
- Comprehensive user profiles with:
  - **Personal info**: Name, phone number
  - **Medical info**: Blood group, medical conditions/allergies
  - **Vehicle info**: Vehicle registration number
- **Emergency contacts** management: Add, edit, and remove contacts with name, phone, and relation
- Profile data included in SMS alerts for first responders

### 🔐 Authentication & Security
- **JWT-based authentication** with HTTP-only cookies
- **bcrypt password hashing** for secure credential storage
- Role-based access control: **User** and **Admin** roles
- Protected API routes with server-side authentication checks
- Secure logout with cookie clearing

### 🛡️ Admin Dashboard
- **Three-tab management interface**: Users, SOS Events, Traffic Events
- **User management**: View all users with profiles and SOS event counts
- **SOS event management**: Update status (Active → Responding → Resolved), delete events
- **Traffic event management**: Toggle active status, delete events
- Admin-only access with role verification

### 📚 Emergency Information Hub
- Educational content about road emergencies
- Categorized emergency information entries
- CRUD operations for emergency info management
- Accessible to all authenticated users

### 🤖 RoadAid AI Chatbot
- **Local AI Integration**: Powered by a local Ollama instance running the Gemma 4 model for privacy-first assistance
- **Smart Emergency Detection**: Automatically detects urgent situations based on user messages and triggers a red visual Emergency Mode
- **Context-Aware Advice**: Provides concise, practical steps for road safety, transportation, and medical emergencies
- **Graceful Fallback**: The floating chat UI only appears when the local Ollama server is running and accessible

### 📱 Hybrid Mobile App (Android)
- Native Android application via **Capacitor 8**
- Wraps the web app for a seamless native experience
- Access to native device APIs (GPS, motion sensors)
- Package: `com.kshitij.roadsos`
- Connects to the deployed Vercel backend

---

## 💡 Benefits & Advantages

### 🏥 Life-Saving Emergency Response
| Benefit | Description |
|---------|-------------|
| **Instant SOS Alerts** | One-tap emergency reporting reduces response time from minutes to seconds |
| **GPS-Linked SMS** | Emergency contacts receive an exact Google Maps link — no need to describe your location |
| **Medical Info Sharing** | Blood group and medical conditions are shared automatically, enabling faster medical treatment |
| **Multi-Contact Notification** | All emergency contacts are notified simultaneously, increasing the chance of rapid assistance |

### 🌐 Connectivity & Reliability
| Benefit | Description |
|---------|-------------|
| **Offline Support** | Reports are cached in IndexedDB when offline and automatically synced — no emergency goes unreported |
| **Real-Time Updates** | 30-second auto-refresh ensures users always see the latest incidents and traffic conditions |
| **Cross-Platform** | Works on any browser (mobile/desktop) AND as a native Android app |
| **Low Bandwidth** | Text-based SMS alerts work even in areas with poor internet but cellular coverage |

### 🗺️ Situational Awareness
| Benefit | Description |
|---------|-------------|
| **Community-Driven Reports** | Crowdsourced traffic and incident data helps drivers avoid dangerous areas |
| **Severity-Rated Hazards** | Four-level severity system (Low → Critical) helps prioritize route decisions |
| **Visual Map Interface** | Color-coded markers provide instant understanding of nearby hazards |
| **Multiple Hazard Types** | Covers accidents, congestion, construction, police, road closures, and more |

### 🔒 Privacy & Security
| Benefit | Description |
|---------|-------------|
| **Secure Authentication** | JWT + bcrypt ensures user credentials are never exposed |
| **HTTP-Only Cookies** | Prevents XSS attacks from stealing authentication tokens |
| **Role-Based Access** | Admin features are locked behind role verification |
| **No Persistent Tracking** | GPS is used only when reporting — not for continuous surveillance |

### 👥 User-Centric Design
| Benefit | Description |
|---------|-------------|
| **One-Tap Emergency** | Large, prominent SOS button designed for high-stress situations |
| **Dark Theme** | Reduces eye strain during nighttime driving |
| **Mobile-First Responsive** | Optimized for mobile use — the primary use case during road emergencies |
| **Smooth Animations** | Pulse effects, slide-ups, and fade-ins enhance the user experience |

### 🏛️ Administrative Control
| Benefit | Description |
|---------|-------------|
| **Centralized Monitoring** | Admin dashboard provides a bird's-eye view of all incidents and users |
| **Status Workflow** | SOS events follow a clear lifecycle (Active → Responding → Resolved) |
| **Event Moderation** | Admins can remove false reports and manage traffic events |
| **User Oversight** | Complete user listing with profile details and activity metrics |

### 📈 Scalability & Maintainability
| Benefit | Description |
|---------|-------------|
| **Modern Tech Stack** | Next.js 16 + React 19 + TypeScript ensures maintainability and type safety |
| **MongoDB Backend** | Flexible, schema-less database scales horizontally with growing data |
| **Component Architecture** | Modular React components enable easy feature additions |
| **Event-Driven Updates** | Custom event bus decouples components, reducing complexity |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Next.js 16 | UI framework & full-stack framework |
| **Language** | TypeScript 5 | Type-safe development |
| **Styling** | Tailwind CSS 4, Custom CSS | Styling & responsive design |
| **Maps** | Leaflet 1.9, react-leaflet 5 | Interactive map rendering |
| **Database** | MongoDB via Mongoose 9 | Data persistence |
| **Auth** | JWT (jsonwebtoken), bcryptjs | Authentication & password hashing |
| **SMS** | Fast2SMS API | Emergency SMS delivery |
| **Offline** | IndexedDB | Client-side report caching |
| **Mobile** | Capacitor 8 | Native Android wrapper |
| **Geolocation** | Browser API + @capacitor/geolocation | GPS tracking |
| **Motion** | @capacitor/motion | Device motion detection |
| **Deployment** | Vercel | Hosting & serverless functions |
| **AI / LLM** | Ollama (Gemma 4) | Local AI for the RoadAid Chatbot |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Map     │  │ SOS      │  │ Traffic  │  │  Profile   │  │
│  │ (Leaflet)│  │ Button   │  │ Panel    │  │  Manager   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬─────┘  │
│       │              │             │               │        │
│  ┌────┴──────────────┴─────────────┴───────────────┴─────┐  │
│  │              Custom Event Bus (events.ts)             │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │           Offline Cache (IndexedDB)                   │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────┼──────────────────────────────────┐
│                     API LAYER (Next.js)                      │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌─────┐ ┌───────┐ ┌───────┐  │
│  │/auth │ │/sos  │ │/traffic│ │/sms │ │/admin │ │/emerg │  │
│  └──┬───┘ └──┬───┘ └───┬────┘ └──┬──┘ └──┬────┘ └──┬────┘  │
│     │        │         │         │        │         │       │
│  ┌──┴────────┴─────────┴─────────┴────────┴─────────┴────┐  │
│  │              JWT Auth Middleware (auth.ts)             │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴─────┐    ┌──────┴──────┐    ┌──────┴──────┐
   │ MongoDB  │    │  Fast2SMS   │    │   Browser   │
   │ (Atlas)  │    │   API       │    │ Geolocation │
   └──────────┘    └─────────────┘    └─────────────┘
```

---

## 📊 Database Models

### User
```typescript
{
  email: string          // Unique, required
  password: string       // bcrypt hashed
  role: 'user' | 'admin' // Default: 'user'
  createdAt: Date        // Auto-generated
}
```

### Profile
```typescript
{
  userId: ObjectId          // Reference to User
  name: string
  phone: string
  bloodGroup: string        // e.g., "O+", "A-", "B+"
  emergencyContacts: [{
    name: string
    phone: string
    relation: string        // e.g., "Father", "Spouse"
  }]
  medicalInfo: string       // Allergies, conditions, etc.
  vehicleNumber: string     // Vehicle registration plate
}
```

### SOSEvent
```typescript
{
  userId: ObjectId                                               // Reporter
  lat: number                                                    // GPS latitude
  lng: number                                                    // GPS longitude
  type: 'accident' | 'breakdown' | 'medical' | 'fire' | 'flood' | 'other'
  description: string
  status: 'active' | 'responding' | 'resolved'                  // Default: 'active'
  createdAt: Date
}
```

### TrafficEvent
```typescript
{
  userId: ObjectId                                                                    // Reporter
  lat: number
  lng: number
  type: 'accident' | 'congestion' | 'construction' | 'police' | 'hazard' | 'road_closure' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  active: boolean                                                                     // Default: true
  createdAt: Date
}
```

### EmergencyInfo
```typescript
{
  userId: ObjectId        // Creator
  title: string
  description: string
  category: string
  createdAt: Date
}
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/signup` | Register new user (returns JWT cookie) | ❌ |
| `POST` | `/api/login` | Authenticate user (returns JWT cookie) | ❌ |
| `POST` | `/api/logout` | Clear authentication cookie | ✅ |
| `GET` | `/api/me` | Get current authenticated user | ✅ |

### User Profile
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/profile` | Get user profile with emergency contacts | ✅ |
| `PUT` | `/api/profile` | Update profile, medical info, contacts | ✅ |

### SOS Events
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/sos` | Get all SOS events (filter by `?status=`) | ✅ |
| `POST` | `/api/sos` | Create new SOS event with GPS coords | ✅ |
| `PATCH` | `/api/sos/[id]` | Update SOS event status | 🔒 Admin |
| `DELETE` | `/api/sos/[id]` | Delete an SOS event | 🔒 Admin |

### Traffic Events
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/traffic` | Get all active traffic events | ✅ |
| `POST` | `/api/traffic` | Report a new traffic event | ✅ |
| `PATCH` | `/api/traffic/[id]` | Update traffic event | 🔒 Admin |
| `DELETE` | `/api/traffic/[id]` | Delete a traffic event | 🔒 Admin |

### SMS
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/sms` | Send SMS via Fast2SMS | ✅ |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/admin/users` | List all users with profiles & stats | 🔒 Admin |

### Emergency Info
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/emergency` | List all emergency info entries | ✅ |
| `POST` | `/api/emergency` | Create emergency info entry | ✅ |
| `GET` | `/api/emergency/[id]` | Get single emergency info | ✅ |
| `DELETE` | `/api/emergency/[id]` | Delete emergency info entry | ✅ |

---

## 📁 Project Structure

```
RoadSOS-main/
├── android/                          # Capacitor Android native project
│   ├── app/src/main/
│   │   ├── java/com/kshitij/roadsos/ # Native Android entry point
│   │   └── res/                      # Android resources & icons
│   └── build.gradle                  # Android build configuration
│
├── src/
│   ├── app/                          # Next.js App Router pages & API
│   │   ├── page.tsx                  # Landing page
│   │   ├── layout.tsx                # Root layout (dark theme, fonts)
│   │   ├── globals.css               # Global styles & animations
│   │   ├── login/page.tsx            # Login page
│   │   ├── signup/page.tsx           # Registration page
│   │   ├── user/page.tsx             # Main user dashboard (Map + SOS + Traffic)
│   │   ├── profile/page.tsx          # Profile & emergency contacts manager
│   │   ├── admin/page.tsx            # Admin dashboard (3-tab management)
│   │   ├── emergency/page.tsx        # Emergency info listing
│   │   ├── emergency/[id]/page.tsx   # Emergency info detail view
│   │   └── api/                      # REST API routes
│   │       ├── signup/route.ts
│   │       ├── login/route.ts
│   │       ├── logout/route.ts
│   │       ├── me/route.ts
│   │       ├── profile/route.ts
│   │       ├── sos/route.ts
│   │       ├── sos/[id]/route.ts
│   │       ├── traffic/route.ts
│   │       ├── traffic/[id]/route.ts
│   │       ├── sms/route.ts
│   │       ├── admin/users/route.ts
│   │       ├── emergency/route.ts
│   │       └── emergency/[id]/route.ts
│   │
│   ├── components/                   # React UI components
│   │   ├── Map.tsx                   # Interactive Leaflet map
│   │   ├── SOSButton.tsx             # Emergency SOS trigger
│   │   └── TrafficPanel.tsx          # Traffic reporting panel
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── auth.ts                   # JWT verification
│   │   ├── events.ts                 # Custom event bus
│   │   ├── offlineCache.ts           # IndexedDB offline storage
│   │   ├── profiles.ts               # Profile API client
│   │   ├── sms.ts                    # SMS sending utilities
│   │   └── db/
│   │       ├── connection.ts         # MongoDB connection manager
│   │       └── models.ts             # Mongoose schemas (5 models)
│   │
│   └── proxy.ts                      # Next.js middleware proxy
│
├── capacitor.config.ts               # Capacitor mobile config
├── next.config.ts                    # Next.js configuration
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
└── postcss.config.mjs                # PostCSS + Tailwind config
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **MongoDB** instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Fast2SMS** account for SMS functionality ([fast2sms.com](https://www.fast2sms.com/))
- **Android Studio** (optional, for mobile app development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/RoadSOS.git
   cd RoadSOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see [Environment Variables](#-environment-variables))

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### Building for Production

```bash
npm run build
npm start
```

### Building the Android App

```bash
# Build the web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/roadsos

# JWT Secret Key (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Fast2SMS API Key (for SMS notifications)
FAST2SMS_API_KEY=your-fast2sms-api-key-here

# Ollama Configuration (for RoadAid Chatbot)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:latest
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection URI |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `FAST2SMS_API_KEY` | ✅ | API key from Fast2SMS for SMS delivery |
| `OLLAMA_URL` | ❌ | URL of the local Ollama instance (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | ❌ | Model to use for the chatbot (default: `gemma4:latest`) |

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect the repository on [vercel.com](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js and configures everything

### Android (Google Play)

1. Update `capacitor.config.ts` with your production server URL
2. Build a signed APK/AAB via Android Studio
3. Publish to Google Play Store

---

## 🖼️ Screenshots

> *Screenshots will be added as the project evolves.*

| Landing Page | User Dashboard | SOS Modal |
|:---:|:---:|:---:|
| Login/Signup | Interactive Map | Emergency Alert |

| Traffic Panel | Profile Page | Admin Dashboard |
|:---:|:---:|:---:|
| Report Hazards | Manage Contacts | Monitor Events |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution
- 🌍 Multi-language support (i18n)
- 🔔 Push notifications integration
- 📊 Analytics dashboard for incident patterns
- 🗣️ Voice-activated SOS for hands-free emergencies
- 🧭 Turn-by-turn navigation to avoid hazards
- 📸 Photo/video attachment for incident reports
- 🏥 Hospital/police station locator integration

---

## 📄 License

This project is open-source. Please check with the repository owner for specific licensing terms.

---

<p align="center">
  <strong>Built with ❤️ for road safety</strong><br/>
  <em>Because every second counts in an emergency.</em>
</p>
