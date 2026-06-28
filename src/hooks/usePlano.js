import { useState, useEffect, useCallback } from "react";
import { buscarPlano, buscarUsage, verificarPermissao, LIMITES_TRIAL, TRIAL_DIAS } from "../services/planoService";

export const usePlano = (workspaceId) => {
  const [planoInfo, setPlanoInfo] = useState(null);
  const [usage, setUsage] = useState({ pacientes: 0, agendamentos: 0, documentos: 0 });
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [info, uso] = await Promise.all([buscarPlano(workspaceId), buscarUsage(workspaceId)]);
      setPlanoInfo(info);
      setUsage(uso);
    } catch {}
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { carregar(); }, [carregar]);

  const trialExpirado = planoInfo?.plano === "trial" && planoInfo?.trialExpira && new Date() > planoInfo.trialExpira;

  const diasRestantes = (() => {
    if (!planoInfo?.trialExpira || planoInfo.plano !== "trial") return null;
    const diff = planoInfo.trialExpira - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const limites = planoInfo?.plano === "ativo" ? null : (planoInfo?.limites || LIMITES_TRIAL);

  const checar = (tipo) => verificarPermissao(planoInfo, usage, tipo);

  return {
    planoInfo,
    usage,
    limites,
    diasRestantes,
    trialExpirado,
    checar,
    recarregar: carregar,
    loading,
    TRIAL_DIAS,
  };
};
