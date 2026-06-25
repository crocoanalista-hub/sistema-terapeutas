import { db } from "./firebaseConfig";
import {
  collection, addDoc, updateDoc, doc, getDocs, query, where,
} from "firebase/firestore";

export const criarSala = async (workspaceId, dados) => {
  const ref = await addDoc(collection(db, "salas"), {
    workspaceId,
    nome: dados.nome.trim(),
    cor: dados.cor || "#4285f4",
    ativo: true,
    criadoEm: new Date(),
  });
  return ref.id;
};

export const listarSalas = async (workspaceId) => {
  const q = query(
    collection(db, "salas"),
    where("workspaceId", "==", workspaceId),
    where("ativo", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
};

export const atualizarSala = async (id, dados) =>
  updateDoc(doc(db, "salas", id), dados);

export const excluirSala = async (id) =>
  updateDoc(doc(db, "salas", id), { ativo: false });
