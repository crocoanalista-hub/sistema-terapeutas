import { db } from "./firebaseConfig";
import {
  collection, addDoc, getDocs, query, where,
  updateDoc, doc, onSnapshot,
} from "firebase/firestore";

export const criarSolicitacao = async (workspaceId, dados) => {
  const ref = await addDoc(collection(db, "solicitacoes"), {
    workspaceId,
    nome: dados.nome,
    telefone: dados.telefone,
    email: dados.email || "",
    dataPreferida: dados.dataPreferida,
    horaPreferida: dados.horaPreferida,
    mensagem: dados.mensagem || "",
    status: "pendente",
    criadoEm: new Date(),
  });
  return ref.id;
};

export const listarSolicitacoes = async (workspaceId) => {
  const q = query(
    collection(db, "solicitacoes"),
    where("workspaceId", "==", workspaceId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.criadoEm?.toDate?.() || new Date(a.criadoEm);
      const tb = b.criadoEm?.toDate?.() || new Date(b.criadoEm);
      return tb - ta;
    });
};

export const atualizarStatusSolicitacao = async (id, status) => {
  await updateDoc(doc(db, "solicitacoes", id), { status, atualizadoEm: new Date() });
};

// Listener em tempo real — retorna unsubscribe
export const escutarSolicitacoesPendentes = (workspaceId, callback) => {
  const q = query(
    collection(db, "solicitacoes"),
    where("workspaceId", "==", workspaceId),
    where("status", "==", "pendente")
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.criadoEm?.toDate?.() || new Date(a.criadoEm);
        const tb = b.criadoEm?.toDate?.() || new Date(b.criadoEm);
        return tb - ta;
      });
    callback(docs);
  });
};
