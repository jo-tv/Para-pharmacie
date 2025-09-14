import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import Product from './models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// ميدل وير لقراءة ملفات static
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة بيانات MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(
      'mongodb+srv://josefuccef7:gHkpeNOLUzOvawuh@cluster0.qmwgw.mongodb.net/alldata?retryWrites=true&w=majority&appName=Cluster0'
    );

    console.log('CONNCET TO DATABASE');
  } catch (error) {
    console.error('ERROR CONNECTING TO DATABASE:', error.message);
  }
}

connectToDatabase();
// تحديد مجلد التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'), // مجلد uploads
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// 📄 عرض صفحة index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'Dashboard.html'));
});
app.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'product.html'));
});
app.get('/ajouter', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
app.get('/caisse', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'caisse.html'));
});

// جلب كل المنتجات
app.get('/api/products', async (req, res) => {
  const { page = 1, limit = 100 } = req.query; // افتراضي: 100 منتج
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json(products);
  } catch (err) {
    console.error('❌ Error while fetching products:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// جلب المنتجات الجديدة فقط منذ آخر مزامنة
app.get('/api/products/updates', async (req, res) => {
  try {
    const { lastSync } = req.query;
    if (!lastSync) return res.status(400).json({ error: 'lastSync required' });

    const updatedProducts = await Product.find({
      updatedAt: { $gt: new Date(lastSync) },
    }).lean();

    res.json(updatedProducts);
  } catch (err) {
    console.error('❌ Error while fetching updates:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// البحث في قاعدة البيانات
app.get('/api/products/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({}); // إذا لم يرسل المستخدم شيء

  try {
    const product = await Product.findOne({ barcode: q }).lean(); // بدون تحويل إلى Number
    if (product) res.json(product);
    else res.json({}); // إرجاع كائن فارغ إذا لم يوجد
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: '❌ Aucun fichier reçu',
      });
    }

    // السماح فقط بالصور
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        ok: false,
        message: '❌ Seules les images (jpeg, png, gif, webp) sont autorisées',
      });
    }

    // رابط كامل للملف
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    return res.json({
      ok: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Erreur upload:', err);
    return res.status(500).json({
      ok: false,
      message: '❌ Erreur lors du téléchargement',
    });
  }
});

// 🟢 API: إضافة منتج جديد
app.post('/api/products', async (req, res) => {
  try {
    const { name, barcode, price, quantity, expiry, image } = req.body;

    // ننشئ المنتج
    const newProduct = new Product({
      name,
      barcode,
      price,
      quantity,
      expiry,
      image, // هذا سيكون Base64 string
    });

    await newProduct.save();

    res.json({
      message: 'Produit ajouté avec succès ✅',
      _id: newProduct._id,
    });
  } catch (err) {
    // 🟢 التحقق من خطأ تكرار الـ barcode
    if (err.code === 11000 && err.keyPattern?.barcode) {
      return res.status(400).json({
        error: `Le code-barres "${req.body.barcode}" existe déjà. Veuillez utiliser un code-barres unique. ❌`,
      });
    }

    // باقي الأخطاء
    console.error('❌ Error while adding product:', err);
    res.status(400).json({
      error: 'Erreur lors de l’ajout du produit. Veuillez vérifier vos données et réessayer.',
    });
  }
});

// 🟢 API: بيع منتج (إنقاص كمية)
app.post('/api/sell/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });

    if (product.quantity > 0) {
      product.quantity -= 1;
      await product.save();
      res.json({ message: 'Vente effectuée ✅', product });
    } else {
      res.json({ message: 'Stock épuisé ❌' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ ok: false, message: 'Produit non trouvé' });
    }
    res.json({ ok: true, message: 'Produit supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Erreur lors de la suppression' });
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, quantity, barcode, expiry } = req.body;

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, price, quantity,barcode, expiry },
      { new: true, runValidators: true } // لإرجاع المنتج بعد التحديث
    );

    if (!updatedProduct) {
      return res.status(404).json({ ok: false, message: 'Produit non trouvé' });
    }

    res.json({ ok: true, product: updatedProduct, message: 'Produit modifié avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Erreur lors de la modification' });
  }
});

app.listen(5000, () => {
  console.log('🚀 Backend running on ');
});
