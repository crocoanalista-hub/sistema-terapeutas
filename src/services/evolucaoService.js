import { db } from "./firebaseConfig";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, orderBy,
} from "firebase/firestore";

export const adicionarEvolucao = async (terapeutaId, pacienteId, dados) => {
  const docRef = await addDoc(collection(db, "evolucoes"), {
    terapeutaId,
    pacienteId,
    data: dados.data,
    conteudo: dados.conteudo,
    dataCriacao: new Date(),
  });
  return docRef.id;
};

export const listarEvolucoes = async (terapeutaId, pacienteId) => {
  const q = query(
    collection(db, "evolucoes"),
    where("terapeutaId", "==", terapeutaId),
    where("pacienteId", "==", pacienteId),
    orderBy("data", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const atualizarEvolucao = async (id, dados) => {
  await updateDoc(doc(db, "evolucoes", id), {
    ...dados,
    dataAtualizacao: new Date(),
  });
};

export const deletarEvolucao = async (id) => {
  await deleteDoc(doc(db, "evolucoes", id));
};
