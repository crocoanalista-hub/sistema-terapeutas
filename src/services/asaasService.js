export const criarCobrancaAsaas = async ({ nome, email, cpfCnpj, mobilePhone, valor, vencimento, descricao, externalReference }) => {
  const res = await fetch("/api/asaas/criar-cobranca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, cpfCnpj, mobilePhone, valor, vencimento, descricao, externalReference }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao criar cobrança no Asaas");
  return data;
};
