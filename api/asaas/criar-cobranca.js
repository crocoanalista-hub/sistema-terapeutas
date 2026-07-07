const admin = require("firebase-admin");

if (!admin.apps.length) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

const db = admin.firestore();

let _cfg = null;
async function getConfig() {
  if (_cfg) return _cfg;
  const snap = await db.collection("config").doc("asaas").get();
  _cfg = snap.exists ? snap.data() : {};
  setTimeout(() => { _cfg = null; }, 60_000);
  return _cfg;
}

async function buscarOuCriarCliente(base, headers, { nome, email, cpfCnpj, mobilePhone }) {
  if (cpfCnpj) {
    const r = await fetch(`${base}/customers?cpfCnpj=${cpfCnpj.replace(/\D/g, "")}`, { headers });
    const data = await r.json();
    if (data.data?.length > 0) return data.data[0].id;
  }

  const body = { name: nome, email };
  if (cpfCnpj) body.cpfCnpj = cpfCnpj.replace(/\D/g, "");
  if (mobilePhone) body.mobilePhone = mobilePhone.replace(/\D/g, "");

  const r = await fetch(`${base}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const cliente = await r.json();
  if (!cliente.id) throw new Error(cliente.errors?.[0]?.description || "Erro ao criar cliente no Asaas");
  return cliente.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, email, cpfCnpj, mobilePhone, valor, vencimento, descricao, externalReference } = req.body || {};
  if (!nome || !email || !valor || !vencimento) {
    return res.status(400).json({ error: "Campos obrigatórios: nome, email, valor, vencimento" });
  }

  try {
    const cfg = await getConfig();
    const apiKey = cfg.apiKey || process.env.ASAAS_API_KEY;
    const sandbox = cfg.sandbox ?? (process.env.ASAAS_SANDBOX === "true");

    if (!apiKey) return res.status(500).json({ error: "Chave da API Asaas não configurada. Acesse /admin → Integrações." });

    const base = sandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3";

    const headers = {
      "Content-Type": "application/json",
      "access_token": apiKey,
    };

    const customerId = await buscarOuCriarCliente(base, headers, { nome, email, cpfCnpj, mobilePhone });

    const chargeRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: Number(valor),
        dueDate: vencimento,
        description: descricao || `Plano Novu — ${vencimento}`,
        externalReference: externalReference || "",
        postalService: false,
      }),
    });

    const charge = await chargeRes.json();
    if (!charge.id) throw new Error(charge.errors?.[0]?.description || "Erro ao criar cobrança no Asaas");

    let pixQrCode = null, pixCopiaECola = null;
    try {
      const pixRes = await fetch(`${base}/payments/${charge.id}/pixQrCode`, { headers });
      const pix = await pixRes.json();
      pixQrCode = pix.encodedImage || null;
      pixCopiaECola = pix.payload || null;
    } catch {}

    return res.status(200).json({
      asaasId: charge.id,
      customerId,
      linkPagamento: charge.invoiceUrl,
      boletoUrl: charge.bankSlipUrl || null,
      pixQrCode,
      pixCopiaECola,
      status: charge.status,
    });
  } catch (err) {
    console.error("[asaas/criar-cobranca]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
