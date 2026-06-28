import { db } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export const buscarWorkspacePorSlug = async (slug) => {
  const q = query(collection(db, "terapeutas"), where("slug", "==", slug.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const verificarSlugDisponivel = async (slug, uidAtual = null) => {
  const workspace = await buscarWorkspacePorSlug(slug);
  if (!workspace) return true;
  if (uidAtual && workspace.id === uidAtual) return true;
  return false;
};

export const slugValido = (slug) => /^[a-z0-9-]{3,30}$/.test(slug);
