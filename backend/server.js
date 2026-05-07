import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { initSocket } from "./socket.js";

dotenv.config();

await connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Chat API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/user", userRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  }
});

initSocket(io);

io.on("connection", (socket) => {
  const handshakeUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

  if (handshakeUserId) {
    socket.join(String(handshakeUserId));
  }

  socket.on("setup", (userData) => {
    const userId = userData?._id || userData?.id || userData;

    if (!userId) {
      return;
    }

    socket.join(String(userId));
    socket.emit("connected");
  });

  socket.on("join chat", (chatId) => {
    if (!chatId) {
      return;
    }

    socket.join(String(chatId));
  });

  socket.on("typing", (chatId) => {
    if (!chatId) {
      return;
    }

    socket.to(String(chatId)).emit("typing", chatId);
  });

  socket.on("stop typing", (chatId) => {
    if (!chatId) {
      return;
    }

    socket.to(String(chatId)).emit("stop typing", chatId);
  });

  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived?.chat;
    const sender = newMessageReceived?.sender;
    const senderId = String(sender?._id || sender?.id || sender || "");

    if (!chat?.users || !Array.isArray(chat.users)) {
      return;
    }

    chat.users.forEach((user) => {
      const userId = String(user?._id || user?.id || user || "");

      if (!userId || userId === senderId) {
        return;
      }

      socket.to(userId).emit("message received", newMessageReceived);
    });
  });
});

