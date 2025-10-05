import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String },
  ice: { type: String },
  address: { type: String },
  phone: { type: String },
}, { timestamps: true });

export default mongoose.model("Customer", customerSchema);