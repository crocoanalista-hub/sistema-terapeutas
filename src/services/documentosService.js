import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const salvarTemplatesDoc = async (terapeutaId, templates) => {
  await setDoc(doc(db, "documentosTemplates", terapeutaId), {
    ...templates,
    atualizadoEm: new Date(),
  });
};

export const buscarTemplatesDoc = async (terapeutaId) => {
  const snap = await getDoc(doc(db, "documentosTemplates", terapeutaId));
  return snap.exists() ? snap.data() : null;
};
