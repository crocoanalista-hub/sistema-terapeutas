import { db, storage } from "./firebaseConfig";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export const uploadFotoEvolucao = async (terapeutaId, pacienteId, arquivo) => {
  const ext = arquivo.name.split(".").pop();
  const nome = `evolucoes/${terapeutaId}/${pacienteId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, nome);
  await uploadBytes(storageRef, arquivo);
  return await getDownloadURL(storageRef);
};

export const deletarFotoEvolucao = async (url) => {
  try {
    await deleteObject(ref(storage, url));
  } catch {}
};

export const adicionarEvolucao = async (terapeutaId, pacienteId, dados) => {
  const payload = {
    terapeutaId,
    pacienteId,
    data: dados.data,
    conteudo: dados.conteudo || "",
    dataCriacao: new Date(),
  };

  // Campos novos — só inclui se houver valor
  if (dados.tipo)        payload.tipo        = dados.tipo;
  if (dados.humor)       payload.humor       = dados.humor;
  if (dados.queixa)      payload.queixa      = dados.queixa;
  if (dados.intervencao) payload.intervencao = dados.intervencao;
  if (dados.plano)       payload.plano       = dados.plano;

  if (dados.fotoUrl) payload.fotoUrl = dados.fotoUrl;

  const docRef = await addDoc(collection(db, "evolucoes"), payload);
  return docRef.id;
};

export const listarEvolucoes = async (terapeutaId, pacienteId) => {
  const q = query(
    collection(db, "evolucoes"),
    where("terapeutaId", "==", terapeutaId),
    where("pacienteId", "==", pacienteId)
  );
  const snap = await getDocs(q);
  const evolucoes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return evolucoes.sort((a, b) => b.data.localeCompare(a.data));
};

export const atualizarEvolucao = async (id, dados) => {
  const payload = {
    data:       dados.data       ?? "",
    conteudo:   dados.conteudo   ?? "",
    dataAtualizacao: new Date(),
  };

  // Campos novos — salva mesmo string vazia para poder limpar
  if ("tipo"        in dados) payload.tipo        = dados.tipo        || "";
  if ("humor"       in dados) payload.humor       = dados.humor       || null;
  if ("queixa"      in dados) payload.queixa      = dados.queixa      || "";
  if ("intervencao" in dados) payload.intervencao = dados.intervencao || "";
  if ("plano"       in dados) payload.plano       = dados.plano       || "";
  if ("fotoUrl"     in dados) payload.fotoUrl     = dados.fotoUrl     || null;

  await updateDoc(doc(db, "evolucoes", id), payload);
};

export const deletarEvolucao = async (id) => {
  await deleteDoc(doc(db, "evolucoes", id));
};
