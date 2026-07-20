import { auth, db } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// Registrar novo terapeuta (ou profissional, se houver convite)
export const registrarTerapeuta = async (email, senha, nome, slug = "") => {
  try {
    const resultado = await createUserWithEmailAndPassword(auth, email, senha);
    const user = resultado.user;

    // Check for professional invite
    const emailNorm = email.trim().toLowerCase();
    const conviteSnap = await getDoc(doc(db, "convites", emailNorm));
    if (conviteSnap.exists()) {
      const convite = conviteSnap.data();
      await setDoc(doc(db, "profissionais", user.uid), {
        uid: user.uid,
        nome: convite.nome || nome,
        email: emailNorm,
        workspaceId: convite.workspaceId,
        especialidade: convite.especialidade || "",
        cor: convite.cor || "#9c27b0",
        ativo: true,
        dataCriacao: new Date(),
      });
      await deleteDoc(doc(db, "convites", emailNorm));
    } else {
      // Busca config do trial salva pelo admin (fallback nos defaults)
      let cfgTrial = { dias: 10, pacientes: 5, agendamentos: 10, documentos: 2 };
      try {
        const cfgSnap = await getDoc(doc(db, "config", "trial"));
        if (cfgSnap.exists()) cfgTrial = { ...cfgTrial, ...cfgSnap.data() };
      } catch {}

      const trialInicio = new Date();
      const trialExpira = new Date(trialInicio);
      trialExpira.setDate(trialExpira.getDate() + Number(cfgTrial.dias));
      await setDoc(doc(db, "terapeutas", user.uid), {
        uid: user.uid,
        nome,
        email: emailNorm,
        slug: slug.toLowerCase() || null,
        dataCriacao: trialInicio,
        perfil: "terapeuta",
        plano: "trial",
        trialInicio,
        trialExpira,
        limites: {
          pacientes: Number(cfgTrial.pacientes),
          agendamentos: Number(cfgTrial.agendamentos),
          documentos: Number(cfgTrial.documentos),
        },
        documentosGerados: 0,
      });
    }

    return user;
  } catch (erro) {
    throw new Error(erro.message);
  }
};

// Registra o último acesso do terapeuta/profissional (usado no Admin > Atividade)
const registrarUltimoAcesso = async (uid) => {
  const terapeutaRef = doc(db, "terapeutas", uid);
  const terapeutaSnap = await getDoc(terapeutaRef);
  if (terapeutaSnap.exists()) {
    await setDoc(terapeutaRef, { ultimoAcesso: serverTimestamp() }, { merge: true });
    return;
  }
  const profRef = doc(db, "profissionais", uid);
  const profSnap = await getDoc(profRef);
  if (profSnap.exists()) {
    await setDoc(profRef, { ultimoAcesso: serverTimestamp() }, { merge: true });
  }
};

// Login
export const login = async (email, senha) => {
  try {
    const resultado = await signInWithEmailAndPassword(auth, email, senha);
    registrarUltimoAcesso(resultado.user.uid).catch(() => {});
    return resultado.user;
  } catch (erro) {
    throw new Error(erro.message);
  }
};

// Logout
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (erro) {
    throw new Error(erro.message);
  }
};

// Redefinir senha por e-mail
export const redefinirSenha = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

// Monitorar estado de autenticação
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Buscar dados do terapeuta logado
export const buscarDadosTerapeuta = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, "terapeutas", uid));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (erro) {
    throw new Error(erro.message);
  }
};
