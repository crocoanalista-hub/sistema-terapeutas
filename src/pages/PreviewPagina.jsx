import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { buscarWorkspacePorSlug } from "../services/slugService";
import { buscarConfiguracoes } from "../services/configuracoesService";
import PaginaProfissional from "./PaginaProfissional/PaginaProfissional";

export default function PreviewPagina() {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [config,    setConfig]    = useState(null);
  const [erro,      setErro]      = useState(false);

  useEffect(() => {
    buscarWorkspacePorSlug(slug)
      .then(async (ws) => {
        if (!ws) { setErro(true); return; }
        setWorkspace(ws);
        const cfg = await buscarConfiguracoes(ws.id).catch(() => ({}));
        setConfig(cfg || {});
      })
      .catch(() => setErro(true));
  }, [slug]);

  if (erro) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#666" }}>
      Workspace não encontrado.
    </div>
  );

  if (!config) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      {/* Barra de preview */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#1a2535", color: "#fff", padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 13, fontFamily: "sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}>
        <span>👁 <strong>Modo Preview</strong> — é assim que visitantes veem sua página</span>
        <button onClick={() => window.close()}
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "sans-serif" }}>
          Fechar
        </button>
      </div>

      {/* Espaço para a barra não cobrir o conteúdo */}
      <div style={{ paddingTop: 44 }}>
        <PaginaProfissional config={config} workspace={workspace} onEntrar={null} />
      </div>
    </>
  );
}
