import * as admin from "firebase-admin";

// Inicializa Firebase Admin uma única vez
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const STATUS_MAP = {
  CONFIRMED: "pago",
  RECEIVED: "pago",
  OVERDUE: "atrasado",
  REFUNDED: "cancelado",
  CANCELED: "cancelado",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Verifica token secreto para segurança
  const token = req.query.token || req.headers["x-asaas-token"];
  if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { event, payment } = req.body;
  if (!payment?.id) return res.status(400).json({ error: "Payload inválido" });

  console.log(`[asaas/webhook] event=${event} paymentId=${payment.id} status=${payment.status}`);

  try {
    const novoStatus = STATUS_MAP[payment.status];

    // Busca a cobrança pelo asaasId
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

      if (Object.keys(update).length > 0) {
        await docRef.update(update);
      }

      // Se pago, ativa o plano do terapeuta
      if (novoStatus === "pago" && dados.terapeutaId) {
        await db.collection("terapeutas").doc(dados.terapeutaId).update({
          plano: "ativo",
        });
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
}
