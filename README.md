# ChatPulse

ChatPulse is a real-time messaging app with 1:1 and group chat, typing indicators, and an AI assistant experience. The stack combines a React + Vite frontend with an Express + Socket.IO backend backed by MongoDB.

## Live demo

- https://chatpulse-ruddy.vercel.app

## Project report

- [ChatPulse_Project_Report.pdf](reports/ChatPulse_Project_Report.pdf)

## Features

- Real-time messaging with Socket.IO
- 1:1 and group chat management
- Typing indicators and presence-aware updates
- JWT-based authentication
- AI chat endpoint for assisted replies

## Tech stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB (Mongoose)

## Getting started

### Prerequisites

- Node.js 18+ (backend requires >= 18)
- A MongoDB database (local or hosted)

### Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```bash
MONGO_URI=your_mongodb_connection_string
PORT=5000
CLIENT_URL=http://localhost:5173
```

Start the API server:

```bash
npm run dev
```

### Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

## Environment variables

Backend (`backend/.env`):

- `MONGO_URI` (required) - MongoDB connection string
- `PORT` - API port (defaults to 5000)
- `CLIENT_URL`, `CLIENT_URLS`, or `FRONTEND_URL` - allowed origins for CORS

Frontend (`frontend/.env`):

- `VITE_API_BASE_URL` - API base URL (defaults to `http://localhost:5000/api`)
- `VITE_SOCKET_URL` - Socket.IO base URL (defaults to `http://localhost:5000`)

## Scripts

Backend:

- `npm run dev` - start server with nodemon
- `npm start` - start server

Frontend:

- `npm run dev` - start Vite dev server
- `npm run build` - build production assets
- `npm run preview` - preview production build
