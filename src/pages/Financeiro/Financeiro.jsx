import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarSessoesConcluidas,
  marcarComoPago,
} from "../../services/agendamentosService";
import { listarPacientes } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/financeiro.css";

const moeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Financeiro = () => {
  const { user, terapeuta } = useAuth();
  const navigate = useNavigate();

  const [aba, setAba] = useState("resumo");
  const [sessoes, setSessoes] = useState([]);
  const [mapaPacientes, setMapaPacientes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reciboSessao, setReciboSessao] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [sess, pacs] = await Promise.all([
        listarSessoesConcluidas(user.uid),
        listarPacientes(user.uid),
      ]);
      setSessoes(sess);
      const mapa = {};
      pacs.forEach((p) => { mapa[p.id] = p; });
      setMapaPacientes(mapa);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const handleMarcarPago = async (sessao) => {
    try {
      await marcarComoPago(sessao.id);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  // Cálculos
  const pagas = sessoes.filter((s) => s.pago);
  const pendentes = sessoes.filter((s) => !s.pago);
  const totalRecebido = pagas.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalPendente = pendentes.reduce((acc, s) => acc + (s.valor || 0), 0);

  const sessoesMes = sessoes.filter((s) => s.data && s.data.startsWith(mesSelecionado));
  const recebidoMes = sessoesMes.filter((s) => s.pago).reduce((acc, s) => acc + (s.valor || 0), 0);
  const pendenteMes = sessoesMes.filter((s) => !s.pago).reduce((acc, s) => acc + (s.valor || 0), 0);

  const mesesDisponiveis = [...new Set(sessoes.map((s) => s.data?.slice(0, 7)).filter(Boolean))].sort().reverse();

  const imprimirRecibo = (sessao) => {
    setReciboSessao(sessao);
    setTimeout(() => window.print(), 300);
  };

  const renderResumo = () => (
    <div>
      <div className="fin-cards">
        <div className="fin-card azul">
          <p className="fin-card-label">Total Recebido</p>
          <p className="fin-card-valor">{moeda(totalRecebido)}</p>
          <p className="fin-card-sub">{pagas.length} sessões</p>
        </div>
        <div className="fin-card laranja">
          <p className="fin-card-label">Aguardando Pagamento</p>
          <p className="fin-card-valor">{moeda(totalPendente)}</p>
          <p className="fin-card-sub">{pendentes.length} sessões</p>
        </div>
        <div className="fin-card verde">
          <p className="fin-card-label">Total (Recebido + Pendente)</p>
          <p className="fin-card-valor">{moeda(totalRecebido + totalPendente)}</p>
          <p className="fin-card-sub">{sessoes.length} sessões concluídas</p>
        </div>
      </div>

      <h3 className="fin-subtitulo">Sessões Pendentes de Pagamento</h3>
      {pendentes.length === 0 ? (
        <p className="fin-vazio">Nenhuma sessão aguardando pagamento. 🎉</p>
      ) : (
        <div className="fin-tabela-wrap">
          <table className="fin-tabela">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((s) => (
                <tr key={s.id}>
                  <td>{mapaPacientes[s.pacienteId]?.nome || "—"}</td>
                  <td>{new Date(s.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{s.hora}</td>
                  <td>{s.valor ? moeda(s.valor) : <span className="fin-sem-valor">Sem valor</span>}</td>
                  <td>
                    <button className="btn-pagar" onClick={() => handleMarcarPago(s)}>
                      Marcar como Pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPagamentos = () => (
    <div>
      <div className="fin-tabela-wrap">
        {sessoes.length === 0 ? (
          <p className="fin-vazio">Nenhuma sessão concluída ainda.</p>
        ) : (
          <table className="fin-tabela">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sessoes.map((s) => (
                <tr key={s.id}>
                  <td>{mapaPacientes[s.pacienteId]?.nome || "—"}</td>
                  <td>{new Date(s.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{s.hora}</td>
                  <td>{s.valor ? moeda(s.valor) : <span className="fin-sem-valor">—</span>}</td>
                  <td>
                    <span className={`fin-badge ${s.pago ? "pago" : "pendente"}`}>
                      {s.pago ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: "6px" }}>
                    {!s.pago && (
                      <button className="btn-pagar" onClick={() => handleMarcarPago(s)}>
                        Pagar
                      </button>
                    )}
                    {s.valor && (
                      <button className="btn-recibo" onClick={() => imprimirRecibo(s)}>
                        Recibo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderFluxo = () => (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ fontWeight: "600", color: "#555", fontSize: "14px" }}>Mês:</label>
        <select
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
        >
          {mesesDisponiveis.length === 0 && (
            <option value={mesSelecionado}>{mesSelecionado}</option>
          )}
          {mesesDisponiveis.map((m) => {
            const [y, mo] = m.split("-");
            const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>
      </div>

      <div className="fin-cards" style={{ marginBottom: "24px" }}>
        <div className="fin-card verde">
          <p className="fin-card-label">Recebido no mês</p>
          <p className="fin-card-valor">{moeda(recebidoMes)}</p>
          <p className="fin-card-sub">{sessoesMes.filter((s) => s.pago).length} sessões</p>
        </div>
        <div className="fin-card laranja">
          <p className="fin-card-label">Pendente no mês</p>
          <p className="fin-card-valor">{moeda(pendenteMes)}</p>
          <p className="fin-card-sub">{sessoesMes.filter((s) => !s.pago).length} sessões</p>
        </div>
        <div className="fin-card azul">
          <p className="fin-card-label">Total do mês</p>
          <p className="fin-card-valor">{moeda(recebidoMes + pendenteMes)}</p>
          <p className="fin-card-sub">{sessoesMes.length} sessões</p>
        </div>
      </div>

      {sessoesMes.length === 0 ? (
        <p className="fin-vazio">Nenhuma sessão concluída neste mês.</p>
      ) : (
        <div className="fin-tabela-wrap">
          <table className="fin-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Paciente</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessoesMes
                .sort((a, b) => a.data.localeCompare(b.data))
                .map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                    <td>{mapaPacientes[s.pacienteId]?.nome || "—"}</td>
                    <td>{s.valor ? moeda(s.valor) : <span className="fin-sem-valor">—</span>}</td>
                    <td>
                      <span className={`fin-badge ${s.pago ? "pago" : "pendente"}`}>
                        {s.pago ? "Pago" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="fin-container">
      <h2 className="fin-titulo">Financeiro</h2>

      <div className="fin-abas">
        {[
          { key: "resumo", label: "Resumo" },
          { key: "pagamentos", label: "Pagamentos" },
          { key: "fluxo", label: "Fluxo de Caixa" },
        ].map((a) => (
          <button
            key={a.key}
            className={`fin-aba ${aba === a.key ? "ativa" : ""}`}
            onClick={() => setAba(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="fin-vazio">Carregando...</p>
      ) : aba === "resumo" ? (
        renderResumo()
      ) : aba === "pagamentos" ? (
        renderPagamentos()
      ) : (
        renderFluxo()
      )}

      {/* Recibo para impressão */}
      {reciboSessao && (
        <div className="recibo-print">
          <div className="recibo-box">
            <h2>RECIBO DE PAGAMENTO</h2>
            <div className="recibo-linha">
              <strong>Terapeuta:</strong> {terapeuta?.nome || ""}
            </div>
            <div className="recibo-linha">
              <strong>Paciente:</strong>{" "}
              {mapaPacientes[reciboSessao.pacienteId]?.nome || ""}
            </div>
            <div className="recibo-linha">
              <strong>Data da sessão:</strong>{" "}
              {new Date(reciboSessao.data + "T00:00").toLocaleDateString("pt-BR")}
            </div>
            <div className="recibo-linha">
              <strong>Horário:</strong> {reciboSessao.hora}
            </div>
            <div className="recibo-linha">
              <strong>Duração:</strong> {reciboSessao.duracao} minutos
            </div>
            <div className="recibo-valor">
              Valor recebido: <span>{moeda(reciboSessao.valor)}</span>
            </div>
            <div className="recibo-texto">
              Recebi do(a) paciente{" "}
              <strong>{mapaPacientes[reciboSessao.pacienteId]?.nome}</strong> a
              importância de <strong>{moeda(reciboSessao.valor)}</strong>{" "}
              referente à sessão de psicoterapia realizada em{" "}
              {new Date(reciboSessao.data + "T00:00").toLocaleDateString("pt-BR")},
              dando plena quitação.
            </div>
            <div className="recibo-assinatura">
              <div className="recibo-linha-assinatura" />
              <p>{terapeuta?.nome}</p>
              <p>Terapeuta</p>
            </div>
            <div className="recibo-data-emissao">
              Emitido em {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financeiro;
