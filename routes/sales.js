import express from 'express';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';

const router = express.Router();

router.post('/api/vente', async (req, res) => {
  try {
    const { items, totalHT, totalTTC, date } = req.body;

    console.log('Body reçu du frontend:', req.body);

    // 1️⃣ تحديث الكميات لكل منتج
    for (const item of items) {
      const product = await Product.findById(item._id);
      if (!product) {
        console.warn(`⚠️ Produit non trouvé: ${item.name}`);
        continue; // نتجاوز المنتج الغير موجود
      }

      // نقص الكمية حسب الفاتورة، يمكن أن تصبح سالبة
      const oldQuantity = product.quantity;
      product.quantity -= item.qty;

      await product.save();
      console.log(
        `Produit "${item.name}" mis à jour: ancienne quantité = ${oldQuantity}, vendue = ${item.qty}, nouvelle quantité = ${product.quantity}`
      );
    }

    // 2️⃣ حفظ الفاتورة
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
      createdAt: date ? new Date(date) : new Date(),
    });

    await newSale.save();

    console.log('✅ Vente confirmée et enregistrée:', newSale);

    res.json({ ok: true, message: 'Vente confirmée et enregistrée ✅', sale: newSale });
  } catch (err) {
    console.error('❌ Erreur lors de la sauvegarde vente:', err);
    res.status(500).json({ ok: false, message: 'Erreur serveur ❌' });
  }
});

export default router;
