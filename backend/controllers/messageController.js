import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";

export const sendMessage = async (req, res, next) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      return res.status(400).json({ message: "content and chatId are required" });
    }

    let message = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId
    });

    message = await message.populate("sender", "name profilePic email");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name profilePic email"
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id
    });

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
};

export const fetchMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name profilePic email")
      .populate("chat");

    return res.status(200).json(messages);
  } catch (error) {
    return next(error);
  }
};

