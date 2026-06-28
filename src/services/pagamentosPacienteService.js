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

// Debitar uma sessão do saldo
export const debitarSessaoPacote = async (pacienteId) => {
  const cfg = await buscarConfigFinanceira(pacienteId);
  if (cfg.saldoSessoes <= 0) throw new Error("Saldo de sessões esgotado.");
  await updateDoc(doc(db, "configFinanceiraPaciente", pacienteId), {
    saldoSessoes: increment(-1),
  });
};
