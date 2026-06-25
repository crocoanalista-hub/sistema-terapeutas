import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listarEvolucoes,
  adicionarEvolucao,
  atualizarEvolucao,
  deletarEvolucao,
} from "../../services/evolucaoService";
import { buscarPaciente } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/forms.css";

const EvolucaoPaciente = () => {
  const { user, workspaceId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [evolucoes, setEvolucoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const hoje = new Date().toISOString().slice(0, 10);
  const [dados, setDados] = useState({ data: hoje, conteudo: "" });

  useEffect(() => {
    if (workspaceId) carregar();
  }, [user, id]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [pac, evols] = await Promise.all([
        buscarPaciente(id),
        listarEvolucoes(workspaceId, id),
      ]);
      setPaciente(pac);
      setEvolucoes(evols);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!dados.conteudo.trim()) { setErro("O conteúdo é obrigatório."); return; }
    setSalvando(true);
    try {
      if (editando) {
        await atualizarEvolucao(editando.id, dados);
      } else {
        await adicionarEvolucao(workspaceId, id, dados);
      }
      setDados({ data: hoje, conteudo: "" });
      setMostrarForm(false);
      setEditando(null);
      setErro("");
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (evol) => {
    setEditando(evol);
    setDados({ data: evol.data, conteudo: evol.conteudo });
    setMostrarForm(true);
  };

  const handleDeletar = async (evol) => {
    if (!window.confirm("Deletar esta evolução?")) return;
    try {
      await deletarEvolucao(evol.id);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelarForm = () => {
    setMostrarForm(false);
    setEditando(null);
    setDados({ data: hoje, conteudo: "" });
    setErro("");
  };

  return (
    <div style={{ maxWidth: "860px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
        <button
          onClick={() => navigate(`/pacientes/${id}`)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, color: "#1a2535" }}>Evolução do Paciente</h2>
          {paciente && (
            <p style={{ margin: "2px 0 0 0", color: "#888", fontSize: "14px" }}>{paciente.nome}</p>
          )}
        </div>
        <button
          onClick={() => { setMostrarForm(true); setEditando(null); setDados({ data: hoje, conteudo: "" }); }}
          style={{
            marginLeft: "auto", padding: "10px 18px", backgroundColor: "#9b59b6",
            color: "white", border: "none", borderRadius: "6px", fontWeight: "600",
            cursor: "pointer", fontSize: "14px",
          }}
        >
          + Nova Evolução
        </button>
      </div>

      {erro && <div className="erro-message" style={{ marginTop: "12px" }}>{erro}</div>}

      {mostrarForm && (
        <div style={{
          background: "white", borderRadius: "8px", padding: "24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", margin: "16px 0",
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
            {editando ? "Editar Evolução" : "Nova Evolução"}
          </h3>
          <form onSubmit={handleSalvar}>
            <div className="form-group">
              <label>Data da sessão</label>
              <input type="date" value={dados.data}
                onChange={(e) => setDados((p) => ({ ...p, data: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Anotações clínicas <span className="obrigatorio">*</span></label>
              <textarea
                rows="8"
                value={dados.conteudo}
                onChange={(e) => setDados((p) => ({ ...p, conteudo: e.target.value }))}
                placeholder="Descreva a evolução do paciente: temas trabalhados, observações clínicas, tarefas, próximos objetivos..."
                style={{ resize: "vertical" }}
                required
              />
            </div>
            <div className="form-buttons">
              <button type="button" className="btn-cancelar" onClick={cancelarForm}>Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-salvar">
                {salvando ? "Salvando..." : editando ? "Salvar Alterações" : "Salvar Evolução"}
              </button>
            </div>
          </form>
        </div>
      )}

      {carregando ? (
        <p style={{ color: "#999", marginTop: "20px" }}>Carregando...</p>
      ) : evolucoes.length === 0 ? (
        <div style={{
          background: "white", borderRadius: "8px", padding: "40px",
          textAlign: "center", color: "#999", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          marginTop: "16px",
        }}>
          Nenhuma evolução registrada ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {evolucoes.map((evol) => {
            const data = new Date(evol.data + "T00:00:00").toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            });
            return (
              <div key={evol.id} style={{
                background: "white", borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden",
              }}>
                <div style={{
                  background: "#f4f6f9", padding: "12px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderBottom: "1px solid #eee",
                }}>
                  <span style={{ fontWeight: "600", color: "#1a2535", textTransform: "capitalize", fontSize: "14px" }}>
                    📅 {data}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleEditar(evol)}
                      style={{
                        padding: "5px 10px", background: "#f39c12", color: "white",
                        border: "none", borderRadius: "4px", fontSize: "12px",
                        fontWeight: "600", cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletar(evol)}
                      style={{
                        padding: "5px 10px", background: "#e74c3c", color: "white",
                        border: "none", borderRadius: "4px", fontSize: "12px",
                        fontWeight: "600", cursor: "pointer",
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <p style={{
                    margin: 0, color: "#444", fontSize: "14px",
                    lineHeight: "1.7", whiteSpace: "pre-wrap",
                  }}>
                    {evol.conteudo}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EvolucaoPaciente;
