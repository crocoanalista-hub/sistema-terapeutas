import { useState, useEffect } from "react";
import { escutarSolicitacoesPendentes } from "../services/solicitacoesService";

export const useSolicitacoes = (workspaceId) => {
  const [pendentes, setPendentes] = useState([]);

  useEffect(() => {
    if (!workspaceId) return;
    const unsub = escutarSolicitacoesPendentes(workspaceId, setPendentes);
    return () => unsub();
  }, [workspaceId]);

  return { pendentes, total: pendentes.length };
};
