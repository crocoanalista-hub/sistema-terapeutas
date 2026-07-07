import React, { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  listarSessoesConcluidas,
  marcarComoPago,
} from "../../services/agendamentosService";
import { listarPacientes } from "../../services/pacientesService";
import { listarProfissionais } from "../../services/profissionaisService";
import {
  calcularComissoes, buscarComissoesSalvas, registrarPagamentoComissao,
} from "../../services/comissoesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/financeiro.css";

const moeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (iso) =>
  iso ? new Date(iso + "T00:00").toLocaleDateString("pt-BR") : "—";

const nomeMes = (yyyymm) => {
  const [y, m] = yyyymm.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

// ---------- Gráfico de barras SVG ----------
const GraficoBarras = ({ dados }) => {
  // dados: [{ mes: "2025-01", valor: 1200 }, ...]
  if (!dados.length) return null;
  const maxVal = Math.max(...dados.map((d) => d.valor), 1);
  const W = 560;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 36, left: 64 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barW = Math.max(24, (chartW / dados.length) * 0.55);
  const barGap = chartW / dados.length;

  // y-axis ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxVal / ticks) * i)
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="fin-grafico-svg"
      role="img"
      aria-label="Receita por mês"
    >
      {/* grid lines */}
      {tickVals.map((tv) => {
        const y = PAD.top + chartH - (tv / maxVal) * chartH;
        return (
          <g key={tv}>
            <line
              x1={PAD.left}
              x2={PAD.left + chartW}
              y1={y}
              y2={y}
              stroke="#e8eaed"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#999"
            >
              {tv >= 1000 ? `${(tv / 1000).toFixed(0)}k` : tv}
            </text>
          </g>
        );
      })}

      {/* bars */}
      {dados.map((d, i) => {
        const barH = Math.max(2, (d.valor / maxVal) * chartH);
        const x = PAD.left + i * barGap + (barGap - barW) / 2;
        const y = PAD.top + chartH - barH;
        const [, m] = d.mes.split("-");
        const label = new Date(2024, Number(m) - 1, 1).toLocaleDateString(
          "pt-BR",
          { month: "short" }
        );
        return (
          <g key={d.mes}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              className="fin-barra"
            />
            <text
              x={x + barW / 2}
              y={PAD.top + chartH + 16}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
            >
              {label}
            </text>
            {d.valor > 0 && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#555"
              >
                {d.valor >= 1000
                  ? `${(d.valor / 1000).toFixed(1)}k`
                  : moeda(d.valor).replace("R$ ", "")}
              </text>
            )}
          </g>
        );
      })}

      {/* y-axis line */}
      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={PAD.top + chartH}
        stroke="#ccc"
        strokeWidth="1"
      />
    </svg>
  );
};

