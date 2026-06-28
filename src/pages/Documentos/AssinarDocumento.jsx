import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { buscarWorkspacePorSlug } from "../../services/slugService";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import {
  buscarDocumentoParaAssinar,
  salvarAssinatura,
} from "../../services/assinaturaService";
import "../../styles/assinatura.css";

const AssinarDocumento = () => {
  const { slug, docId } = useParams();

  const [workspace, setWorkspace] = useState(null);
  const [config, setConfig] = useState({});
  const [documento, setDocumento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [assinado, setAssinado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [houveTraco, setHouveTraco] = useState(false);

  const canvasRef = useRef(null);
  const desenhando = useRef(false);

  // ─── Carregar dados ──────────────────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        const ws = await buscarWorkspacePorSlug(slug);
        if (!ws) { setErro("Workspace não encontrado."); setCarregando(false); return; }
        setWorkspace(ws);

        const [cfg, doc] = await Promise.all([
          buscarConfiguracoes(ws.id),
          buscarDocumentoParaAssinar(docId),
        ]);
        setConfig(cfg || {});

        if (!doc) { setErro("Documento não encontrado."); setCarregando(false); return; }
        if (doc.status === "assinado") { setAssinado(true); }
        setDocumento(doc);
      } catch (e) {
        setErro("Erro ao carregar o documento.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [slug, docId]);

  // ─── Canvas helpers ──────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const iniciarDesenho = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    desenhando.current = true;
    setHouveTraco(true);
  };

  const desenhar = (e) => {
    e.preventDefault();
    if (!desenhando.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const pararDesenho = (e) => {
    e.preventDefault();
    desenhando.current = false;
  };

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHouveTraco(false);
  };

  // ─── Assinar ─────────────────────────────────────────────────
  const handleAssinar = async () => {
    if (!houveTraco) { alert("Por favor, desenhe sua assinatura antes de confirmar."); return; }
    setSalvando(true);
    try {
      const canvas = canvasRef.current;
      const base64 = canvas.toDataURL("image/png");
      await salvarAssinatura(docId, base64);
      setAssinado(true);
    } catch (e) {
      alert("Erro ao salvar a assinatura. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  const nomeClinica = config.nomeClinica || workspace?.nome || "";
  const logoUrl = config.logoUrl || null;

  if (carregando) return (
    <div className="assinar-page">
      <div className="assinar-loading">Carregando documento...</div>
    </div>
  );

  if (erro) return (
    <div className="assinar-page">
      <div className="assinar-erro">{erro}</div>
    </div>
  );

  return (
    <div className="assinar-page">
      {/* Header */}
      <div className="assinar-header">
        {logoUrl && <img src={logoUrl} alt="Logo" className="assinar-header-logo" />}
        {nomeClinica && <span className="assinar-header-nome">{nomeClinica}</span>}
      </div>

      <div className="assinar-card">
        {assinado ? (
          <div className="assinar-sucesso">
            <div className="assinar-sucesso-icone">✅</div>
            <h3>Documento assinado com sucesso!</h3>
            <p>Sua assinatura foi registrada. Você pode fechar esta página.</p>
          </div>
        ) : (
          <>
            {/* Título do documento */}
            <div className="assinar-doc-titulo">
              <h2>{documento.titulo || "Documento para assinatura"}</h2>
              {documento.nomePaciente && (
                <p>Paciente: <strong>{documento.nomePaciente}</strong></p>
              )}
            </div>

            {/* Conteúdo HTML do documento */}
            <div
              className="assinar-doc-conteudo"
              dangerouslySetInnerHTML={{ __html: documento.conteudo }}
            />

            {/* Canvas de assinatura */}
            <div className="assinar-secao-canvas">
              <p className="assinar-instrucao">Leia o documento acima e assine abaixo:</p>
              <div className="assinar-canvas-wrap">
                <span className={`assinar-canvas-label${houveTraco ? " hidden" : ""}`}>
                  Assine aqui
                </span>
                <canvas
                  ref={canvasRef}
                  className="assinar-canvas"
                  width={720}
                  height={180}
                  onMouseDown={iniciarDesenho}
                  onMouseMove={desenhar}
                  onMouseUp={pararDesenho}
                  onMouseLeave={pararDesenho}
                  onTouchStart={iniciarDesenho}
                  onTouchMove={desenhar}
                  onTouchEnd={pararDesenho}
                />
              </div>
              <div className="assinar-canvas-btns">
                <button className="assinar-btn-limpar" onClick={limparCanvas}>
                  Limpar
                </button>
                <button
                  className="assinar-btn-assinar"
                  onClick={handleAssinar}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Assinar documento"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssinarDocumento;
