import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import { emitToChatUsers, getIo } from "../socket.js";

const AI_NAME = "Grok AI";
const AI_EMAIL = process.env.AI_USER_EMAIL || "grok@ai.local";
const AI_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const buildSystemPrompt = () =>
  "You are Grok AI, a helpful assistant inside a real-time chat app. Answer clearly and concisely.";

const getOrCreateAiUser = async () => {
  const existing = await User.findOne({ email: AI_EMAIL });
  if (existing) {
    return existing;
  }

  const passwordSeed = Math.random().toString(36).slice(2);
  const created = await User.create({
    name: AI_NAME,
    email: AI_EMAIL,
    password: `ai-${passwordSeed}`,
    profilePic: ""
  });

  return created;
};

const populateMessage = (messageId) =>
  Message.findById(messageId)
    .populate("sender", "name profilePic email")
    .populate("chat")
    .populate({
      path: "chat.users",
      select: "name profilePic email"
    });

const getOrCreateAiChat = async (userId, aiUserId) => {
  let existingChat = await Chat.find({
    isGroupChat: false,
    $and: [{ users: { $elemMatch: { $eq: userId } } }, { users: { $elemMatch: { $eq: aiUserId } } }]
  })
    .populate("users", "-password")
    .populate("latestMessage");

  if (existingChat.length > 0) {
    return existingChat[0];
  }

  const createdChat = await Chat.create({
    chatName: AI_NAME,
    isGroupChat: false,
    users: [userId, aiUserId]
  });

  const fullChat = await Chat.findById(createdChat._id)
    .populate("users", "-password")
    .populate("latestMessage");

  return fullChat;
};

const fetchGrokResponse = async (prompt) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Grok API request failed");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
};

export const accessAiChat = async (req, res, next) => {
  try {
    const aiUser = await getOrCreateAiUser();
    const chat = await getOrCreateAiChat(req.user._id, aiUser._id);
    return res.status(200).json(chat);
  } catch (error) {
    return next(error);
  }
};

export const sendAiMessage = async (req, res, next) => {
  try {
    const { message, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const aiUser = await getOrCreateAiUser();
    let chat = null;

    if (chatId) {
      chat = await Chat.findById(chatId).populate("users", "-password");
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const isMember = chat.users.some((user) => String(user._id) === String(req.user._id));
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized for this chat" });
      }
    } else {
      chat = await getOrCreateAiChat(req.user._id, aiUser._id);
    }

    const io = getIo();
    if (io) {
      io.to(String(chat._id)).emit("ai typing", { chatId: chat._id, name: AI_NAME });
    }

    const userMessage = await Message.create({
      sender: req.user._id,
      content: message,
      chat: chat._id
    });

    const fullUserMessage = await populateMessage(userMessage._id);
    await Chat.findByIdAndUpdate(chat._id, { latestMessage: userMessage._id });
    emitToChatUsers(chat, "message received", fullUserMessage, req.user._id);

    const aiText = await fetchGrokResponse(message);

    const aiMessage = await Message.create({
      sender: aiUser._id,
      content: aiText || "",
      chat: chat._id
    });

    const fullAiMessage = await populateMessage(aiMessage._id);
    await Chat.findByIdAndUpdate(chat._id, { latestMessage: aiMessage._id });
    emitToChatUsers(chat, "message received", fullAiMessage, aiUser._id);

    if (io) {
      io.to(String(chat._id)).emit("ai stop typing", { chatId: chat._id, name: AI_NAME });
    }

    return res.status(200).json({
      chat,
      userMessage: fullUserMessage,
      aiMessage: fullAiMessage
    });
  } catch (error) {
    return next(error);
  }
};
