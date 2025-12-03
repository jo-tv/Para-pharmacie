import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import session from 'express-session';
import compression from 'compression';
import Product from './models/Product.js';
import Sale from './models/Sale.js';
import User from './models/User.js';
import Customer from './models/Customer.js';
import MongoStore from 'connect-mongo';
// CommonJS
// const cloudinary = require('cloudinary').v2;

// أو ES Module
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: 'dvvknaxx6', // CLOUD_NAME
  api_key: '955798727236253', // API_KEY
  api_secret: 'Art43qa10C8-3pOliHqiV92JbHw', // API_SECRET
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
// Middlewares
const app = express();
app.use(cors());
app.use(express.json());
// زيادة الحد من 100kb (الافتراضي) إلى 10MB
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public', { maxAge: '1d' }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// 🟢 تفعيل الضغط لجميع الاستجابات
app.use(compression());

// ✅ إعداد session

// 🟢 أولًا: ضبط الجلسة
app.use(
  session({
    secret: '#@%*^*@^%%@(@^&@727',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // ساعة
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // 👈 هنا المفتاح الصحيح
    }),
  })
);

// Middleware للتحقق من تسجيل الدخول
function isAuth(req, res, next) {
  if (req.session.userId) {
    return next(); // مسموح
  }
  res.redirect('/login'); // غير مسموح
}

// اتصال بقاعدة البيانات
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

//   هده منطقة خاصة بدوال ثابعة لل Product
// routes/sales.js

// إعداد multer لرفع الملفات

const storage = multer.memoryStorage(); // تخزين بالذاكرة
const upload = multer({ storage }); // الآن req.file.buffer جاهز للرفع

// 📄 عرض صفحة index.html
app.get('/regi', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'regi.html'));
});
// Route POST لاستقبال البيانات
app.post('/regi', async (req, res) => {
  try {
    const { password } = req.body;

    // 🗑️ مسح كل المستخدمين القدامى
    await User.deleteMany({});

    // 🔐 تشفير الباسوورد الجديد
    const hashedPassword = await bcrypt.hash(password, 10);

    // 💾 حفظ في DB
    const newUser = new User({ password: hashedPassword });
    await newUser.save();

    // ✅ رسالة HTML أنيقة مع تحويل بعد 2 ثانية
    // بعد نجاح التسجيل
    req.session.message = '✅ New user registered successfully!';

    const message = req.session.message || null;
    req.session.message = null;

    if (message) {
      // تحويل الرسالة إلى query parameter
      return res.redirect(`/regi?message=${encodeURIComponent(message)}`);
    }
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Server error');
  }
});

app.get('/login', (req, res) => {
  const message = req.session.message;
  req.session.message = null;

  if (message) {
    return res.redirect(`/login?message=${encodeURIComponent(message)}`);
  }

  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// 🛠️ دالة مساعدة للرسائل مع إعادة التوجيه
function setMessageAndRedirect(req, res, message, path = '/login') {
  req.session.message = message;
  return res.redirect(path);
}

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 البحث عن المستخدم بالبريد (أو أي معيار عندك)
    const user = await User.findOne({ email });
    if (!user) {
      return setMessageAndRedirect(req, res, '❌ No user found, please register first.');
    }

    // 🔑 التحقق من كلمة المرور
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return setMessageAndRedirect(req, res, '❌ Invalid password.');
    }

    // ✅ نجاح تسجيل الدخول
    req.session.userId = user._id;
    return res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    return setMessageAndRedirect(req, res, '⚠️ An unexpected error occurred. Please try again.');
  }
});

app.get('/', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'Dashboard.html'));
});

app.get('/product', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'product.html'));
});

app.get('/ajouter', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/caisse', isAuth, (req, res) => {
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
app.get('/api/products/updates', isAuth, async (req, res) => {
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
app.get('/api/products/search', isAuth, async (req, res) => {
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
// استخدم التخزين بالذاكرة بدل القرص

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ ok: false, message: 'Aucun fichier reçu' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'uploads' }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(req.file.buffer);
    });

    res.json({ ok: true, url: result.secure_url });
  } catch (err) {
    console.error('Erreur upload:', err);
    res.status(500).json({ ok: false, message: 'Erreur lors du téléchargement sur Cloudinary' });
  }
});

