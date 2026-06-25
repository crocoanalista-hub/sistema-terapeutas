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

const sortByDataHora = (a, b) => {
  if (a.data !== b.data) return a.data.localeCompare(b.data);
  return (a.hora || "").localeCompare(b.hora || "");
};

// Marcar nova sessão
export const marcarSessao = async (terapeutaId, pacienteId, dadosSessao) => {
  try {
    const docRef = await addDoc(collection(db, "agendamentos"), {
      terapeutaId,
      pacienteId,
      data: dadosSessao.data,
      hora: dadosSessao.hora,
      duracao: dadosSessao.duracao || 60,
      valor: dadosSessao.valor || null,
      linkAtendimento: dadosSessao.linkAtendimento || null,
      status: "confirmado",
      pago: false,
      observacoes: dadosSessao.observacoes || "",
      dataCriacao: new Date(),
    });
    return docRef.id;
  } catch (erro) {
    throw new Error("Erro ao marcar sessão: " + erro.message);
  }
};

// Listar todos os agendamentos do terapeuta
export const listarAgendamentos = async (terapeutaId) => {
  try {
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId)
    );
    const snap = await getDocs(q);
    const agendamentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return agendamentos.sort(sortByDataHora);
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
      where("pacienteId", "==", pacienteId)
    );
    const snap = await getDocs(q);
    const agendamentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return agendamentos.sort((a, b) => b.data.localeCompare(a.data));
  } catch (erro) {
    throw new Error("Erro ao listar agendamentos do paciente: " + erro.message);
  }
};

// Buscar agendamento por ID
export const buscarAgendamento = async (agendamentoId) => {
  try {
    const docSnap = await getDoc(doc(db, "agendamentos", agendamentoId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (erro) {
    throw new Error("Erro ao buscar agendamento: " + erro.message);
  }
};

// Reagendar sessão
export const reagendarSessao = async (agendamentoId, novaData, novaHora) => {
  try {
    await updateDoc(doc(db, "agendamentos", agendamentoId), {
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
    await updateDoc(doc(db, "agendamentos", agendamentoId), {
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
    await updateDoc(doc(db, "agendamentos", agendamentoId), {
      status: "concluído",
      pago: false,
      observacoesConclusao: observacoes,
      dataConclusao: new Date(),
    });
  } catch (erro) {
    throw new Error("Erro ao marcar como concluído: " + erro.message);
  }
};

// Marcar falta
export const marcarFalta = async (agendamentoId) => {
  try {
    await updateDoc(doc(db, "agendamentos", agendamentoId), {
      status: "falta",
      dataFalta: new Date(),
    });
  } catch (erro) {
    throw new Error("Erro ao marcar falta: " + erro.message);
  }
};

// Marcar como pago (valorPago pode ser parcial)
export const marcarComoPago = async (agendamentoId, valorPago = null) => {
  try {
    const update = { pago: true, dataPagamento: new Date() };
    if (valorPago !== null) update.valorPago = valorPago;
    await updateDoc(doc(db, "agendamentos", agendamentoId), update);
  } catch (erro) {
    throw new Error("Erro ao marcar como pago: " + erro.message);
  }
};

// Criar múltiplas sessões de um pacote
export const marcarSessoesEmLote = async (terapeutaId, pacienteId, sessoes, infoPacote) => {
  try {
    const pacoteId = `pac_${Date.now()}`;
    await Promise.all(
      sessoes.map((s) =>
        addDoc(collection(db, "agendamentos"), {
          terapeutaId,
          pacienteId,
          data: s.data,
          hora: s.hora,
          duracao: s.duracao || 60,
          valor: infoPacote.valorPorSessao || null,
          valorPacote: infoPacote.valorTotal || null,
          numSessoesPacote: infoPacote.numSessoes || null,
          pacoteQuitado: infoPacote.quitado || false,
          pacoteId,
          pago: infoPacote.quitado || false,
          linkAtendimento: s.linkAtendimento || null,
          observacoes: s.observacoes || "",
          status: "confirmado",
          dataCriacao: new Date(),
        })
      )
    );
  } catch (erro) {
    throw new Error("Erro ao criar sessões do pacote: " + erro.message);
  }
};

// Listar sessões concluídas (para financeiro)
export const listarSessoesConcluidas = async (terapeutaId) => {
  try {
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId),
      where("status", "==", "concluído")
    );
    const snap = await getDocs(q);
    const sessoes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return sessoes.sort((a, b) => b.data.localeCompare(a.data));
  } catch (erro) {
    throw new Error("Erro ao listar sessões concluídas: " + erro.message);
  }
};

// Histórico de atendimentos
export const historicoAtendimentos = async (terapeutaId, pacienteId = null) => {
  try {
    let q;
    if (pacienteId) {
      q = query(
        collection(db, "agendamentos"),
        where("terapeutaId", "==", terapeutaId),
        where("pacienteId", "==", pacienteId),
        where("status", "==", "concluído")
      );
    } else {
      q = query(
        collection(db, "agendamentos"),
        where("terapeutaId", "==", terapeutaId),
        where("status", "==", "concluído")
      );
    }
    const snap = await getDocs(q);
    const atendimentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return atendimentos.sort((a, b) => b.data.localeCompare(a.data));
  } catch (erro) {
    throw new Error("Erro ao buscar histórico: " + erro.message);
  }
};

// Listar agendamentos por período
export const listarAgendamentosPorPeriodo = async (terapeutaId, dataInicio, dataFim) => {
  try {
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId)
    );
    const snap = await getDocs(q);
    const agendamentos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.data >= dataInicio && a.data <= dataFim);
    return agendamentos.sort(sortByDataHora);
  } catch (erro) {
    throw new Error("Erro ao listar agendamentos por período: " + erro.message);
  }
};
