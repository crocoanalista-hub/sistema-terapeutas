import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarEspera,
  adicionarListaEspera,
  removerListaEspera,
} from "../../services/listaEsperaService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/forms.css";
import "../../styles/pacientes.css";

const ListaEspera = () => {
  const { user, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [dados, setDados] = useState({
    nome: "",
    telefone: "",
    email: "",
    observacoes: "",
    prioridade: "normal",
  });

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const itens = await listarEspera(workspaceId);
      setLista(itens);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!dados.nome || !dados.telefone) {
      setErro("Nome e telefone são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      await adicionarListaEspera(workspaceId, dados);
      setDados({ nome: "", telefone: "", email: "", observacoes: "", prioridade: "normal" });
      setMostrarForm(false);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (id, nome) => {
    if (!window.confirm(`Remover ${nome} da lista de espera?`)) return;
    try {
      await removerListaEspera(id);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const gerarWhatsApp = (telefone, nome) => {
    const tel = telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${nome}! Temos uma vaga disponível. Gostaria de agendar sua sessão?`);
    return `https://wa.me/55${tel}?text=${msg}`;
  };

  const PRIORIDADE_COR = {
    alta: { bg: "#f8d7da", text: "#721c24", label: "Alta" },
    normal: { bg: "#d4edda", text: "#155724", label: "Normal" },
    baixa: { bg: "#e2e3e5", text: "#383d41", label: "Baixa" },
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/agenda")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, color: "#1a2535" }}>Lista de Espera</h2>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            style={{
              padding: "10px 18px", backgroundColor: "#3498db", color: "white",
              border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px",
            }}
          >
            {mostrarForm ? "Cancelar" : "+ Adicionar"}
          </button>
        </div>
      </div>

      {erro && <div className="erro-message">{erro}</div>}

      {mostrarForm && (
        <div style={{
          background: "white", borderRadius: "8px", padding: "24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "24px",
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "16px" }}>Adicionar à Lista de Espera</h3>
          <form onSubmit={handleAdicionar}>
            <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="form-group">
                <label>Nome <span className="obrigatorio">*</span></label>
                <input type="text" name="nome" value={dados.nome} onChange={handleChange}
                  placeholder="Nome completo" required />
              </div>
              <div className="form-group">
                <label>Telefone <span className="obrigatorio">*</span></label>
                <input type="tel" name="telefone" value={dados.telefone} onChange={handleChange}
                  placeholder="(11) 99999-9999" required />
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" name="email" value={dados.email} onChange={handleChange}
                  placeholder="email@exemplo.com" />
              </div>
              <div className="form-group">
                <label>Prioridade</label>
                <select name="prioridade" value={dados.prioridade} onChange={handleChange}>
                  <option value="alta">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea name="observacoes" value={dados.observacoes} onChange={handleChange}
                placeholder="Motivo da busca, horários preferidos..." rows="2" />
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={salvando} className="btn-salvar">
                {salvando ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {carregando ? (
        <p style={{ color: "#999" }}>Carregando...</p>
      ) : lista.length === 0 ? (
        <div style={{
          background: "white", borderRadius: "8px", padding: "40px",
          textAlign: "center", color: "#999", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}>
          Nenhuma pessoa na lista de espera.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {lista.map((item, index) => {
            const prio = PRIORIDADE_COR[item.prioridade] || PRIORIDADE_COR.normal;
            const dataEntrada = item.dataEntrada?.toDate?.() || new Date(item.dataEntrada);
            return (
              <div key={item.id} style={{
                background: "white", borderRadius: "8px", padding: "16px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                display: "flex", alignItems: "center", gap: "16px",
              }}>
                <span style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "#f4f6f9", display: "flex", alignItems: "center",
                  justifyContent: "center", fontWeight: "700", color: "#888", fontSize: "13px", flexShrink: 0,
                }}>
                  {index + 1}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "15px" }}>{item.nome}</strong>
                    <span style={{
                      padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
                      fontWeight: "600", backgroundColor: prio.bg, color: prio.text,
                    }}>
                      {prio.label}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span>📞 {item.telefone}</span>
                    {item.email && <span>✉️ {item.email}</span>}
                    <span>📅 Desde {dataEntrada.toLocaleDateString("pt-BR")}</span>
                  </div>
                  {item.observacoes && (
                    <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#888" }}>
                      {item.observacoes}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <a
                    href={gerarWhatsApp(item.telefone, item.nome)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "7px 12px", backgroundColor: "#25d366", color: "white",
                      border: "none", borderRadius: "6px", fontSize: "12px",
                      fontWeight: "600", cursor: "pointer", textDecoration: "none",
                    }}
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => handleRemover(item.id, item.nome)}
                    style={{
                      padding: "7px 12px", backgroundColor: "#f8d7da", color: "#721c24",
                      border: "none", borderRadius: "6px", fontSize: "12px",
                      fontWeight: "600", cursor: "pointer",
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListaEspera;
