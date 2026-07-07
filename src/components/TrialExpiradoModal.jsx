import React from "react";
import { usePlano } from "../hooks/usePlano";
import { useAuth } from "../hooks/useAuth";
import "../styles/trial-expirado.css";

export default function TrialExpiradoModal() {
  const { workspaceId } = useAuth();
  const { planoInfo, trialExpirado, loading } = usePlano(workspaceId);

  if (loading || !planoInfo) return null;
  if (planoInfo.plano === "ativo") return null;
  if (!trialExpirado && planoInfo.plano !== "bloqueado") return null;

  const bloqueado = planoInfo.plano === "bloqueado";

  return (
    <div className="texp-overlay">
      <div className="texp-modal">
        <div className="texp-icone">{bloqueado ? "🔒" : "⏰"}</div>

        <h2 className="texp-titulo">
          {bloqueado ? "Conta bloqueada" : "Seu período gratuito encerrou"}
        </h2>

        <p className="texp-desc">
          {bloqueado
            ? "Sua conta foi bloqueada. Entre em contato com o suporte para regularizar e retomar o acesso."
            : "Você aproveitou o trial e agora é hora de continuar! Fale com a gente para ativar seu plano e manter todos os seus dados."}
        </p>

        {!bloqueado && (
          <div className="texp-beneficios">
            <div className="texp-beneficio">✅ Todos os seus dados preservados</div>
            <div className="texp-beneficio">✅ Clientes, agenda e documentos intactos</div>
            <div className="texp-beneficio">✅ Sem limite de cadastros</div>
            <div className="texp-beneficio">✅ Suporte dedicado</div>
          </div>
        )}

        <a
          href="https://wa.me/5511999999999?text=Olá!%20Quero%20ativar%20meu%20plano%20no%20Novu."
          target="_blank"
          rel="noreferrer"
          className="texp-btn-whatsapp"
        >
          💬 Falar pelo WhatsApp
        </a>

        <a href="mailto:igorcroco@gmail.com" className="texp-btn-email">
          ✉️ Enviar e-mail
        </a>

        <p className="texp-rodape">
          Respondemos em até 24h · seus dados ficam seguros
        </p>
      </div>
    </div>
  );
}
