import { db } from "./firebaseConfig";
import {
  collection, addDoc, updateDoc,
  doc, getDocs, query, where,
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
    where("ativo", "==", true)
  );
  const snap = await getDocs(q);
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return lista.sort((a, b) => {
    const da = a.dataEntrada?.toDate?.() || new Date(a.dataEntrada);
    const db2 = b.dataEntrada?.toDate?.() || new Date(b.dataEntrada);
    return da - db2;
  });
};

export const removerListaEspera = async (id) => {
  await updateDoc(doc(db, "lista_espera", id), { ativo: false });
};
