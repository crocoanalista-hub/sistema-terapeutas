import { db } from "./firebaseConfig";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";

// Busca paciente pelo e-mail dentro de um workspace
export const buscarPacientePorEmail = async (workspaceId, email) => {
  const q = query(
    collection(db, "pacientes"),
    where("terapeutaId", "==", workspaceId),
    where("email", "==", email.trim().toLowerCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Gera e salva código de acesso temporário (6 dígitos, expira em 15min)
export const gerarCodigoAcesso = async (workspaceId, pacienteId, email) => {
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await addDoc(collection(db, "portalCodigos"), {
    workspaceId,
    pacienteId,
    email: email.trim().toLowerCase(),
    codigo,
    expira,
    usado: false,
    criadoEm: new Date(),
  });
  return codigo;
};

// Valida código de acesso
export const validarCodigo = async (workspaceId, email, codigo) => {
  const q = query(
    collection(db, "portalCodigos"),
    where("workspaceId", "==", workspaceId),
    where("email", "==", email.trim().toLowerCase()),
    where("codigo", "==", codigo),
    where("usado", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const registro = { id: snap.docs[0].id, ...snap.docs[0].data() };
  const expira = registro.expira?.toDate ? registro.expira.toDate() : new Date(registro.expira);
  if (new Date() > expira) return null;
  // Marca como usado
  await updateDoc(doc(db, "portalCodigos", registro.id), { usado: true });
  return registro.pacienteId;
};

// Lista agendamentos do paciente
export const listarAgendamentosPacientePortal = async (workspaceId, pacienteId) => {
  const q = query(
    collection(db, "agendamentos"),
    where("terapeutaId", "==", workspaceId),
    where("pacienteId", "==", pacienteId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.data > a.data ? 1 : -1));
};

// Lista documentos compartilhados com o paciente
export const listarDocumentosPortal = async (workspaceId, pacienteId) => {
  const q = query(
    collection(db, "documentos"),
    where("terapeutaId", "==", workspaceId),
    where("pacienteId", "==", pacienteId),
    where("compartilhado", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
};

// Cancelar agendamento pelo paciente
export const cancelarAgendamentoPortal = async (agendamentoId) => {
  await updateDoc(doc(db, "agendamentos", agendamentoId), { status: "cancelado" });
};

// Busca workspace pelo slug
export const buscarWorkspacePorSlug = async (slug) => {
  const q = query(collection(db, "terapeutas"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};
