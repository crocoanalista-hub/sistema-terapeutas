import { db } from "./firebaseConfig";
import {
  collection, updateDoc, doc, getDocs, query, where,
  setDoc, getDoc, deleteDoc, addDoc,
} from "firebase/firestore";

// Gera um link de cadastro com token único (sem exigir e-mail)
export const criarLinkProfissional = async (workspaceId, dados) => {
  const token = `prof_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await setDoc(doc(db, "convites", token), {
    workspaceId,
    nome: dados.nome.trim(),
    especialidade: dados.especialidade || "",
    cor: dados.cor || "#9c27b0",
    token,
    criadoEm: new Date(),
  });
  return token;
};

// Busca convite pelo token (usado no Registro)
export const buscarConvitePorToken = async (token) => {
  const snap = await getDoc(doc(db, "convites", token));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Mantida para compatibilidade (Registro antigo por e-mail)
export const buscarConvite = async (email) => {
  const q = query(collection(db, "convites"), where("email", "==", email.trim().toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const deletarConvite = async (token) =>
  deleteDoc(doc(db, "convites", token));

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

// List pending invites (links não utilizados)
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

// ─── Procedimentos (array dentro do doc do profissional) ──────────────────────

const uidProc = () => `proc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const salvarProcedimentos = async (profissionalId, procedimentos) =>
  updateDoc(doc(db, "profissionais", profissionalId), { procedimentos });

export const adicionarProcedimento = async (profissionalId, proc, listAtual = []) => {
  const novo = { id: uidProc(), ...proc };
  await updateDoc(doc(db, "profissionais", profissionalId), {
    procedimentos: [...listAtual, novo],
  });
  return novo;
};

export const removerProcedimento = async (profissionalId, procId, listAtual = []) =>
  updateDoc(doc(db, "profissionais", profissionalId), {
    procedimentos: listAtual.filter(p => p.id !== procId),
  });

export const editarProcedimento = async (profissionalId, proc, listAtual = []) =>
  updateDoc(doc(db, "profissionais", profissionalId), {
    procedimentos: listAtual.map(p => p.id === proc.id ? proc : p),
  });
