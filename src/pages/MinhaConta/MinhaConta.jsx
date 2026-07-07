import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePlano } from "../../hooks/usePlano";
import { listarCobrancas } from "../../services/planoService";
import { listarPlanos } from "../../services/planosService";
import { criarCobrancaAsaas } from "../../services/asaasService";
import "../../styles/minha-conta.css";

const moeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (iso) =>
  iso ? new Date(iso + "T00:00").toLocaleDateString("pt-BR") : "—";

const diasAte = (iso) => {
  if (!iso) return null;
  const diff = new Date(iso + "T00:00") - new Date();
  return Math.ceil(diff / 86400000);
};

function vencimento30dias() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function MinhaConta() {
  const { terapeuta, workspaceId } = useAuth();
  const { usage, limites, diasRestantes } = usePlano(workspaceId);
  const [cobrancas, setCobrancas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [planos, setPlanos] = useState([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  // Checkout
  const [checkout, setCheckout] = useState(null); // { plano, preco }
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [processando, setProcessando] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);

  const pioneiro = terapeuta?.membroPioneiro;
  const plano = terapeuta?.plano || "trial";

  useEffect(() => {
    if (!workspaceId) return;
    listarCobrancas(workspaceId).then(setCobrancas).catch(() => {}).finally(() => setCarregando(false));
    listarPlanos().then(lista => setPlanos(lista.filter(p => p.ativo))).catch(() => {});
  }, [workspaceId]);

  const pendentes = cobrancas.filter(c => c.status === "pendente").sort((a, b) => a.vencimento > b.vencimento ? 1 : -1);
  const proxima = pendentes[0] || null;
  const diasProxima = proxima ? diasAte(proxima.vencimento) : null;
  const statusProxima = diasProxima === null ? null : diasProxima < 0 ? "urgente" : diasProxima <= 5 ? "aviso" : "ok";
  const atrasadas = cobrancas.filter(c => c.status === "pendente" && c.vencimento && new Date(c.vencimento + "T23:59") < new Date());

  const handleAssinar = (p) => {
    const preco = pioneiro && p.precoPioneiro ? p.precoPioneiro : p.preco;
    setCheckout({ plano: p, preco });
    setLinkGerado(null);
    setCpfCnpj("");
    setTelefone("");
  };

  const handleConfirmarCheckout = async (e) => {
    e.preventDefault();
    if (!cpfCnpj) { alert("Informe seu CPF ou CNPJ para continuar."); return; }
    setProcessando(true);
    try {
      const venc = vencimento30dias();
      const desc = `Plano ${checkout.plano.nome} — Novu`;
      const result = await criarCobrancaAsaas({
        nome: terapeuta?.nome || "Terapeuta",
        email: terapeuta?.email || "",
        cpfCnpj,
        mobilePhone: telefone,
        valor: checkout.preco,
        vencimento: venc,
        descricao: desc,
        externalReference: workspaceId,
      });
      setLinkGerado(result.linkPagamento);
      window.open(result.linkPagamento, "_blank");
    } catch (err) {
      alert("Erro ao gerar cobrança: " + err.message);
    }
    setProcessando(false);
  };

  return (
    <div className="mc-page">

      {/* ── Status atual ── */}
      <div className="mc-hero-status">
        <div className="mc-hero-left">
          <div className="mc-hero-label">Seu plano atual</div>
          <div className="mc-hero-plano">
            {plano === "ativo" ? "✅ Plano Ativo" : plano === "bloqueado" ? "🔒 Conta Bloqueada" : "⏳ Período de Teste (Trial)"}
          </div>
          {plano === "trial" && diasRestantes !== null && (
            <div className={`mc-hero-dias${diasRestantes <= 3 ? " urgente" : diasRestantes <= 7 ? " aviso" : ""}`}>
              {diasRestantes <= 0 ? "Trial encerrado — escolha um plano abaixo" :
               diasRestantes === 1 ? "Último dia do trial!" :
               `${diasRestantes} dias restantes no trial`}
            </div>
          )}
          {pioneiro && (
            <div className="mc-hero-pioneiro">⭐ Você é Membro Pioneiro — preços especiais aplicados</div>
          )}
          {atrasadas.length > 0 && (
            <div className="mc-hero-alerta">⚠️ Você tem {atrasadas.length} cobrança{atrasadas.length > 1 ? "s" : ""} em atraso</div>
          )}
        </div>

        {plano === "trial" && limites && (
          <div className="mc-hero-uso">
            {[
              { label: "Clientes",     usado: usage.pacientes,    limite: limites.pacientes,    icone: "👥" },
              { label: "Agendamentos", usado: usage.agendamentos, limite: limites.agendamentos, icone: "📅" },
              { label: "Documentos",   usado: usage.documentos,   limite: limites.documentos,   icone: "📄" },
            ].map(({ label, usado, limite, icone }) => {
              const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
              return (
                <div key={label} className="mc-hero-uso-item">
                  <div className="mc-hero-uso-label">{icone} {label} <span>{usado}/{limite}</span></div>
                  <div className="mc-uso-barra-bg">
                    <div className={`mc-uso-barra${pct >= 100 ? " mc-uso-barra--cheio" : pct >= 75 ? " mc-uso-barra--aviso" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Próxima cobrança pendente ── */}
      {proxima && (
        <div className={`mc-proxima-card mc-proxima-card--${statusProxima}`}>
          <div className="mc-proxima-icone">{statusProxima === "urgente" ? "🔴" : statusProxima === "aviso" ? "⚠️" : "📅"}</div>
          <div className="mc-proxima-info">
            <div className="mc-proxima-titulo">
              {statusProxima === "urgente" ? `Cobrança atrasada há ${Math.abs(diasProxima)} dia${Math.abs(diasProxima) !== 1 ? "s" : ""}` :
               statusProxima === "aviso" ? `Vence em ${diasProxima} dia${diasProxima !== 1 ? "s" : ""}` :
               `Próxima cobrança em ${diasProxima} dias`}
            </div>
            <div className="mc-proxima-data">{proxima.descricao || `Plano ${proxima.plano}`} · vence {fmtData(proxima.vencimento)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className={`mc-proxima-valor mc-proxima-valor--${statusProxima}`}>{moeda(proxima.valor)}</div>
            {proxima.linkPagamento && (
              <a href={proxima.linkPagamento} target="_blank" rel="noreferrer" className="mc-btn-pagar">💳 Pagar agora</a>
            )}
          </div>
        </div>
      )}

      {/* ── Planos ── */}
      {plano !== "ativo" && (
        <div className="mc-planos-section">
          <div className="mc-planos-header">
            <h2 className="mc-planos-titulo">Escolha seu plano</h2>
            <p className="mc-planos-sub">Cancele quando quiser · Sem fidelidade · Dados sempre seus</p>
            {pioneiro && (
              <div className="mc-planos-pioneiro-banner">
                ⭐ <strong>Membro Pioneiro:</strong> seus preços exclusivos já estão aplicados abaixo
              </div>
            )}
          </div>

          <div className="mc-planos-grid">
            {planos.map(p => {
              const preco = pioneiro && p.precoPioneiro ? p.precoPioneiro : p.preco;
              const precoOriginal = pioneiro && p.precoPioneiro ? p.preco : null;
              return (
                <div key={p.id} className={`mc-plan-card${p.destaque ? " mc-plan-card--destaque" : ""}`}>
                  {p.destaque && <div className="mc-plan-badge">Mais popular</div>}

                  <div className="mc-plan-nome">{p.nome}</div>
                  <div className="mc-plan-desc">{p.descricao}</div>

                  <div className="mc-plan-preco-wrap">
                    {precoOriginal && (
                      <div className="mc-plan-preco-original">R$ {Number(precoOriginal).toFixed(2).replace(".", ",")}/mês</div>
                    )}
                    <div className="mc-plan-preco">
                      <span className="mc-plan-cifrao">R$</span>
                      <span className="mc-plan-valor">{Number(preco).toFixed(2).replace(".", ",")}</span>
                      <span className="mc-plan-periodo">/mês</span>
                    </div>
                    {pioneiro && p.precoPioneiro && (
                      <div className="mc-plan-economia">
                        Você economiza R$ {(Number(p.preco) - Number(p.precoPioneiro)).toFixed(2).replace(".", ",")} /mês
                      </div>
                    )}
                  </div>

                  <button
                    className={`mc-plan-btn${p.destaque ? " mc-plan-btn--destaque" : ""}`}
                    onClick={() => handleAssinar(p)}
                  >
                    Assinar agora
                  </button>

                  {Array.isArray(p.recursos) && p.recursos.length > 0 && (
                    <ul className="mc-plan-lista">
                      {p.recursos.map((r, i) => (
                        <li key={i}><span className="mc-plan-check">✓</span> {r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mc-planos-rodape">
            Dúvidas? Fale com a gente pelo{" "}
            <a href="mailto:igorcroco@gmail.com">igorcroco@gmail.com</a>
          </p>
        </div>
      )}

      {/* ── Histórico (colapsável) ── */}
      <div className="mc-historico-wrap">
        <button className="mc-historico-toggle" onClick={() => setHistoricoAberto(v => !v)}>
          📋 Histórico de cobranças {cobrancas.length > 0 && `(${cobrancas.length})`}
          <span>{historicoAberto ? "▲" : "▼"}</span>
        </button>

        {historicoAberto && (
          carregando ? <p style={{ color: "#9aa0a6", padding: "12px 0" }}>Carregando...</p> :
          cobrancas.length === 0 ? <div className="mc-vazio">Nenhuma cobrança registrada ainda.</div> : (
            <div className="mc-tabela-wrap">
              <table className="mc-tabela">
                <thead>
                  <tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {cobrancas.map(c => {
                    const atrasado = c.status === "pendente" && c.vencimento && new Date(c.vencimento + "T23:59") < new Date();
                    const sk = atrasado ? "atrasado" : c.status;
                    const sl = { pago: "✅ Pago", pendente: "🕐 Pendente", atrasado: "⚠️ Atrasado", cancelado: "❌ Cancelado" };
                    return (
                      <tr key={c.id}>
                        <td>{c.descricao || "—"}</td>
                        <td><strong>{moeda(c.valor)}</strong></td>
                        <td>{fmtData(c.vencimento)}</td>
                        <td><span className={`mc-badge mc-badge--${sk}`}>{sl[sk] || c.status}</span></td>
                        <td>{c.linkPagamento && c.status === "pendente" && (
                          <a href={c.linkPagamento} target="_blank" rel="noreferrer" className="mc-btn-pagar">💳 Pagar</a>
                        )}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Modal Checkout ── */}
      {checkout && (
        <div className="mc-modal-overlay" onClick={() => !processando && setCheckout(null)}>
          <div className="mc-checkout-modal" onClick={e => e.stopPropagation()}>

            {!linkGerado ? (
              <>
                <button className="mc-modal-fechar" onClick={() => setCheckout(null)}>✕</button>
                <div className="mc-checkout-header">
                  <div className="mc-checkout-icone">💳</div>
                  <h3>Assinar {checkout.plano.nome}</h3>
                  <div className="mc-checkout-preco">
                    R$ {Number(checkout.preco).toFixed(2).replace(".", ",")}<span>/mês</span>
                  </div>
                </div>

                <form onSubmit={handleConfirmarCheckout} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="mc-checkout-field">
                    <label>Nome completo</label>
                    <input type="text" value={terapeuta?.nome || ""} readOnly style={{ background: "#f8f9fa" }} />
                  </div>
                  <div className="mc-checkout-field">
                    <label>E-mail</label>
                    <input type="email" value={terapeuta?.email || ""} readOnly style={{ background: "#f8f9fa" }} />
                  </div>
                  <div className="mc-checkout-field">
                    <label>CPF / CNPJ <span style={{ color: "#e53e3e" }}>*</span></label>
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={e => setCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div className="mc-checkout-field">
                    <label>WhatsApp <span style={{ color: "#aaa", fontSize: 11 }}>(opcional)</span></label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={e => setTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="mc-checkout-metodos">
                    <span>💳</span><span>PIX</span><span>📄</span>
                    <small>Você escolhe a forma de pagamento na próxima tela</small>
                  </div>

                  <button type="submit" className="mc-checkout-btn" disabled={processando}>
                    {processando ? "Gerando cobrança..." : `Continuar para pagamento →`}
                  </button>
                  <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", margin: 0 }}>
                    Você será direcionado para a página segura de pagamento
                  </p>
                </form>
              </>
            ) : (
              <div className="mc-checkout-sucesso">
                <div style={{ fontSize: 48 }}>🎉</div>
                <h3>Cobrança gerada!</h3>
                <p>Uma nova aba foi aberta com seu link de pagamento. Se não abriu, clique abaixo.</p>
                <a href={linkGerado} target="_blank" rel="noreferrer" className="mc-checkout-btn">
                  Abrir link de pagamento ↗
                </a>
                <button className="mc-modal-fechar-link" onClick={() => setCheckout(null)}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
