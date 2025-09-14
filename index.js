import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

import productRoutes from './routes/products.js'; // ✅ routes ديال المنتجات
import salesRoutes from './routes/sales.js'; // ✅ routes ديال المبيعات

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// اتصال بقاعدة البيانات
mongoose
  .connect(
    'mongodb+srv://josefuccef7:gHkpeNOLUzOvawuh@cluster0.qmwgw.mongodb.net/alldata?retryWrites=true&w=majority&appName=Cluster0'
  )
  .then(() => console.log('✅ CONNECTED TO DATABASE'))
  .catch((err) => console.error('❌ DB CONNECTION ERROR:', err.message));

// Routers
app.use('/', productRoutes);
app.use('/sales', salesRoutes);

app.listen(5000, () => {
  console.log('🚀 Backend running on port 5000');
});
