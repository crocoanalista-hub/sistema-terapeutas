import { useState, useEffect } from "react";
import { buscarConfiguracoes } from "../services/configuracoesService";

const DEFAULTS = {
  corSidebar: "#1a2535",
  corPrimaria: "#1a73e8",
  nomeClinica: "Consultório",
  logoUrl: null,
};

const aplicarTema = (cfg) => {
  const r = document.documentElement;
  r.style.setProperty("--cor-sidebar", cfg.corSidebar || DEFAULTS.corSidebar);
  r.style.setProperty("--cor-primaria", cfg.corPrimaria || DEFAULTS.corPrimaria);
  // Versões mais claras para hover/fundo
  r.style.setProperty("--cor-primaria-bg", (cfg.corPrimaria || DEFAULTS.corPrimaria) + "18");
};

export const useConfiguracoes = (workspaceId) => {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    buscarConfiguracoes(workspaceId)
      .then((cfg) => {
        const merged = { ...DEFAULTS, ...cfg };
        setConfig(merged);
        aplicarTema(merged);
      })
      .catch(() => aplicarTema(DEFAULTS))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const atualizarConfig = (novosDados) => {
    const merged = { ...config, ...novosDados };
    setConfig(merged);
    aplicarTema(merged);
  };

  return { config, atualizarConfig, loading };
};
