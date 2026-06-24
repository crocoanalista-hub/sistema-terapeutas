import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

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
