import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    barcode: { type: String,  unique: true },
    price: { type: Number, default: 0 },
    pricePromo: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    expiry: { type: Date },
    image: { type: String },
    visibility: { type: String },
    category: { type: String },
    promotion : { type: String },
    fournisseur : { type: String }
  },
  { timestamps: true } // يضيف createdAt و updatedAt
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
