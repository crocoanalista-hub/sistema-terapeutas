import { useState, useEffect } from "react";
import { onAuthStateChangedListener } from "../services/authService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [terapeuta, setTerapeuta] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  // "owner" | "profissional"
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (usuarioAtual) => {
      if (usuarioAtual) {
        setUser(usuarioAtual);
        try {
          // Check if owner first
          const terapeutaSnap = await getDoc(doc(db, "terapeutas", usuarioAtual.uid));
          if (terapeutaSnap.exists()) {
            setTerapeuta(terapeutaSnap.data());
            setWorkspaceId(usuarioAtual.uid);
            setRole("owner");
          } else {
            // Check if professional
            const profSnap = await getDoc(doc(db, "profissionais", usuarioAtual.uid));
            if (profSnap.exists()) {
              const profData = profSnap.data();
              setTerapeuta(profData);
              setWorkspaceId(profData.workspaceId);
              setRole("profissional");
            }
          }
        } catch (err) {
          setErro(err.message);
        }
      } else {
        setUser(null);
        setTerapeuta(null);
        setWorkspaceId(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, terapeuta, workspaceId, role, loading, erro };
};
