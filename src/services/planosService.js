import { db } from "./firebaseConfig";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, addDoc, updateDoc } from "firebase/firestore";

// ── Planos ───────────────────────────────────────────────────
export const listarPlanos = async () => {
  const snap = await getDocs(collection(db, "planos"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
};

export const salvarPlano = async (plano) => {
  if (plano.id) {
    const { id, ...dados } = plano;
    await setDoc(doc(db, "planos", id), dados, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, "planos"), plano);
    return ref.id;
  }
};

export const excluirPlano = async (id) => {
  await deleteDoc(doc(db, "planos", id));
};

// ── Membro Pioneiro ──────────────────────────────────────────
export const setMembroPioneiro = async (terapeutaId, valor) => {
  await updateDoc(doc(db, "terapeutas", terapeutaId), { membroPioneiro: valor });
};
