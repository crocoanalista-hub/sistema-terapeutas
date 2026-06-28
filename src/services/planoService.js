import { db } from "./firebaseConfig";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
} from "firebase/firestore";

export const PLANOS = {
  trial:    { label: "Trial",    cor: "#f9ab00" },
  ativo:    { label: "Ativo",    cor: "#34a853" },
  bloqueado:{ label: "Bloqueado",cor: "#ea4335" },
};

export const LIMITES_TRIAL = {
  pacientes:     5,
  agendamentos:  10,
  documentos:    2,
};

export const TRIAL_DIAS = 10;

// ── Busca dados do plano do terapeuta ────────────────────────
export const buscarPlano = async (workspaceId) => {
  const snap = await getDoc(doc(db, "terapeutas", workspaceId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    plano:        data.plano || "trial",
    trialInicio:  data.trialInicio?.toDate?.() || new Date(data.trialInicio) || new Date(),
    trialExpira:  data.trialExpira?.toDate?.() || new Date(data.trialExpira) || null,
    limites:      data.limites || LIMITES_TRIAL,
  };
};

// ── Conta uso atual ──────────────────────────────────────────
export const buscarUsage = async (workspaceId) => {
  const [pacSnap, agSnap] = await Promise.all([
    getDocs(query(collection(db, "pacientes"), where("terapeutaId", "==", workspaceId))),
    getDocs(query(collection(db, "agendamentos"), where("terapeutaId", "==", workspaceId))),
  ]);
  const terapeutaSnap = await getDoc(doc(db, "terapeutas", workspaceId));
  const documentos = terapeutaSnap.data()?.documentosGerados || 0;
  return {
    pacientes:    pacSnap.size,
    agendamentos: agSnap.size,
    documentos,
  };
};

// ── Verifica se uma ação é permitida ────────────────────────
export const verificarPermissao = (planoInfo, usage, tipo) => {
  if (!planoInfo) return { permitido: false, motivo: "Plano não encontrado." };

  if (planoInfo.plano === "bloqueado") {
    return { permitido: false, motivo: "Conta bloqueada. Entre em contato com o suporte." };
  }
  if (planoInfo.plano === "ativo") {
    return { permitido: true };
  }

  // Trial
  const agora = new Date();
  if (planoInfo.trialExpira && agora > planoInfo.trialExpira) {
    return { permitido: false, motivo: "Seu período gratuito expirou. Entre em contato para ativar o plano completo." };
  }

  const limites = planoInfo.limites || LIMITES_TRIAL;
  const atual = usage?.[tipo] ?? 0;
  const maximo = limites[tipo];
  if (maximo !== undefined && atual >= maximo) {
    const nomes = { pacientes: "pacientes", agendamentos: "agendamentos", documentos: "documentos" };
    return {
      permitido: false,
      motivo: `Limite do período gratuito atingido: ${atual}/${maximo} ${nomes[tipo] || tipo}.`,
    };
  }

  return { permitido: true };
};

// ── Admin: listar todos os terapeutas ────────────────────────
export const listarTodosTerapeutas = async () => {
  const snap = await getDocs(collection(db, "terapeutas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Admin: atualizar plano ───────────────────────────────────
export const atualizarPlano = async (uid, dados) => {
  await updateDoc(doc(db, "terapeutas", uid), dados);
};

// ── Admin: incrementar documentos gerados ───────────────────
export const incrementarDocumentos = async (workspaceId) => {
  const snap = await getDoc(doc(db, "terapeutas", workspaceId));
  const atual = snap.data()?.documentosGerados || 0;
  await updateDoc(doc(db, "terapeutas", workspaceId), { documentosGerados: atual + 1 });
};
