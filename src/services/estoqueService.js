import { db } from "./firebaseConfig";
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";

export const listarItens = async (workspaceId) => {
  const q = query(collection(db, "estoqueItens"), where("workspaceId", "==", workspaceId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
};

export const adicionarItem = async (workspaceId, dados) => {
  const ref = await addDoc(collection(db, "estoqueItens"), {
    ...dados,
    workspaceId,
    quantidade: Number(dados.quantidade || 0),
    quantidadeMinima: Number(dados.quantidadeMinima || 0),
    criadoEm: new Date(),
  });
  return ref.id;
};

export const atualizarItem = async (id, dados) =>
  updateDoc(doc(db, "estoqueItens", id), dados);

export const excluirItem = async (id) =>
  deleteDoc(doc(db, "estoqueItens", id));

export const registrarMovimentacao = async (workspaceId, itemId, itemNome, tipo, quantidade, observacao = "") => {
  // tipo: "entrada" | "saída" | "ajuste"
  await addDoc(collection(db, "estoqueMovimentacoes"), {
    workspaceId,
    itemId,
    itemNome,
    tipo,
    quantidade: Number(quantidade),
    observacao,
    data: new Date().toISOString().slice(0, 10),
    criadoEm: new Date(),
  });
  // Atualiza quantidade no item
  const item = (await getDocs(query(
    collection(db, "estoqueItens"), where("workspaceId", "==", workspaceId)
  ))).docs.find(d => d.id === itemId);
  if (item) {
    const atual = item.data().quantidade || 0;
    let nova;
    if (tipo === "entrada")  nova = atual + Number(quantidade);
    else if (tipo === "saída") nova = Math.max(0, atual - Number(quantidade));
    else nova = Number(quantidade); // ajuste
    await updateDoc(doc(db, "estoqueItens", itemId), { quantidade: nova });
  }
};

export const listarMovimentacoes = async (workspaceId) => {
  const q = query(
    collection(db, "estoqueMovimentacoes"),
    where("workspaceId", "==", workspaceId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
};
