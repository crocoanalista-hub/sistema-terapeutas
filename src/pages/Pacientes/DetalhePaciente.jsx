import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buscarPaciente } from "../../services/pacientesService";
import { listarAgendamentosPaciente } from "../../services/agendamentosService";
import { useAuth } from "../../hooks/useAuth";

const STATUS_COR = {
  confirmado: { bg: "#d4edda", text: "#155724" },
  "concluído": { bg: "#cfe2ff", text: "#084298" },
  cancelado: { bg: "#f8d7da", text: "#721c24" },
  falta: { bg: "#fff3cd", text: "#856404" },
};

const DetalhePaciente = () => {
  const { user, workspaceId } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [carregando, setCarregando] = useState(true);
  const [paciente, setPaciente] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, [id, user]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const dadosPaciente = await buscarPaciente(id);
      setPaciente(dadosPaciente);
      if (workspaceId) {
        const ag = await listarAgendamentosPaciente(workspaceId, id);
        setAgendamentos(ag);
      }
    } catch (err) {
      setErro("Erro ao carregar dados: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) return <div style={{ color: "#999" }}>Carregando...</div>;

  if (!paciente) return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <p>Paciente não encontrado.</p>
      <button onClick={() => navigate("/pacientes")} style={{
        padding: "10px 20px", background: "#3498db", color: "white",
        border: "none", borderRadius: "6px", cursor: "pointer",
      }}>
        Voltar
      </button>
    </div>
  );

  const atalhos = [
    { label: "📝 Evolução Clínica", cor: "#9b59b6", rota: `/pacientes/${id}/evolucao` },
    { label: "📋 Anamnese", cor: "#16a085", rota: `/pacientes/${id}/anamnese` },
    { label: "📅 Marcar Sessão", cor: "#27ae60", rota: `/agenda/marcar` },
    { label: "✏️ Editar Dados", cor: "#f39c12", rota: `/pacientes/${id}/editar` },
  ];

  return (
    <div style={{ maxWidth: "960px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/pacientes")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, color: "#1a2535" }}>{paciente.nome}</h2>
      </div>

      {erro && <div style={{ background: "#fdeaea", border: "1px solid #f5b7b1", color: "#c0392b", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>{erro}</div>}

      {/* Atalhos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {atalhos.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.rota)}
            style={{
              padding: "14px 12px", background: "white", border: `2px solid ${a.cor}`,
              borderRadius: "8px", color: a.cor, fontSize: "13px", fontWeight: "700",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = a.cor; e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = a.cor; }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Dados do paciente */}
      <div style={{
        background: "white", borderRadius: "8px", padding: "24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "20px",
      }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#1a2535" }}>Dados Cadastrais</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#999", textTransform: "uppercase", fontWeight: "600" }}>E-mail</p>
            <p style={{ margin: "4px 0 0 0", color: "#333" }}>{paciente.email || "—"}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#999", textTransform: "uppercase", fontWeight: "600" }}>Telefone</p>
            <p style={{ margin: "4px 0 0 0", color: "#333" }}>{paciente.telefone || "—"}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#999", textTransform: "uppercase", fontWeight: "600" }}>Data de Nascimento</p>
            <p style={{ margin: "4px 0 0 0", color: "#333" }}>
              {paciente.dataNascimento
                ? new Date(paciente.dataNascimento + "T00:00").toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#999", textTransform: "uppercase", fontWeight: "600" }}>Cadastrado em</p>
            <p style={{ margin: "4px 0 0 0", color: "#333" }}>
              {new Date(paciente.dataCriacao?.toDate?.() || paciente.dataCriacao).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        {paciente.observacoes && (
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
            <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#999", textTransform: "uppercase", fontWeight: "600" }}>Observações</p>
            <p style={{ margin: 0, color: "#444", whiteSpace: "pre-wrap", fontSize: "14px" }}>{paciente.observacoes}</p>
          </div>
        )}
      </div>

      {/* Histórico de agendamentos */}
      <div style={{
        background: "white", borderRadius: "8px", padding: "24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#1a2535" }}>
          Histórico de Agendamentos ({agendamentos.length})
        </h3>
        {agendamentos.length === 0 ? (
          <p style={{ color: "#999", margin: 0 }}>Nenhum agendamento ainda.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#555", fontSize: "12px", textTransform: "uppercase" }}>Data</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#555", fontSize: "12px", textTransform: "uppercase" }}>Hora</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#555", fontSize: "12px", textTransform: "uppercase" }}>Duração</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#555", fontSize: "12px", textTransform: "uppercase" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((ag) => {
                const cor = STATUS_COR[ag.status] || STATUS_COR.confirmado;
                return (
                  <tr key={ag.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 12px" }}>
                      {new Date(ag.data + "T00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{ag.hora}</td>
                    <td style={{ padding: "10px 12px" }}>{ag.duracao} min</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "12px", fontSize: "12px",
                        fontWeight: "600", backgroundColor: cor.bg, color: cor.text,
                      }}>
                        {ag.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DetalhePaciente;
