const admin = require("firebase-admin");

if (!admin.apps.length) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

const db = admin.firestore();

const STATUS_MAP = {
  CONFIRMED: "pago",
  RECEIVED: "pago",
  OVERDUE: "atrasado",
  REFUNDED: "cancelado",
  CANCELED: "cancelado",
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Verifica token secreto lendo do Firestore (com fallback para env var)
  const token = req.query.token || req.headers["x-asaas-token"];
  try {
    const cfgSnap = await db.collection("config").doc("asaas").get();
    const webhookToken = cfgSnap.exists ? cfgSnap.data().webhookToken : process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken && token !== webhookToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch {
    if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { event, payment } = req.body || {};
  if (!payment?.id) return res.status(400).json({ error: "Payload inválido" });

  console.log(`[asaas/webhook] event=${event} paymentId=${payment.id} status=${payment.status}`);

  try {
    const novoStatus = STATUS_MAP[payment.status];

    const snap = await db.collection("cobrancas")
      .where("asaasId", "==", payment.id)
      .limit(1)
      .get();

    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      const dados = snap.docs[0].data();
      const update = {};
      if (novoStatus) update.status = novoStatus;
      if (novoStatus === "pago") update.pagoEm = new Date();
      if (Object.keys(update).length > 0) await docRef.update(update);

      if (novoStatus === "pago" && dados.terapeutaId) {
        await db.collection("terapeutas").doc(dados.terapeutaId).update({ plano: "ativo" });
        console.log(`[asaas/webhook] Terapeuta ${dados.terapeutaId} ativado.`);
      }
    } else {
      console.warn(`[asaas/webhook] Cobrança não encontrada: asaasId=${payment.id}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[asaas/webhook]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
