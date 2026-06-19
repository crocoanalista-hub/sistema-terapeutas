import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  Timestamp,
} from "firebase/firestore";

// Marcar nova sessão
export const marcarSessao = async (terapeutaId, pacienteId, dadosSessao) => {
  try {
    const docRef = await addDoc(collection(db, "agendamentos"), {
      terapeutaId: terapeutaId,
      pacienteId: pacienteId,
      data: dadosSessao.data,
      hora: dadosSessao.hora,
      duracao: dadosSessao.duracao || 60,
      status: "confirmado",
      observacoes: dadosSessao.observacoes || "",
      dataCriacao: new Date(),
    });
    return docRef.id;
  } catch (erro) {
    throw new Error("Erro ao marcar sessão: " + erro.message);
  }
};

// Listar agendamentos do terapeuta
export const listarAgendamentos = async (terapeutaId) => {
  try {
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId),
      orderBy("data", "asc"),
      orderBy("hora", "asc")
    );
    const querySnapshot = await getDocs(q);
    const agendamentos = [];
    querySnapshot.forEach((doc) => {
      agendamentos.push({ id: doc.id, ...doc.data() });
    });
    return agendamentos;
  } catch (erro) {
    throw new Error("Erro ao listar agendamentos: " + erro.message);
  }
};

// Listar agendamentos de um paciente específico
export const listarAgendamentosPaciente = async (terapeutaId, pacienteId) => {
  try {
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId),
      where("pacienteId", "==", pacienteId),
      orderBy("data", "desc")
    );
    const querySnapshot = await getDocs(q);
    const agendamentos = [];
    querySnapshot.forEach((doc) => {
      agendamentos.push({ id: doc.id, ...doc.data() });
    });
    return agendamentos;
  } catch (erro) {
    throw new Error("Erro ao listar agendamentos do paciente: " + erro.message);
  }
};

// Buscar agendamento por ID
export const buscarAgendamento = async (agendamentoId) => {
  try {
    const docRef = doc(db, "agendamentos", agendamentoId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (erro) {
    throw new Error("Erro ao buscar agendamento: " + erro.message);
  }
};

// Reagendar sessão
export const reagendarSessao = async (agendamentoId, novaData, novaHora) => {
  try {
    const docRef = doc(db, "agendamentos", agendamentoId);
    await updateDoc(docRef, {
      data: novaData,
      hora: novaHora,
      statusAlteracao: "reagendado",
      dataUltimaAlteracao: new Date(),
    });
  } catch (erro) {
    throw new Error("Erro ao reagendar sessão: " + erro.message);
  }
};

// Cancelar sessão
export const cancelarSessao = async (agendamentoId, motivo = "") => {
  try {
    const docRef = doc(db, "agendamentos", agendamentoId);
    await updateDoc(docRef, {
      status: "cancelado",
      motivoCancelamento: motivo,
      dataCancelamento: new Date(),
    });
  } catch (erro) {
    throw new Error("Erro ao cancelar sessão: " + erro.message);
  }
};

// Marcar como concluído
export const marcarComoConcluido = async (agendamentoId, observacoes = "") => {
  try {
    const docRef = doc(db, "agendamentos", agendamentoId);
    await updateDoc(docRef, {
      status: "concluído",
      observacoesConclusao: observacoes,
      dataConclusao: new Date(),
    });
  } catch (erro) {
    throw new Error("Erro ao marcar como concluído: " + erro.message);
  }
};

// Listar agendamentos por período (data inicial e final)
export const listarAgendamentosPorPeriodo = async (
  terapeutaId,
  dataInicio,
  dataFim
) => {
  try {
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId),
      where("data", ">=", dataInicio),
      where("data", "<=", dataFim),
      orderBy("data", "asc")
    );
    const querySnapshot = await getDocs(q);
    const agendamentos = [];
    querySnapshot.forEach((doc) => {
      agendamentos.push({ id: doc.id, ...doc.data() });
    });
    return agendamentos;
  } catch (erro) {
    throw new Error("Erro ao listar agendamentos por período: " + erro.message);
  }
};

// Histórico de atendimentos (sessões concluídas)
export const historicoAtendimentos = async (terapeutaId, pacienteId = null) => {
  try {
    let q;
    if (pacienteId) {
      q = query(
        collection(db, "agendamentos"),
        where("terapeutaId", "==", terapeutaId),
        where("pacienteId", "==", pacienteId),
        where("status", "==", "concluído"),
        orderBy("data", "desc")
      );
    } else {
      q = query(
        collection(db, "agendamentos"),
        where("terapeutaId", "==", terapeutaId),
        where("status", "==", "concluído"),
        orderBy("data", "desc")
      );
    }
    const querySnapshot = await getDocs(q);
    const atendimentos = [];
    querySnapshot.forEach((doc) => {
      atendimentos.push({ id: doc.id, ...doc.data() });
    });
    return atendimentos;
  } catch (erro) {
    throw new Error("Erro ao buscar histórico: " + erro.message);
  }
};