// ---------- Component principal ----------
const Financeiro = () => {
  const { workspaceId, terapeuta } = useAuth();

  const [aba, setAba] = useState("resumo");
  const [sessoes, setSessoes] = useState([]);
  const [mapaPacientes, setMapaPacientes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reciboSessao, setReciboSessao] = useState(null);
  const reciboRef = useRef(null);

  // Aba 3 — Por Paciente ordenação
  const [ordemPac, setOrdemPac] = useState({ col: "totalAberto", dir: "desc" });

  // Aba 4 — Extrato filtro status
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Aba 5 — Comissões
  const [mesComissao, setMesComissao] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [profissionais, setProfissionais] = useState([]);
  const [sessoesComissao, setSessoesComissao] = useState([]);
  const [comissoesSalvas, setComissoesSalvas] = useState([]);
  const [carregandoCom, setCarregandoCom] = useState(false);
  const [marcandoCom, setMarcandoCom] = useState(null);

  const carregar = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setCarregando(true);
      const [sess, pacs] = await Promise.all([
        listarSessoesConcluidas(workspaceId),
        listarPacientes(workspaceId),
      ]);
      setSessoes(sess);
      const mapa = {};
      pacs.forEach((p) => {
        mapa[p.id] = p;
      });
      setMapaPacientes(mapa);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }, [workspaceId]);

  useEffect(() => { carregar(); }, [carregar]);

  const carregarComissoes = useCallback(async () => {
    if (!workspaceId) return;
    setCarregandoCom(true);
    const [profs, sess, salvas] = await Promise.all([
      listarProfissionais(workspaceId),
      calcularComissoes(workspaceId, mesComissao),
      buscarComissoesSalvas(workspaceId, mesComissao),
    ]);
    setProfissionais(profs);
    setSessoesComissao(sess);
    setComissoesSalvas(salvas);
    setCarregandoCom(false);
  }, [workspaceId, mesComissao]);

  useEffect(() => {
    if (aba === "comissoes") carregarComissoes();
  }, [aba, carregarComissoes]);

  const handleMarcarPago = async (sessao) => {
    try {
      await marcarComoPago(sessao.id);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const imprimirRecibo = (sessao) => {
    setReciboSessao(sessao);
    setTimeout(async () => {
      const el = reciboRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgW, Math.min(imgH, pageH - 20));
      const pacNome = (mapaPacientes[sessao.pacienteId]?.nome || "recibo").replace(/\s+/g, "_");
      pdf.save(`recibo_${pacNome}_${sessao.data || "sessao"}.pdf`);
      setReciboSessao(null);
    }, 300);
  };

  // ---- Dados derivados ----
  const mesesDisponiveis = [
    ...new Set(sessoes.map((s) => s.data?.slice(0, 7)).filter(Boolean)),
  ].sort().reverse();

  const sessoesMes = sessoes.filter(
    (s) => s.data && s.data.startsWith(mesSelecionado)
  );
  const recebidoMes = sessoesMes
    .filter((s) => s.pago)
    .reduce((acc, s) => acc + (s.valor || 0), 0);
  const pendenteMes = sessoesMes
    .filter((s) => !s.pago)
    .reduce((acc, s) => acc + (s.valor || 0), 0);
  const ticketMedio =
    sessoesMes.length > 0
      ? (recebidoMes + pendenteMes) / sessoesMes.length
      : 0;

  // Gráfico — últimos 6 meses
  const ultimos6Meses = (() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const valor = sessoes
        .filter((s) => s.data?.startsWith(key) && s.pago)
        .reduce((acc, s) => acc + (s.valor || 0), 0);
      result.push({ mes: key, valor });
    }
    return result;
  })();

  // Inadimplentes — agrupados por paciente
  const inadimplentes = (() => {
    const grupos = {};
    sessoes
      .filter((s) => !s.pago)
      .forEach((s) => {
        if (!grupos[s.pacienteId]) grupos[s.pacienteId] = [];
        grupos[s.pacienteId].push(s);
      });
    return Object.entries(grupos)
      .map(([pacId, sess]) => ({
        pacId,
        nome: mapaPacientes[pacId]?.nome || "—",
        total: sess.reduce((acc, s) => acc + (s.valor || 0), 0),
        sessoes: sess.sort((a, b) => a.data?.localeCompare(b.data)),
      }))
      .sort((a, b) => b.total - a.total);
  })();

  // Por paciente
  const porPaciente = (() => {
    const grupos = {};
    sessoes.forEach((s) => {
      if (!grupos[s.pacienteId]) {
        grupos[s.pacienteId] = {
          pacId: s.pacienteId,
          nome: mapaPacientes[s.pacienteId]?.nome || "—",
          qtd: 0,
          recebido: 0,
          aberto: 0,
          ultimaData: "",
        };
      }
      const g = grupos[s.pacienteId];
      g.qtd += 1;
      if (s.pago) g.recebido += s.valor || 0;
      else g.aberto += s.valor || 0;
      if (!g.ultimaData || (s.data || "") > g.ultimaData)
        g.ultimaData = s.data || "";
    });
    const arr = Object.values(grupos);
    const { col, dir } = ordemPac;
    arr.sort((a, b) => {
      let va = a[col];
      let vb = b[col];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  })();

  const toggleOrdem = (col) => {
    setOrdemPac((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "desc" }
    );
  };

  const setaOrdem = (col) => {
    if (ordemPac.col !== col) return " ↕";
    return ordemPac.dir === "asc" ? " ↑" : " ↓";
  };

  // Extrato
  const extratoFiltrado = sessoesMes
    .filter((s) => {
      if (filtroStatus === "pago") return s.pago;
      if (filtroStatus === "pendente") return !s.pago;
      return true;
    })
    .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  // ---- Renders ----

  const renderResumo = () => (
    <div>
      <div className="fin-resumo-header">
        <label className="fin-label-mes">Mês:</label>
        <select
          className="fin-select"
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
        >
          {mesesDisponiveis.length === 0 && (
            <option value={mesSelecionado}>{mesSelecionado}</option>
          )}
          {mesesDisponiveis.map((m) => (
            <option key={m} value={m}>
              {nomeMes(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="fin-cards">
        <div className="fin-card verde">
          <p className="fin-card-label">Recebido no mês</p>
          <p className="fin-card-valor">{moeda(recebidoMes)}</p>
          <p className="fin-card-sub">
            {sessoesMes.filter((s) => s.pago).length} sessões pagas
          </p>
        </div>
        <div className="fin-card laranja">
          <p className="fin-card-label">A receber</p>
          <p className="fin-card-valor">{moeda(pendenteMes)}</p>
          <p className="fin-card-sub">
            {sessoesMes.filter((s) => !s.pago).length} sessões pendentes
          </p>
        </div>
        <div className="fin-card azul">
          <p className="fin-card-label">Total de sessões</p>
          <p className="fin-card-valor">{sessoesMes.length}</p>
          <p className="fin-card-sub">sessões concluídas no mês</p>
        </div>
        <div className="fin-card roxo">
          <p className="fin-card-label">Ticket médio</p>
          <p className="fin-card-valor">{moeda(ticketMedio)}</p>
          <p className="fin-card-sub">por sessão no mês</p>
        </div>
      </div>

      <div className="fin-grafico-card">
        <h3 className="fin-subtitulo">Receita dos últimos 6 meses</h3>
        <GraficoBarras dados={ultimos6Meses} />
        <div className="fin-grafico-legenda">
          <span className="fin-legenda-dot" /> Receita recebida
        </div>
      </div>
    </div>
  );

  const renderInadimplentes = () => (
    <div>
      <p className="fin-desc">
        Sessões concluídas não pagas, agrupadas por paciente — ordenadas por
        maior valor em aberto.
      </p>
      {inadimplentes.length === 0 ? (
        <p className="fin-vazio">Nenhum paciente inadimplente. 🎉</p>
      ) : (
        inadimplentes.map(({ pacId, nome, total, sessoes: ss }) => (
          <div key={pacId} className="fin-inadimplente-grupo">
            <div className="fin-inadimplente-header">
              <span className="fin-inadimplente-nome">{nome}</span>
              <span className="fin-inadimplente-total">
                Total em aberto: <strong>{moeda(total)}</strong>
              </span>
            </div>
            <div className="fin-tabela-wrap">
              <table className="fin-tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Valor</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {ss.map((s) => (
                    <tr key={s.id}>
                      <td>{fmtData(s.data)}</td>
                      <td>{s.hora || "—"}</td>
                      <td>
                        {s.valor ? (
                          moeda(s.valor)
                        ) : (
                          <span className="fin-sem-valor">Sem valor</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-pagar"
                          onClick={() => handleMarcarPago(s)}
                        >
                          Marcar como pago
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPorPaciente = () => (
    <div>
      <p className="fin-desc">
        Clique nos cabeçalhos para ordenar.
      </p>
      {porPaciente.length === 0 ? (
        <p className="fin-vazio">Nenhuma sessão registrada.</p>
      ) : (
        <div className="fin-tabela-wrap">
          <table className="fin-tabela">
            <thead>
              <tr>
                <th
                  className="fin-th-sort"
                  onClick={() => toggleOrdem("nome")}
                >
                  Paciente{setaOrdem("nome")}
                </th>
                <th
                  className="fin-th-sort"
                  onClick={() => toggleOrdem("qtd")}
                >
                  Sessões{setaOrdem("qtd")}
                </th>
                <th
                  className="fin-th-sort"
                  onClick={() => toggleOrdem("recebido")}
                >
                  Total recebido{setaOrdem("recebido")}
                </th>
                <th
                  className="fin-th-sort"
                  onClick={() => toggleOrdem("aberto")}
                >
                  A receber{setaOrdem("aberto")}
                </th>
                <th
                  className="fin-th-sort"
                  onClick={() => toggleOrdem("ultimaData")}
                >
                  Última sessão{setaOrdem("ultimaData")}
                </th>
              </tr>
            </thead>
            <tbody>
              {porPaciente.map((p) => (
                <tr key={p.pacId}>
                  <td>
                    <strong>{p.nome}</strong>
                  </td>
                  <td>{p.qtd}</td>
                  <td>{moeda(p.recebido)}</td>
                  <td>
                    {p.aberto > 0 ? (
                      <span className="fin-valor-aberto">{moeda(p.aberto)}</span>
                    ) : (
                      <span className="fin-valor-ok">R$ 0,00</span>
                    )}
                  </td>
                  <td>{p.ultimaData ? fmtData(p.ultimaData) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderExtrato = () => (
    <div>
      <div className="fin-extrato-filtros">
        <div className="fin-filtro-grupo">
          <label className="fin-label-mes">Mês:</label>
          <select
            className="fin-select"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
          >
            {mesesDisponiveis.length === 0 && (
              <option value={mesSelecionado}>{mesSelecionado}</option>
            )}
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="fin-filtro-grupo">
          <label className="fin-label-mes">Status:</label>
          <select
            className="fin-select"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>
      </div>

      {extratoFiltrado.length === 0 ? (
        <p className="fin-vazio">Nenhuma sessão encontrada com esses filtros.</p>
      ) : (
        <div className="fin-tabela-wrap">
          <table className="fin-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Hora</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {extratoFiltrado.map((s) => (
                <tr key={s.id}>
                  <td>{fmtData(s.data)}</td>
                  <td>{mapaPacientes[s.pacienteId]?.nome || "—"}</td>
                  <td>{s.hora || "—"}</td>
                  <td>
                    {s.valor ? (
                      moeda(s.valor)
                    ) : (
                      <span className="fin-sem-valor">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`fin-badge ${s.pago ? "pago" : "pendente"}`}>
                      {s.pago ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td className="fin-acoes">
                    {!s.pago && (
                      <button
                        className="btn-pagar"
                        onClick={() => handleMarcarPago(s)}
                      >
                        Pagar
                      </button>
                    )}
                    {s.valor && (
                      <button
                        className="btn-recibo"
                        onClick={() => imprimirRecibo(s)}
                      >
                        Recibo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderComissoes = () => {
    // Agrupa sessões por profissional
    const porProf = {};
    sessoesComissao.forEach(s => {
      const pid = s.profissionalId;
      if (!pid) return;
      if (!porProf[pid]) porProf[pid] = { sessoes: [], totalGerado: 0 };
      porProf[pid].sessoes.push(s);
      porProf[pid].totalGerado += s.valor || 0;
    });

    const linhas = profissionais.map(p => {
      const dados = porProf[p.id] || { sessoes: [], totalGerado: 0 };
      const pct = Number(p.percentualComissao || 0);
      const valorAPagar = dados.totalGerado * (pct / 100);
      const salva = comissoesSalvas.find(c => c.profissionalId === p.id);
      return { prof: p, ...dados, pct, valorAPagar, status: salva ? "pago" : "pendente", salva };
    }).filter(l => l.sessoes.length > 0 || l.pct > 0);

    const handleMarcarPago = async (linha) => {
      setMarcandoCom(linha.prof.id);
      await registrarPagamentoComissao(workspaceId, mesComissao, linha.prof.id, {
        profissionalNome: linha.prof.nome,
        totalGerado: linha.totalGerado,
        percentual: linha.pct,
        valorPago: linha.valorAPagar,
        sessoes: linha.sessoes.length,
      });
      await carregarComissoes();
      setMarcandoCom(null);
    };

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Mês:
            <input type="month" value={mesComissao} onChange={e => setMesComissao(e.target.value)}
              style={{ marginLeft: 8, border: "1px solid #dadce0", borderRadius: 8, padding: "6px 10px", fontSize: 14 }} />
          </label>
        </div>

        {carregandoCom ? <p className="fin-vazio">Calculando...</p> : linhas.length === 0 ? (
          <p className="fin-vazio">Nenhuma sessão concluída neste mês ou nenhum profissional com % de comissão configurado.</p>
        ) : (
          <div className="fin-com-tabela-wrap">
            <table className="fin-com-tabela">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Sessões</th>
                  <th>Total gerado</th>
                  <th>% Comissão</th>
                  <th>Valor a pagar</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(l => (
                  <tr key={l.prof.id}>
                    <td>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: l.prof.cor || "#9c27b0", marginRight: 8 }} />
                      <strong>{l.prof.nome}</strong>
                    </td>
                    <td>{l.sessoes.length}</td>
                    <td>{moeda(l.totalGerado)}</td>
                    <td>{l.pct}%</td>
                    <td><strong style={{ color: "#1a73e8" }}>{moeda(l.valorAPagar)}</strong></td>
                    <td>
                      <span className={`fin-com-badge fin-com-badge--${l.status}`}>
                        {l.status === "pago" ? "✅ Pago" : "⏳ Pendente"}
                      </span>
                      {l.salva?.pagoEm && (
                        <span style={{ fontSize: 11, color: "#9aa0a6", display: "block" }}>
                          em {new Date(l.salva.pagoEm.toDate?.() || l.salva.pagoEm).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </td>
                    <td>
                      {l.status !== "pago" && (
                        <button className="fin-com-btn" onClick={() => handleMarcarPago(l)}
                          disabled={marcandoCom === l.prof.id}>
                          {marcandoCom === l.prof.id ? "..." : "Marcar pago"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const abas = [
    { key: "resumo",      label: "Resumo" },
    { key: "inadimplentes", label: "Inadimplentes" },
    { key: "porPaciente", label: "Por Cliente" },
    { key: "extrato",     label: "Extrato" },
    { key: "comissoes",   label: "💼 Comissões" },
  ];

  return (
    <div className="fin-container">
      <h2 className="fin-titulo">Financeiro</h2>

      <div className="fin-abas">
        {abas.map((a) => (
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
      ) : aba === "inadimplentes" ? (
        renderInadimplentes()
      ) : aba === "porPaciente" ? (
        renderPorPaciente()
      ) : aba === "comissoes" ? (
        renderComissoes()
      ) : (
        renderExtrato()
      )}

      {/* Recibo para impressão */}
      {reciboSessao && (
        <div className="recibo-print">
          <div className="recibo-box" ref={reciboRef}>
            <h2>RECIBO DE PAGAMENTO</h2>
            <div className="recibo-linha">
              <strong>Terapeuta:</strong> {terapeuta?.nome || ""}
            </div>
            <div className="recibo-linha">
              <strong>Cliente:</strong>{" "}
              {mapaPacientes[reciboSessao.pacienteId]?.nome || ""}
            </div>
            <div className="recibo-linha">
              <strong>Data da sessão:</strong> {fmtData(reciboSessao.data)}
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
              {fmtData(reciboSessao.data)}, dando plena quitação.
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
