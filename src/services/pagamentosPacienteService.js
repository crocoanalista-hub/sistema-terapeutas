import { db } from "./firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

// Configurações financeiras por paciente
export const buscarConfigFinanceira = async (pacienteId) => {
  const snap = await getDoc(doc(db, "configFinanceiraPaciente", pacienteId));
  return snap.exists() ? snap.data() : {
    valorSessao: "",
    desconto: 0,
    metodoPagamento: "Pix",
    tipoCobranca: "sessao", // "sessao" | "pacote_prepago"
    saldoSessoes: 0,
    totalSessoesPacote: 0,
    observacoes: "",
  };
};

export const salvarConfigFinanceira = async (pacienteId, dados) => {
  await setDoc(doc(db, "configFinanceiraPaciente", pacienteId), {
    ...dados,
    atualizadoEm: new Date(),
  }, { merge: true });
};

// Pacote pré-pago: adicionar sessões ao saldo
export const adicionarSessoesPacote = async (pacienteId, quantidade) => {
  await updateDoc(doc(db, "configFinanceiraPaciente", pacienteId), {
    saldoSessoes: increment(quantidade),
    totalSessoesPacote: increment(quantidade),
  });
};

// ── Assinatura mensal ────────────────────────────────────────

// Calcula a próxima data de vencimento a partir de um dia do mês
export const calcularProximoVencimento = (diaVencimento, base = new Date()) => {
  const hoje = new Date(base);
  const dia = Number(diaVencimento);
  // Tenta este mês
  let candidata = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  // Se já passou (ou é hoje), vai para o próximo mês
  if (candidata <= hoje) {
    candidata = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
  }
  return candidata.toISOString().slice(0, 10); // YYYY-MM-DD
};

export const statusAssinatura = (assinatura) => {
  if (!assinatura?.ativa) return "inativa";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(assinatura.proximoVencimento + "T00:00");
  const diff = Math.floor((venc - hoje) / 86400000);
  if (diff < 0)  return "vencido";
  if (diff <= 5) return "vencendo";
  return "em_dia";
};

export const salvarAssinatura = async (pacienteId, assinatura) => {
  await setDoc(doc(db, "configFinanceiraPaciente", pacienteId), {
    assinatura,
    atualizadoEm: new Date(),
  }, { merge: true });
};

export const marcarAssinaturaPaga = async (pacienteId, diaVencimento) => {
  const hoje = new Date();
  // Próximo vencimento é diaVencimento do próximo mês
  const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, Number(diaVencimento));
  await setDoc(doc(db, "configFinanceiraPaciente", pacienteId), {
    assinatura: {
      ultimoPagamento: hoje.toISOString().slice(0, 10),
      proximoVencimento: prox.toISOString().slice(0, 10),
    },
    atualizadoEm: new Date(),
  }, { merge: true });
};

// Debitar uma sessão do saldo
export const debitarSessaoPacote = async (pacienteId) => {
  const cfg = await buscarConfigFinanceira(pacienteId);
  if (cfg.saldoSessoes <= 0) throw new Error("Saldo de sessões esgotado.");
  await updateDoc(doc(db, "configFinanceiraPaciente", pacienteId), {
    saldoSessoes: increment(-1),
  });
};
