import { useState, useEffect } from "react";
import { onAuthStateChangedListener, buscarDadosTerapeuta } from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [terapeuta, setTerapeuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (usuarioAtual) => {
      if (usuarioAtual) {
        setUser(usuarioAtual);
        try {
          const dadosTerapeuta = await buscarDadosTerapeuta(usuarioAtual.uid);
          setTerapeuta(dadosTerapeuta);
        } catch (err) {
          setErro(err.message);
        }
      } else {
        setUser(null);
        setTerapeuta(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, terapeuta, loading, erro };
};
