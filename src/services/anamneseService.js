import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";

// ─── Template do formulário (salvo por terapeuta) ──────────
export const salvarTemplateAnamnese = async (terapeutaId, secoes) => {
  await setDoc(doc(db, "anamneseTemplates", terapeutaId), {
    secoes,
    atualizadoEm: new Date(),
  });
};

export const buscarTemplateAnamnese = async (terapeutaId) => {
  const snap = await getDoc(doc(db, "anamneseTemplates", terapeutaId));
  return snap.exists() ? snap.data() : null;
};

// ─── Respostas por paciente ────────────────────────────────
export const salvarRespostasAnamnese = async (pacienteId, terapeutaId, respostas) => {
  await setDoc(
    doc(db, "anamneses", pacienteId),
    { pacienteId, terapeutaId, respostas, dataAtualizacao: new Date() },
    { merge: true }
  );
};

export const buscarRespostasAnamnese = async (pacienteId) => {
  const snap = await getDoc(doc(db, "anamneses", pacienteId));
  if (!snap.exists()) return {};
  const data = snap.data();
  return data.respostas || {};
};

// ─── Compatibilidade legada ────────────────────────────────
export const salvarAnamnese = async (pacienteId, dados) => {
  await setDoc(
    doc(db, "anamneses", pacienteId),
    { ...dados, pacienteId, dataAtualizacao: new Date() },
    { merge: true }
  );
};

export const buscarAnamnese = async (pacienteId) => {
  const snap = await getDoc(doc(db, "anamneses", pacienteId));
  return snap.exists() ? snap.data() : null;
};

// ─── Links públicos de preenchimento ──────────────────────
export const criarLinkAnamnese = async (workspaceId, pacienteId, pacienteNome) => {
  const ref = await addDoc(collection(db, "anamneseLinks"), {
    workspaceId,
    pacienteId,
    pacienteNome,
    status: "pendente",
    criadoEm: new Date(),
  });
  return ref.id;
};

export const buscarLinkAnamnese = async (token) => {
  const snap = await getDoc(doc(db, "anamneseLinks", token));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const marcarLinkPreenchido = async (token) => {
  await setDoc(doc(db, "anamneseLinks", token), { status: "preenchido", preenchidoEm: new Date() }, { merge: true });
};

export const buscarLinkPorPaciente = async (pacienteId) => {
  const q = query(collection(db, "anamneseLinks"), where("pacienteId", "==", pacienteId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.criadoEm?.toDate?.() || 0) - (a.criadoEm?.toDate?.() || 0));
  return docs[0];
};
