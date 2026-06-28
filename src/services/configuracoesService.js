import { db, storage } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const buscarConfiguracoes = async (workspaceId) => {
  const snap = await getDoc(doc(db, "configuracoes", workspaceId));
  return snap.exists() ? snap.data() : {};
};

export const salvarConfiguracoes = async (workspaceId, dados) => {
  await setDoc(doc(db, "configuracoes", workspaceId), dados, { merge: true });
};

export const uploadLogo = async (workspaceId, file) => {
  const storageRef = ref(storage, `logos/${workspaceId}/logo`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
