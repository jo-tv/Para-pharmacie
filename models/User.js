// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  password: {
    type: String,
    required: true,
  }
});

// ✅ نصدره كـ default
export default mongoose.model("User", userSchema);