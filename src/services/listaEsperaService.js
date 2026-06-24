import { db } from "./firebaseConfig";
import {
  collection, addDoc, updateDoc,
  doc, getDocs, query, where, orderBy,
} from "firebase/firestore";

export const adicionarListaEspera = async (terapeutaId, dados) => {
  const docRef = await addDoc(collection(db, "lista_espera"), {
    terapeutaId,
    ...dados,
    dataEntrada: new Date(),
    ativo: true,
  });
  return docRef.id;
};

export const listarEspera = async (terapeutaId) => {
  const q = query(
    collection(db, "lista_espera"),
    where("terapeutaId", "==", terapeutaId),
    where("ativo", "==", true),
    orderBy("dataEntrada", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const removerListaEspera = async (id) => {
  await updateDoc(doc(db, "lista_espera", id), { ativo: false });
};
