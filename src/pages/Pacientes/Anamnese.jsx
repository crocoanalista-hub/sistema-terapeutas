import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { salvarAnamnese, buscarAnamnese } from "../../services/anamneseService";
import { buscarPaciente } from "../../services/pacientesService";
import "../../styles/forms.css";

const VAZIO = {
  queixaPrincipal: "",
  historiaDoenca: "",
  historicoFamiliar: "",
  medicamentos: "",
  cirurgias: "",
  alergias: "",
  qualidadeSono: "",
  habitosAlimentares: "",
  atividadeFisica: "",
  vidaSocial: "",
  relacionamentos: "",
  motivoBusca: "",
  objetivosTerapia: "",
  diagnosticosAnteriores: "",
  terapiasAnteriores: "",
  outrasObservacoes: "",
};

const SECOES = [
  {
    titulo: "1. Queixa e Histórico",
    campos: [
      { key: "queixaPrincipal", label: "Queixa principal", rows: 3, placeholder: "Descreva o principal motivo que trouxe o paciente à terapia..." },
      { key: "historiaDoenca", label: "História da doença atual", rows: 3, placeholder: "Como e quando os sintomas começaram..." },
      { key: "motivoBusca", label: "Motivo da busca por terapia", rows: 2, placeholder: "O que levou o paciente a buscar atendimento agora..." },
    ],
  },
  {
    titulo: "2. Histórico de Saúde",
    campos: [
      { key: "diagnosticosAnteriores", label: "Diagnósticos anteriores", rows: 2, placeholder: "CIDs, condições de saúde já diagnosticadas..." },
      { key: "medicamentos", label: "Medicamentos em uso", rows: 2, placeholder: "Nome, dosagem e frequência..." },
      { key: "cirurgias", label: "Cirurgias / internações anteriores", rows: 2, placeholder: "Descreva..." },
      { key: "alergias", label: "Alergias", rows: 1, placeholder: "Alergias a medicamentos, alimentos, etc..." },
      { key: "terapiasAnteriores", label: "Terapias / tratamentos anteriores", rows: 2, placeholder: "Já fez terapia antes? Com qual abordagem? Por quanto tempo?" },
    ],
  },
  {
    titulo: "3. Histórico Familiar",
    campos: [
      { key: "historicoFamiliar", label: "Histórico familiar relevante", rows: 3, placeholder: "Doenças mentais ou físicas na família, dinâmica familiar..." },
      { key: "relacionamentos", label: "Relacionamentos", rows: 2, placeholder: "Estado civil, filhos, relações familiares significativas..." },
    ],
  },
  {
    titulo: "4. Hábitos e Estilo de Vida",
    campos: [
      { key: "qualidadeSono", label: "Qualidade do sono", rows: 2, placeholder: "Horas de sono, insônia, pesadelos..." },
      { key: "habitosAlimentares", label: "Hábitos alimentares", rows: 2, placeholder: "Alimentação, restrições, compulsões..." },
      { key: "atividadeFisica", label: "Atividade física", rows: 1, placeholder: "Pratica exercícios? Com que frequência?" },
      { key: "vidaSocial", label: "Vida social e trabalho", rows: 2, placeholder: "Profissão, relações sociais, lazer..." },
    ],
  },
  {
    titulo: "5. Objetivos e Observações",
    campos: [
      { key: "objetivosTerapia", label: "Objetivos terapêuticos", rows: 3, placeholder: "O que o paciente espera alcançar com a terapia..." },
      { key: "outrasObservacoes", label: "Outras observações", rows: 3, placeholder: "Qualquer informação relevante não contemplada acima..." },
    ],
  },
];

const Anamnese = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
  }, [id]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [pac, anam] = await Promise.all([
        buscarPaciente(id),
        buscarAnamnese(id),
      ]);
      setPaciente(pac);
      if (anam) setDados({ ...VAZIO, ...anam });
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

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    try {
      await salvarAnamnese(id, dados);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleImprimir = () => window.print();

  if (carregando) return <p style={{ color: "#999" }}>Carregando...</p>;

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
          <h2 style={{ margin: 0, color: "#1a2535" }}>Anamnese Digital</h2>
          {paciente && (
            <p style={{ margin: "2px 0 0 0", color: "#888", fontSize: "14px" }}>{paciente.nome}</p>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button
            onClick={handleImprimir}
            style={{
              padding: "9px 16px", background: "#f4f6f9", color: "#555",
              border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px",
              fontWeight: "600", cursor: "pointer",
            }}
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {erro && <div className="erro-message" style={{ marginTop: "12px" }}>{erro}</div>}
      {salvo && (
        <div style={{
          background: "#d4edda", border: "1px solid #c3e6cb", color: "#155724",
          padding: "12px 16px", borderRadius: "6px", marginTop: "12px", fontSize: "14px",
        }}>
          ✅ Anamnese salva com sucesso!
        </div>
      )}

      <form onSubmit={handleSalvar} style={{ marginTop: "16px" }}>
        {SECOES.map((secao) => (
          <div key={secao.titulo} style={{
            background: "white", borderRadius: "8px", padding: "24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "16px",
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1a2535", fontSize: "15px", borderBottom: "2px solid #f4f6f9", paddingBottom: "10px" }}>
              {secao.titulo}
            </h3>
            {secao.campos.map((campo) => (
              <div key={campo.key} className="form-group">
                <label style={{ fontWeight: "600", color: "#444" }}>{campo.label}</label>
                <textarea
                  name={campo.key}
                  rows={campo.rows}
                  value={dados[campo.key]}
                  onChange={handleChange}
                  placeholder={campo.placeholder}
                  style={{ resize: "vertical" }}
                />
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "32px" }}>
          <button
            type="button"
            onClick={() => navigate(`/pacientes/${id}`)}
            className="btn-cancelar"
          >
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-salvar">
            {salvando ? "Salvando..." : "Salvar Anamnese"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Anamnese;
