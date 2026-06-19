import { auth, db } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Registrar novo terapeuta
export const registrarTerapeuta = async (email, senha, nome) => {
  try {
    const resultado = await createUserWithEmailAndPassword(auth, email, senha);
    const user = resultado.user;

    // Salvar dados do terapeuta no Firestore
    await setDoc(doc(db, "terapeutas", user.uid), {
      uid: user.uid,
      nome: nome,
      email: email,
      dataCriacao: new Date(),
      perfil: "terapeuta",
    });

    return user;
  } catch (erro) {
    throw new Error(erro.message);
  }
};

// Login
export const login = async (email, senha) => {
  try {
    const resultado = await signInWithEmailAndPassword(auth, email, senha);
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

// Monitorar estado de autenticação
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Buscar dados do terapeuta logado
export const buscarDadosTerapeuta = async (uid) => {
  try {
    const docRef = doc(db, "terapeutas", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (erro) {
    throw new Error(erro.message);
  }
};
