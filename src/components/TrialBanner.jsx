import React from "react";
import { usePlano } from "../hooks/usePlano";
import { useAuth } from "../hooks/useAuth";
import "../styles/trial-banner.css";

const TrialBanner = () => {
  const { workspaceId } = useAuth();
  const { planoInfo, usage, limites, diasRestantes, trialExpirado, loading } = usePlano(workspaceId);

  if (loading || !planoInfo) return null;
  if (planoInfo.plano === "ativo") return null;

  if (planoInfo.plano === "bloqueado") {
    return (
      <div className="trial-banner trial-banner--bloqueado">
        🚫 Conta bloqueada. Entre em contato com o suporte para reativar.
      </div>
    );
  }

  if (trialExpirado) {
    return (
      <div className="trial-banner trial-banner--expirado">
        ⏰ Seu período gratuito expirou. Entre em contato para ativar o plano completo.
      </div>
    );
  }

  const urgente = diasRestantes !== null && diasRestantes <= 3;

  return (
    <div className={`trial-banner ${urgente ? "trial-banner--urgente" : "trial-banner--ativo"}`}>
      <span className="trial-banner-titulo">
        {diasRestantes === 0
          ? "⚠️ Último dia do período gratuito"
          : `⏳ ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""} no trial`}
      </span>
      <span className="trial-banner-sep">·</span>
      <span className="trial-banner-uso">
        👥 {usage.pacientes}/{limites?.pacientes} pac.
      </span>
      <span className="trial-banner-sep">·</span>
      <span className="trial-banner-uso">
        📅 {usage.agendamentos}/{limites?.agendamentos} sessões
      </span>
      <span className="trial-banner-sep">·</span>
      <span className="trial-banner-uso">
        📄 {usage.documentos}/{limites?.documentos} docs
      </span>
    </div>
  );
};

export default TrialBanner;
