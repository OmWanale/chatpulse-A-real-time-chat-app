import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";

const populateChat = (chatId) =>
  Chat.findById(chatId)
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

export const accessChat = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    let existingChat = await Chat.find({
      isGroupChat: false,
      $and: [{ users: { $elemMatch: { $eq: req.user._id } } }, { users: { $elemMatch: { $eq: userId } } }]
    })
      .populate("users", "-password")
      .populate("latestMessage");

    existingChat = await User.populate(existingChat, {
      path: "latestMessage.sender",
      select: "name email profilePic"
    });

    if (existingChat.length > 0) {
      return res.status(200).json(existingChat[0]);
    }

    const createdChat = await Chat.create({
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId]
    });

    const fullChat = await Chat.findById(createdChat._id).populate("users", "-password");

    return res.status(201).json(fullChat);
  } catch (error) {
    return next(error);
  }
};

export const fetchChats = async (req, res, next) => {
  try {
    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } }
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: "latestMessage.sender",
      select: "name email profilePic"
    });

    return res.status(200).json(chats);
  } catch (error) {
    return next(error);
  }
};

export const createGroupChat = async (req, res, next) => {
  try {
    const { name, users } = req.body;

    if (!name || !Array.isArray(users) || users.length < 2) {
      return res.status(400).json({ message: "name and at least 2 users are required" });
    }

    const groupUsers = [...new Set([...users, req.user._id.toString()])];

    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: groupUsers,
      groupAdmin: req.user._id
    });

    const fullChat = await populateChat(groupChat._id);
    return res.status(201).json(fullChat);
  } catch (error) {
    return next(error);
  }
};

export const renameGroup = async (req, res, next) => {
  try {
    const { chatId, chatName } = req.body;

    if (!chatId || !chatName) {
      return res.status(400).json({ message: "chatId and chatName are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (String(chat.groupAdmin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only group admin can rename" });
    }

    chat.chatName = chatName.trim();
    await chat.save();

    const updatedChat = await populateChat(chat._id);
    return res.status(200).json(updatedChat);
  } catch (error) {
    return next(error);
  }
};

export const addToGroup = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ message: "chatId and userId are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (String(chat.groupAdmin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only group admin can add users" });
    }

    await Chat.findByIdAndUpdate(chatId, { $addToSet: { users: userId } });
    const updatedChat = await populateChat(chatId);
    return res.status(200).json(updatedChat);
  } catch (error) {
    return next(error);
  }
};

export const removeFromGroup = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ message: "chatId and userId are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isAdmin = String(chat.groupAdmin) === String(req.user._id);
    const isSelf = String(userId) === String(req.user._id);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Not allowed to remove this user" });
    }

    await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } });

    const updatedChat = await Chat.findById(chatId);
    if (updatedChat && String(updatedChat.groupAdmin) === String(userId)) {
      const nextAdmin = updatedChat.users[0] || null;
      updatedChat.groupAdmin = nextAdmin;
      await updatedChat.save();
    }

    const fullChat = await populateChat(chatId);
    return res.status(200).json(fullChat);
  } catch (error) {
    return next(error);
  }
};

