import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  getDoc,
} from "firebase/firestore";

// Adicionar novo paciente
export const adicionarPaciente = async (terapeutaId, dadosPaciente) => {
  try {
    const docRef = await addDoc(collection(db, "pacientes"), {
      ...dadosPaciente,
      terapeutaId: terapeutaId,
      dataCriacao: new Date(),
      ativo: true,
    });
    return docRef.id;
  } catch (erro) {
    throw new Error("Erro ao adicionar paciente: " + erro.message);
  }
};

// Listar todos os pacientes do terapeuta
export const listarPacientes = async (terapeutaId) => {
  try {
    const q = query(
      collection(db, "pacientes"),
      where("terapeutaId", "==", terapeutaId),
      where("ativo", "==", true)
    );
    const querySnapshot = await getDocs(q);
    const pacientes = [];
    querySnapshot.forEach((doc) => {
      pacientes.push({ id: doc.id, ...doc.data() });
    });
    return pacientes.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (erro) {
    throw new Error("Erro ao listar pacientes: " + erro.message);
  }
};

// Buscar paciente por ID
export const buscarPaciente = async (pacienteId) => {
  try {
    const docRef = doc(db, "pacientes", pacienteId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (erro) {
    throw new Error("Erro ao buscar paciente: " + erro.message);
  }
};

// Atualizar dados do paciente
export const atualizarPaciente = async (pacienteId, dadosAtualizados) => {
  try {
    const docRef = doc(db, "pacientes", pacienteId);
    await updateDoc(docRef, dadosAtualizados);
  } catch (erro) {
    throw new Error("Erro ao atualizar paciente: " + erro.message);
  }
};

// Deletar paciente (soft delete - apenas marca como inativo)
export const deletarPaciente = async (pacienteId) => {
  try {
    const docRef = doc(db, "pacientes", pacienteId);
    await updateDoc(docRef, { ativo: false });
  } catch (erro) {
    throw new Error("Erro ao deletar paciente: " + erro.message);
  }
};

// Buscar paciente por email
export const buscarPacientePorEmail = async (terapeutaId, email) => {
  try {
    const q = query(
      collection(db, "pacientes"),
      where("terapeutaId", "==", terapeutaId),
      where("email", "==", email),
      where("ativo", "==", true)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (erro) {
    throw new Error("Erro ao buscar paciente: " + erro.message);
  }
};
