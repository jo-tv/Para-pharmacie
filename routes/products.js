// routes/sales.js
import multer from 'multer';
import express from 'express';
import Product from '../models/Product.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

const router = express.Router();

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// 📄 عرض صفحة index.html
router.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'Dashboard.html'));
});
router.get('/product', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'product.html'));
});
router.get('/ajouter', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'admin.html'));
});
router.get('/caisse', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'caisse.html'));
});

// جلب كل المنتجات
router.get('/api/products', async (req, res) => {
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
router.get('/api/products/updates', async (req, res) => {
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
router.get('/api/products/search', async (req, res) => {
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
router.post('/api/upload', upload.single('image'), (req, res) => {
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
router.post('/api/products', async (req, res) => {
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

// DELETE /api/products/:id
router.delete('/api/products/:id', async (req, res) => {
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
router.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, quantity, barcode, expiry } = req.body;

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, price, quantity, barcode, expiry },
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

export default router;
