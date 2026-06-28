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
      observacoes: dadosSessao.observacoes || "",
      salaId: dadosSessao.salaId || null,
      salaNome: dadosSessao.salaNome || null,
      salaCor: dadosSessao.salaCor || null,
      profissionalId: dadosSessao.profissionalId || null,
      profissionalNome: dadosSessao.profissionalNome || null,
      status: "confirmado",
      pago: false,
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

// Marcar como concluído (com pagamento opcional na mesma operação)
export const marcarComoConcluido = async (agendamentoId, observacoes = "", pagamento = null) => {
  try {
    const update = {
      status: "concluído",
      observacoesConclusao: observacoes,
      dataConclusao: new Date(),
    };
    if (pagamento && pagamento.pago) {
      update.pago = true;
      if (pagamento.valor != null) update.valorPago = pagamento.valor;
      update.dataPagamento = new Date();
    } else {
      update.pago = false;
    }
    await updateDoc(doc(db, "agendamentos", agendamentoId), update);
  } catch (erro) {
    throw new Error("Erro ao marcar como concluído: " + erro.message);
  }
};

// Editar sessão já concluída (observações e/ou pagamento)
export const editarSessaoConcluida = async (agendamentoId, dados) => {
  try {
    const update = { observacoesConclusao: dados.observacoesConclusao ?? "" };
    if (dados.pago) {
      update.pago = true;
      if (dados.valorPago != null) update.valorPago = dados.valorPago;
      update.dataPagamento = new Date();
    } else {
      update.pago = false;
      update.valorPago = null;
    }
    await updateDoc(doc(db, "agendamentos", agendamentoId), update);
  } catch (erro) {
    throw new Error("Erro ao editar sessão: " + erro.message);
  }
};

// Marcar falta
export const marcarFalta = async (agendamentoId, opcoes = {}) => {
  try {
    const update = {
      status: "falta",
      dataFalta: new Date(),
    };
    if (opcoes.cobrarTaxa) {
      update.cobrarTaxa = true;
      if (opcoes.valorTaxa != null) update.valorTaxa = opcoes.valorTaxa;
    }
    await updateDoc(doc(db, "agendamentos", agendamentoId), update);
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
          salaId: s.salaId || null,
          salaNome: s.salaNome || null,
          salaCor: s.salaCor || null,
          profissionalId: s.profissionalId || null,
          profissionalNome: s.profissionalNome || null,
          status: "confirmado",
          dataCriacao: new Date(),
        })
      )
    );
  } catch (erro) {
    throw new Error("Erro ao criar sessões do pacote: " + erro.message);
  }
};

// Criar múltiplas sessões de recorrência
export const marcarSessoesRecorrentes = async (terapeutaId, pacienteId, sessoes, recorrenciaId, infoExtra = {}) => {
  try {
    await Promise.all(
      sessoes.map((s) =>
        addDoc(collection(db, "agendamentos"), {
          terapeutaId,
          pacienteId,
          data: s.data,
          hora: s.hora,
          duracao: s.duracao || 60,
          valor: infoExtra.valor || null,
          linkAtendimento: s.linkAtendimento || null,
          observacoes: s.observacoes || "",
          salaId: s.salaId || null,
          salaNome: s.salaNome || null,
          salaCor: s.salaCor || null,
          profissionalId: s.profissionalId || null,
          profissionalNome: s.profissionalNome || null,
          recorrenciaId,
          status: "confirmado",
          pago: false,
          dataCriacao: new Date(),
        })
      )
    );
  } catch (erro) {
    throw new Error("Erro ao criar sessões recorrentes: " + erro.message);
  }
};

// Cancelar todos os agendamentos futuros de uma recorrência
export const cancelarRecorrencia = async (terapeutaId, recorrenciaId) => {
  try {
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}-${String(hoje.getDate()).padStart(2,"0")}`;
    const q = query(
      collection(db, "agendamentos"),
      where("terapeutaId", "==", terapeutaId),
      where("recorrenciaId", "==", recorrenciaId)
    );
    const snap = await getDocs(q);
    const futuros = snap.docs.filter(d => {
      const dado = d.data();
      return dado.data >= hojeStr && dado.status !== "cancelado";
    });
    await Promise.all(
      futuros.map(d =>
        updateDoc(doc(db, "agendamentos", d.id), {
          status: "cancelado",
          motivoCancelamento: "Recorrência cancelada",
          dataCancelamento: new Date(),
        })
      )
    );
  } catch (erro) {
    throw new Error("Erro ao cancelar recorrência: " + erro.message);
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