// 🟢 API: إضافة منتج جديد
app.post('/api/products', async (req, res) => {
  try {
    console.log('🟢 Requête reçue pour ajouter un produit:', req.body);

    const {
      name,
      barcode,
      price,
      quantity,
      expiry,
      visibility,
      category,
      promotion,
      fournisseur,
      pricePromo,
      image, // هذا من المفترض أن يكون رابط Cloudinary بعد رفع الصورة
    } = req.body;

    // التحقق من وجود الصورة
    if (!image) {
      console.warn('⚠️ Aucune image fournie pour ce produit.');
      return res.status(400).json({
        error: 'Veuillez fournir une image pour le produit.',
      });
    }

    // إنشاء المنتج
    const newProduct = new Product({
      name,
      barcode,
      price,
      pricePromo,
      quantity,
      expiry,
      visibility,
      category,
      promotion,
      fournisseur,
      image, // الرابط الذي أرسلته من Cloudinary
    });

    await newProduct.save();

    console.log('✅ Produit ajouté avec succès:', newProduct);

    res.json({
      message: 'Produit ajouté avec succès ✅',
      _id: newProduct._id,
    });
  } catch (err) {
    // 🟢 التحقق من خطأ تكرار الـ barcode
    if (err.code === 11000 && err.keyPattern?.barcode) {
      console.error('❌ Barcode dupliqué:', req.body.barcode);
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
  const {
    name,
    price,
    pricePromo,
    quantity,
    barcode,
    expiry,
    visibility,
    category,
    promotion,
    fournisseur,
    image,
  } = req.body;

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        price,
        pricePromo,
        quantity,
        barcode,
        expiry,
        visibility,
        category,
        promotion,
        fournisseur,
        image,
      },
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

//   هنا نهايه دوال ثابعة لل product

// هنا بداية دوال sales

app.get('/ticket', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ticket.html'));
});
app.get('/facture', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'facture.html'));
});
app.get('/client', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'client.html'));
});

// ✅ API لحساب مجموع المبيعات اليومية
app.get('/api/ventes/daily-total', isAuth, async (req, res) => {
  try {
    // بداية اليوم (00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // بداية اليوم التالي (00:00 الغد)
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // مجموع المبيعات (totalTTC)
    const ventes = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalTTC' },
        },
      },
    ]);

    const totalVentes = ventes.length > 0 ? ventes[0].total : 0;

    res.json({ ok: true, totalVentes });
  } catch (err) {
    console.error('❌ Erreur lors du calcul total des ventes:', err);
    res.status(500).json({ ok: false, message: 'Erreur serveur ❌' });
  }
});

