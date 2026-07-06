import { db } from "./firebaseConfig";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
} from "firebase/firestore";

// Calcula comissões de um mês para todos os profissionais do workspace
export const calcularComissoes = async (workspaceId, mesAno) => {
  // mesAno: "2026-07"
  const [ano, mes] = mesAno.split("-");
  const inicio = `${ano}-${mes}-01`;
  const fim    = new Date(Number(ano), Number(mes), 0).toISOString().slice(0, 10); // último dia

  const q = query(
    collection(db, "agendamentos"),
    where("terapeutaId", "==", workspaceId),
    where("status", "==", "concluído")
  );
  const snap = await getDocs(q);
  const sessoes = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.data >= inicio && s.data <= fim);

  return sessoes;
};

// Busca registros de comissão já salvo no mês
export const buscarComissoesSalvas = async (workspaceId, mesAno) => {
  const q = query(
    collection(db, "comissoes"),
    where("workspaceId", "==", workspaceId),
    where("mesAno", "==", mesAno)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Salva ou atualiza pagamento de comissão de um profissional no mês
export const registrarPagamentoComissao = async (workspaceId, mesAno, profissionalId, dados) => {
  // Verifica se já existe
  const q = query(
    collection(db, "comissoes"),
    where("workspaceId", "==", workspaceId),
    where("mesAno", "==", mesAno),
    where("profissionalId", "==", profissionalId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(doc(db, "comissoes", snap.docs[0].id), {
      ...dados,
      pagoEm: new Date(),
      status: "pago",
    });
    return snap.docs[0].id;
  }
  const ref = await addDoc(collection(db, "comissoes"), {
    workspaceId,
    mesAno,
    profissionalId,
    ...dados,
    pagoEm: new Date(),
    status: "pago",
    criadoEm: new Date(),
  });
  return ref.id;
};
