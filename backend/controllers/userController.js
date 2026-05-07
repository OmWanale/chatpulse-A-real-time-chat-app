import User from "../models/userModel.js";

export const searchUsers = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();

    const keyword = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find({
      ...keyword,
      _id: { $ne: req.user._id }
    })
      .select("-password")
      .limit(20);

    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
};
