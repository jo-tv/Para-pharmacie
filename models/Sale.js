import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String,
      price: Number,
      quantity: Number,
      barcode: String,
    },
  ],
  totalHT: { type: Number, required: true },
  totalTTC: { type: Number, required: true },
  ticketBarcode: { type: String, unique: true }, // باركود ثابت وفريد
  createdAt: { type: Date, default: Date.now }, // ✅ مهم
});

export default mongoose.model('Sale', saleSchema);
