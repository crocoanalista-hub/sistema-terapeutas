import { db } from "./firebaseConfig";
import {
  collection, updateDoc, doc, getDocs, query, where,
  setDoc, getDoc, deleteDoc,
} from "firebase/firestore";

// Owner creates an invite for a professional (by email)
export const convidarProfissional = async (workspaceId, dados) => {
  await setDoc(doc(db, "convites", dados.email), {
    workspaceId,
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    especialidade: dados.especialidade || "",
    cor: dados.cor || "#9c27b0",
    criadoEm: new Date(),
  });
};

// Called during registration to check if there's an invite waiting
export const buscarConvite = async (email) => {
  const snap = await getDoc(doc(db, "convites", email.trim().toLowerCase()));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const deletarConvite = async (email) =>
  deleteDoc(doc(db, "convites", email.trim().toLowerCase()));

// List all professionals in this workspace
export const listarProfissionais = async (workspaceId) => {
  const q = query(
    collection(db, "profissionais"),
    where("workspaceId", "==", workspaceId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome));
};

// List pending invites
export const listarConvitesPendentes = async (workspaceId) => {
  const q = query(
    collection(db, "convites"),
    where("workspaceId", "==", workspaceId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const desativarProfissional = async (id) =>
  updateDoc(doc(db, "profissionais", id), { ativo: false });

export const atualizarProfissional = async (id, dados) =>
  updateDoc(doc(db, "profissionais", id), dados);
