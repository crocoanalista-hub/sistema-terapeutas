import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  getDoc,
  updateDoc,
  getDocs,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export const criarDocumentoParaAssinar = async (workspaceId, dados) => {
  const ref = await addDoc(collection(db, "documentosParaAssinar"), {
    workspaceId,
    ...dados,
    status: "pendente",
    criadoEm: serverTimestamp(),
  });
  return ref.id;
};

export const buscarDocumentoParaAssinar = async (docId) => {
  const snap = await getDoc(doc(db, "documentosParaAssinar", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const salvarAssinatura = async (docId, assinaturaBase64) => {
  await updateDoc(doc(db, "documentosParaAssinar", docId), {
    assinaturaBase64,
    assinadoEm: new Date(),
    status: "assinado",
    ipAssinante: "",
  });
};

export const listarDocumentosParaAssinar = async (workspaceId) => {
  const q = query(
    collection(db, "documentosParaAssinar"),
    where("workspaceId", "==", workspaceId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