// GET /api/ventes endpoint
app.get('/api/ventes', isAuth, async (req, res) => {
  try {
    let query = {};
    const searchTerm = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const mainConditions = [];

    // فلترة نطاق التاريخ
    if (startDate || endDate) {
      const dateRangeCondition = {};

      if (startDate && !endDate) {
        // 🟢 يوم واحد فقط
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);

        dateRangeCondition.$gte = startOfDay;
        dateRangeCondition.$lte = endOfDay;
      } else {
        // 🟢 نطاق بين تاريخين
        if (startDate) {
          const startOfDay = new Date(startDate);
          startOfDay.setHours(0, 0, 0, 0);
          dateRangeCondition.$gte = startOfDay;
        }

        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          dateRangeCondition.$lte = endOfDay;
        }
      }

      mainConditions.push({ createdAt: dateRangeCondition });
    } else {
      // 🟢 إذا لم يُدخل المستخدم أي تاريخ → اليوم الحالي من 00:00 إلى 23:59:59
      const now = new Date();

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      mainConditions.push({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      });
    }

    // فلترة البحث النصي/الرقمي
    if (searchTerm) {
      const isNumber = !isNaN(parseFloat(searchTerm)) && isFinite(searchTerm);
      const regex = new RegExp(searchTerm, 'i');

      const orConditions = [];

      // البحث برقم الباركود دائماً
      orConditions.push({ ticketBarcode: regex });

      if (isNumber) {
        // إذا كان البحث رقماً، قم بالبحث عن المبلغ
        orConditions.push({ totalTTC: parseFloat(searchTerm) });
      }

      // أضف شروط البحث إلى mainConditions
      mainConditions.push({ $or: orConditions });
    }

    // دمج جميع الشروط في استعلام واحد
    if (mainConditions.length > 0) {
      query.$and = mainConditions;
    }

    const ventes = await Sale.find(query).sort({ createdAt: -1 });

    res.json({ ok: true, ventes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// دالة ارسال المبيعات الى قاعدة بيانات
app.post('/api/vente', async (req, res) => {
  try {
    const { items, totalHT, totalTTC, date } = req.body;

    console.log('📩 Body reçu du frontend:', req.body);

    // 🔹 دالة توليد باركود EAN13 (داخل نفس الملف)
    function generateEAN13() {
      let code = '';
      for (let i = 0; i < 12; i++) code += Math.floor(Math.random() * 10);
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
      const checkDigit = (10 - (sum % 10)) % 10;
      return code + checkDigit;
    }

    // 1️⃣ تحديث الكميات لكل منتج
    for (const item of items) {
      const product = await Product.findById(item._id);
      if (!product) {
        console.warn(`⚠️ Produit non trouvé: ${item.name}`);
        continue;
      }

      const oldQuantity = product.quantity;
      product.quantity -= item.qty;
      await product.save();

      console.log(
        `🛒 Produit "${item.name}" mis à jour: ancienne quantité = ${oldQuantity}, vendue = ${item.qty}, nouvelle quantité = ${product.quantity}`
      );
    }

    // 2️⃣ توليد باركود للتذكرة
    let ticketBarcode;
    let exists = true;
    while (exists) {
      ticketBarcode = generateEAN13();
      exists = await Sale.findOne({ ticketBarcode }); // نتأكد أنه مش مكرر
    }

    // 3️⃣ حفظ الفاتورة
    const newSale = new Sale({
      items: items.map((i) => ({
        productId: i._id,
        name: i.name,
        price: i.price,
        quantity: i.qty,
        barcode: i.barcode,
      })),
      totalHT,
      totalTTC,
      ticketBarcode, // ⬅️ يتخزن في DB مع باقي بيانات التذكرة
      createdAt: date ? new Date(date) : new Date(),
    });

    await newSale.save();

    console.log('✅ Vente confirmée et enregistrée:', newSale);

    res.json({
      ok: true,
      message: 'Vente confirmée et enregistrée ✅',
      sale: newSale,
    });
  } catch (err) {
    console.error('❌ Erreur lors de la sauvegarde vente:', err);
    res.status(500).json({ ok: false, message: 'Erreur serveur ❌' });
  }
});
// هنا نهاية دوال تابع  ل salse

app.put('/api/vente/:id', async (req, res) => {
  try {
    const updatedSale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedSale) return res.status(404).json({ ok: false, message: 'Vente introuvable ❌' });
    res.json({ ok: true, sale: updatedSale });
  } catch (err) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ ok: false, message: 'Erreur serveur ❌' });
  }
});

app.delete('/api/vente/:id', async (req, res) => {
  try {
    const deletedSale = await Sale.findByIdAndDelete(req.params.id);
    if (!deletedSale) return res.status(404).json({ ok: false, message: 'Vente introuvable' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Erreur serveur' });
  }
});

// ======================
// 📌 API Routes
// ======================

// 📍 GET كل الزبناء
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📍 POST إضافة زبون جديد
app.post('/api/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📍 PUT تعديل زبون
// تأكد من أن لديك: app.use(express.json());

/* GET عميل واحد */
app.get('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ ok: false, error: 'Invalid id' });
  }
  try {
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ ok: false, error: 'Client non trouvé' });
    res.json(customer);
  } catch (err) {
    console.error('GET /api/customers/:id error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* PUT تعديل عميل */
app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ ok: false, error: 'Invalid id' });
  }

  try {
    const updated = await Customer.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true, // يشغّل validators من schema لو موجودة
    });

    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Client non trouvé' });
    }

    return res.json({ ok: true, customer: updated });
  } catch (err) {
    console.error('PUT /api/customers/:id error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
// 📍 DELETE حذف زبون
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Client supprimé avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// تسجيل الخروج
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// apps listen
app.listen(5000, () => {
  console.log('🚀 Backend running on port 5000');
});
