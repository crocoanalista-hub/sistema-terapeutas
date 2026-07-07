const ASAAS_BASE = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

const headers = () => ({
  "Content-Type": "application/json",
  "access_token": process.env.ASAAS_API_KEY,
});

async function buscarOuCriarCliente({ nome, email, cpfCnpj, mobilePhone }) {
  // Busca por CPF/CNPJ primeiro
  if (cpfCnpj) {
    const r = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpfCnpj.replace(/\D/g, "")}`, { headers: headers() });
    const data = await r.json();
    if (data.data?.length > 0) return data.data[0].id;
  }

  // Cria novo cliente
  const body = { name: nome, email };
  if (cpfCnpj) body.cpfCnpj = cpfCnpj.replace(/\D/g, "");
  if (mobilePhone) body.mobilePhone = mobilePhone.replace(/\D/g, "");

  const r = await fetch(`${ASAAS_BASE}/customers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const cliente = await r.json();
  if (!cliente.id) throw new Error(cliente.errors?.[0]?.description || "Erro ao criar cliente no Asaas");
  return cliente.id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, email, cpfCnpj, mobilePhone, valor, vencimento, descricao, externalReference } = req.body;

  if (!nome || !email || !valor || !vencimento) {
    return res.status(400).json({ error: "Campos obrigatórios: nome, email, valor, vencimento" });
  }

  try {
    const customerId = await buscarOuCriarCliente({ nome, email, cpfCnpj, mobilePhone });

    const chargeRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED", // usuário escolhe PIX, boleto ou cartão na tela do Asaas
        value: Number(valor),
        dueDate: vencimento,
        description: descricao || `Plano Novu — ${vencimento}`,
        externalReference: externalReference || "",
        postalService: false,
      }),
    });

    const charge = await chargeRes.json();
    if (!charge.id) throw new Error(charge.errors?.[0]?.description || "Erro ao criar cobrança no Asaas");

    // Busca QR Code PIX separadamente
    let pixQrCode = null, pixCopiaECola = null;
    try {
      const pixRes = await fetch(`${ASAAS_BASE}/payments/${charge.id}/pixQrCode`, { headers: headers() });
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
}
