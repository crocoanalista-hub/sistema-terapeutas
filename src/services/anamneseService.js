import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

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
