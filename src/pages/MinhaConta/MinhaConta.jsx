import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePlano } from "../../hooks/usePlano";
import { listarCobrancas } from "../../services/planoService";
import { listarPlanos } from "../../services/planosService";
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

export default function MinhaConta() {
  const { terapeuta, workspaceId } = useAuth();
  const { usage, limites, diasRestantes } = usePlano(workspaceId);
  const [cobrancas, setCobrancas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [planos, setPlanos] = useState([]);
  const [modalPlanos, setModalPlanos] = useState(false);
  const pioneiro = terapeuta?.membroPioneiro;

  useEffect(() => {
    if (!workspaceId) return;
    listarCobrancas(workspaceId)
      .then(setCobrancas)
      .catch(() => {})
      .finally(() => setCarregando(false));
    listarPlanos().then(lista => setPlanos(lista.filter(p => p.ativo))).catch(() => {});
  }, [workspaceId]);

  const plano = terapeuta?.plano || "trial";
  const trialExpira = terapeuta?.trialExpira?.toDate?.() || (terapeuta?.trialExpira ? new Date(terapeuta.trialExpira) : null);
  const diasTrial = trialExpira ? Math.ceil((trialExpira - new Date()) / 86400000) : null;

  // Próxima cobrança pendente
  const pendentes = cobrancas.filter(c => c.status === "pendente").sort((a, b) => a.vencimento > b.vencimento ? 1 : -1);
  const proxima = pendentes[0] || null;
  const diasProxima = proxima ? diasAte(proxima.vencimento) : null;

  const statusProxima = diasProxima === null ? null
    : diasProxima < 0  ? "urgente"
    : diasProxima <= 5 ? "aviso"
    : "ok";

  const heroClass =
    plano === "ativo"     ? "mc-plano-hero--ativo"
    : plano === "bloqueado" ? "mc-plano-hero--bloqueado"
    : "mc-plano-hero--trial";

  const planoLabel =
    plano === "ativo"      ? "Plano Ativo"
    : plano === "bloqueado" ? "Conta Bloqueada"
    : "Período de Teste";

  const planoDesc =
    plano === "ativo"       ? `Obrigado por ser cliente! Seu acesso está liberado.`
    : plano === "bloqueado"  ? "Entre em contato com o suporte para reativar sua conta."
    : diasTrial !== null     ? `${diasTrial > 0 ? `${diasTrial} dias restantes` : "Trial expirado"} no período gratuito.`
    : "Período de teste ativo.";

  const pagas    = cobrancas.filter(c => c.status === "pago");
  const atrasadas = cobrancas.filter(c => {
    if (c.status !== "pendente") return false;
    return c.vencimento && new Date(c.vencimento + "T23:59") < new Date();
  });

  return (
    <div className="mc-page">
      <h2 className="mc-titulo">Meu Plano</h2>

      {/* Card Trial em destaque */}
      {plano === "trial" && (
        <div className={`mc-trial-destaque${diasRestantes !== null && diasRestantes <= 3 ? " mc-trial-urgente" : ""}`}>
          <div className="mc-trial-esquerda">
            <div className="mc-trial-icone">{diasRestantes === 0 ? "⚠️" : "⏳"}</div>
            <div>
              <div className="mc-trial-label">Período de teste</div>
              <div className="mc-trial-dias">
                {diasRestantes === null ? "Trial ativo" :
                 diasRestantes <= 0 ? "Trial encerrado" :
                 diasRestantes === 1 ? "Último dia!" :
                 `${diasRestantes} dias restantes`}
              </div>
              {pioneiro && (
                <div className="mc-trial-pioneiro">⭐ Você é Membro Pioneiro — desconto especial garantido!</div>
              )}
            </div>
          </div>
          <button className="mc-trial-cta" onClick={() => setModalPlanos(true)}>
            Ver planos →
          </button>
        </div>
      )}

      {/* Modal Ver Planos */}
      {modalPlanos && (
        <div className="mc-modal-overlay" onClick={() => setModalPlanos(false)}>
          <div className="mc-modal-planos" onClick={e => e.stopPropagation()}>
            <div className="mc-modal-header">
              <h3>Escolha seu plano</h3>
              {pioneiro && <div className="mc-modal-pioneiro-badge">⭐ Preços especiais de Membro Pioneiro aplicados</div>}
              <button className="mc-modal-fechar" onClick={() => setModalPlanos(false)}>✕</button>
            </div>
            <div className="mc-modal-grid">
              {planos.map(p => {
                const preco = pioneiro && p.precoPioneiro ? p.precoPioneiro : p.preco;
                const precoOriginal = pioneiro && p.precoPioneiro ? p.preco : null;
                return (
                  <div key={p.id} className={`mc-plano-card${p.destaque ? " mc-plano-destaque" : ""}`}>
                    {p.destaque && <div className="mc-plano-tag">MAIS POPULAR</div>}
                    {pioneiro && p.precoPioneiro && <div className="mc-plano-tag-pioneiro">⭐ PIONEIRO</div>}
                    <div className="mc-plano-card-nome">{p.nome}</div>
                    <div className="mc-plano-card-desc">{p.descricao}</div>
                    <div className="mc-plano-card-preco">
                      {precoOriginal && (
                        <span className="mc-preco-riscado">R$ {Number(precoOriginal).toFixed(2).replace(".", ",")}</span>
                      )}
                      <span className="mc-preco-atual">R$ {Number(preco).toFixed(2).replace(".", ",")}<span className="mc-preco-periodo">/mês</span></span>
                    </div>
                    {Array.isArray(p.recursos) && (
                      <ul className="mc-plano-recursos">
                        {p.recursos.map((r, i) => <li key={i}>✅ {r}</li>)}
                      </ul>
                    )}
                    <a href="mailto:igorcroco@gmail.com?subject=Quero assinar o plano" className="mc-plano-assinar">
                      Assinar agora
                    </a>
                  </div>
                );
              })}
            </div>
            <p className="mc-modal-rodape">Dúvidas? <a href="mailto:igorcroco@gmail.com">igorcroco@gmail.com</a> · respondemos em até 24h</p>
          </div>
        </div>
      )}

      {/* Hero do plano */}
      <div className={`mc-plano-hero ${heroClass}`}>
        <div className="mc-plano-label">Seu plano</div>
        <div className="mc-plano-nome">{planoLabel}</div>
        <div className="mc-plano-desc">{planoDesc}</div>

        {plano === "trial" && diasTrial !== null && diasTrial <= 3 && (
          <div className="mc-plano-alerta">
            ⚠️ Seu trial expira em breve. Entre em contato para ativar o plano completo.
          </div>
        )}
        {plano === "bloqueado" && (
          <div className="mc-plano-alerta">
            🔒 Acesso restrito. Regularize seu pagamento para continuar usando a plataforma.
          </div>
        )}
        {atrasadas.length > 0 && plano !== "bloqueado" && (
          <div className="mc-plano-alerta">
            ⚠️ Você tem {atrasadas.length} cobrança{atrasadas.length > 1 ? "s" : ""} em atraso.
          </div>
        )}
      </div>

      {/* Uso do plano trial */}
      {plano === "trial" && limites && (
        <div className="mc-uso-card">
          <div className="mc-uso-titulo">
            ⏳ Trial
            {diasRestantes !== null && (
              <span className={`mc-uso-dias${diasRestantes <= 3 ? " mc-uso-dias--urgente" : diasRestantes <= 7 ? " mc-uso-dias--aviso" : ""}`}>
                {diasRestantes > 0 ? `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restantes` : "Expirado"}
              </span>
            )}
          </div>
          <div className="mc-uso-itens">
            {[
              { label: "Clientes",      usado: usage.pacientes,    limite: limites.pacientes,    icone: "👥" },
              { label: "Agendamentos",  usado: usage.agendamentos, limite: limites.agendamentos, icone: "📅" },
              { label: "Documentos",    usado: usage.documentos,   limite: limites.documentos,   icone: "📄" },
            ].map(({ label, usado, limite, icone }) => {
              const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
              const urgente = pct >= 100;
              const aviso   = pct >= 75 && !urgente;
              return (
                <div key={label} className="mc-uso-item">
                  <div className="mc-uso-item-header">
                    <span>{icone} {label}</span>
                    <span className={urgente ? "mc-uso-cheio" : ""}>
                      {usado} / {limite}
                    </span>
                  </div>
                  <div className="mc-uso-barra-bg">
                    <div
                      className={`mc-uso-barra${urgente ? " mc-uso-barra--cheio" : aviso ? " mc-uso-barra--aviso" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mc-uso-rodape">
            Quer mais? Entre em contato para ativar o plano completo.
            <a href="mailto:igorcroco@gmail.com" className="mc-uso-cta">Falar com suporte →</a>
          </div>
        </div>
      )}

      {/* Status rápido */}
      <div className="mc-status-grid">
        <div className={`mc-status-card${atrasadas.length > 0 ? " mc-status-card--urgente" : " mc-status-card--ok"}`}>
          <div className="mc-status-label">Em atraso</div>
          <div className="mc-status-valor">{atrasadas.length}</div>
          <div className="mc-status-sub">cobrança{atrasadas.length !== 1 ? "s" : ""}</div>
        </div>
        <div className={`mc-status-card${pendentes.length > 0 ? " mc-status-card--aviso" : " mc-status-card--ok"}`}>
          <div className="mc-status-label">Pendentes</div>
          <div className="mc-status-valor">{pendentes.length}</div>
          <div className="mc-status-sub">a vencer</div>
        </div>
        <div className="mc-status-card mc-status-card--ok">
          <div className="mc-status-label">Pagamentos</div>
          <div className="mc-status-valor">{pagas.length}</div>
          <div className="mc-status-sub">realizados</div>
        </div>
        <div className="mc-status-card mc-status-card--ok">
          <div className="mc-status-label">Total pago</div>
          <div className="mc-status-valor" style={{ fontSize: 16 }}>
            {moeda(pagas.reduce((s, c) => s + (c.valor || 0), 0))}
          </div>
          <div className="mc-status-sub">histórico</div>
        </div>
      </div>

      {/* Próxima cobrança */}
      {proxima && (
        <div className="mc-proxima-card">
          <div className="mc-proxima-icone">
            {statusProxima === "urgente" ? "🔴" : statusProxima === "aviso" ? "⚠️" : "📅"}
          </div>
          <div className="mc-proxima-info">
            <div className="mc-proxima-titulo">
              {statusProxima === "urgente"
                ? `Cobrança atrasada há ${Math.abs(diasProxima)} dia${Math.abs(diasProxima) !== 1 ? "s" : ""}`
                : statusProxima === "aviso"
                ? `Vence em ${diasProxima} dia${diasProxima !== 1 ? "s" : ""}`
                : `Próxima cobrança em ${diasProxima} dias`}
            </div>
            <div className="mc-proxima-data">
              {proxima.descricao || `Plano ${proxima.plano}`} · vence {fmtData(proxima.vencimento)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className={`mc-proxima-valor mc-proxima-valor--${statusProxima}`}>
              {moeda(proxima.valor)}
            </div>
            {proxima.linkPagamento && (
              <a href={proxima.linkPagamento} target="_blank" rel="noreferrer" className="mc-btn-pagar">
                💳 Pagar agora
              </a>
            )}
          </div>
        </div>
      )}

      {/* Histórico de cobranças */}
      <h3 className="mc-secao-titulo">Histórico de cobranças</h3>

      {carregando ? (
        <p style={{ color: "#9aa0a6" }}>Carregando...</p>
      ) : cobrancas.length === 0 ? (
        <div className="mc-vazio">Nenhuma cobrança registrada ainda.</div>
      ) : (
        <div className="mc-tabela-wrap">
          <table className="mc-tabela">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {cobrancas.map(c => {
                const atrasado = c.status === "pendente" && c.vencimento && new Date(c.vencimento + "T23:59") < new Date();
                const statusKey = atrasado ? "atrasado" : c.status;
                const statusLabel = { pago: "✅ Pago", pendente: "🕐 Pendente", atrasado: "⚠️ Atrasado", cancelado: "❌ Cancelado" };
                return (
                  <tr key={c.id}>
                    <td>{c.descricao || "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.plano || "—"}</td>
                    <td><strong>{moeda(c.valor)}</strong></td>
                    <td>{fmtData(c.vencimento)}</td>
                    <td><span className={`mc-badge mc-badge--${statusKey}`}>{statusLabel[statusKey] || c.status}</span></td>
                    <td>{c.pagoEm ? new Date(c.pagoEm?.toDate?.() || c.pagoEm).toLocaleDateString("pt-BR") : c.linkPagamento && c.status === "pendente" ? (
                      <a href={c.linkPagamento} target="_blank" rel="noreferrer" className="mc-btn-pagar">
                        💳 Pagar agora
                      </a>
                    ) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Suporte */}
      <div className="mc-suporte">
        <div className="mc-suporte-texto">
          <strong>Dúvidas sobre cobrança ou plano?</strong><br />
          Entre em contato com nosso suporte e resolveremos rapidamente.
        </div>
        <a href="mailto:igorcroco@gmail.com" className="mc-suporte-btn">
          ✉️ Falar com suporte
        </a>
      </div>
    </div>
  );
}
