import React, { useState } from "react";
import "../../styles/pagina-profissional.css";

function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function Faq({ itens }) {
  const [aberto, setAberto] = useState(null);
  if (!itens?.length) return null;
  return (
    <div className="pp-faq-lista">
      {itens.map((item, i) => (
        <div key={i} className={`pp-faq-item${aberto === i ? " aberto" : ""}`}>
          <button className="pp-faq-pergunta" onClick={() => setAberto(aberto === i ? null : i)}>
            {item.pergunta}
            <span className="pp-faq-icon">{aberto === i ? "−" : "+"}</span>
          </button>
          {aberto === i && <div className="pp-faq-resposta">{item.resposta}</div>}
        </div>
      ))}
    </div>
  );
}

const IconeWpp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function PaginaProfissional({ config, workspace, onEntrar }) {
  const c = config || {};
  const whatsapp    = (c.pagWhatsapp || "").replace(/\D/g, "");
  const whatsappUrl = whatsapp
    ? `https://wa.me/55${whatsapp}?text=${encodeURIComponent(c.pagMensagemWhatsapp || "Olá! Gostaria de agendar uma consulta.")}`
    : null;

  const video         = embedUrl(c.pagVideo);
  const especialidades = c.pagEspecialidades || [];
  const depoimentos    = c.pagDepoimentos    || [];
  const processo       = c.pagProcesso       || [];
  const faq            = c.pagFaq            || [];

  const nomeClinica = c.nomeClinica || workspace?.nome || "Terapeuta";
  const corPrimaria = c.pagCorPrimaria || "#6B5B95";
  const corRgb      = hexToRgb(corPrimaria);

  const BtnWpp = ({ texto, className }) =>
    whatsappUrl ? (
      <a href={whatsappUrl} target="_blank" rel="noreferrer"
        className={`pp-btn-wpp ${className || ""}`}
        style={{ background: corPrimaria }}>
        <IconeWpp />
        {texto || "Falar no WhatsApp"}
      </a>
    ) : null;

  const cssVars = {
    "--pp-cor":     corPrimaria,
    "--pp-cor-rgb": corRgb,
    "--pp-bg":      c.pagCorFundo || "#FAFAF8",
  };

  return (
    <div className="pp-page" style={cssVars}>

      {/* ── HERO ── */}
      <section className="pp-hero">
        <div className="pp-hero-bg" />
        <div className="pp-hero-noise" />
        <div className="pp-hero-inner">

          <div className="pp-hero-texto">
            {c.pagCidade && (
              <div className="pp-hero-pill">
                <span>📍</span> {c.pagCidade}
              </div>
            )}
            <h1 className="pp-hero-titulo">
              {c.pagHeadline
                ? <span dangerouslySetInnerHTML={{ __html: c.pagHeadline.replace(/\*(.*?)\*/g, "<em>$1</em>") }} />
                : nomeClinica}
            </h1>
            {c.pagSubheadline && (
              <p className="pp-hero-sub">{c.pagSubheadline}</p>
            )}
            <BtnWpp texto={c.pagBtnTexto || "Falar Comigo no WhatsApp"} className="pp-btn-hero" />
          </div>

          {c.pagFoto && (
            <div className="pp-hero-foto-wrap">
              <div className="pp-hero-foto-ring">
                <img src={c.pagFoto} alt={nomeClinica} className="pp-hero-foto" />
              </div>
              <div className="pp-hero-deco" />
            </div>
          )}
        </div>
      </section>

      {/* ── VIDEO ── */}
      {video && (
        <section className="pp-section pp-video-section">
          <div className="pp-container">
            <div className="pp-section-label">Conheça meu trabalho</div>
            <h2 className="pp-section-titulo" style={{ textAlign: "center" }}>
              {c.pagVideoTitulo || "Assista e conheça mais"}
            </h2>
            <div className="pp-video-wrap">
              <iframe src={video} title="Apresentação"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>
          </div>
        </section>
      )}

      {/* ── ESPECIALIDADES ── */}
      {especialidades.length > 0 && (
        <section className="pp-section pp-especialidades-section">
          <div className="pp-container">
            <div className="pp-section-label">Como posso te ajudar</div>
            <h2 className="pp-section-titulo">
              {c.pagEspecialidadesTitulo || "Áreas de Atuação"}
            </h2>
            <div className="pp-esp-grid">
              {especialidades.map((e, i) => (
                <div key={i} className="pp-esp-card">
                  <span className="pp-esp-icone">{e.icone || "🌿"}</span>
                  <div className="pp-esp-nome">{e.titulo}</div>
                  {e.descricao && <div className="pp-esp-desc">{e.descricao}</div>}
                </div>
              ))}
            </div>
            <div className="pp-section-cta">
              <BtnWpp texto="Quero começar agora" />
            </div>
          </div>
        </section>
      )}

      {/* ── BIO ── */}
      {(c.pagBio || c.pagFormacao) && (
        <section className="pp-section pp-bio-section">
          <div className="pp-container pp-bio-inner">
            {c.pagFotoBio && (
              <div className="pp-bio-foto-wrap">
                <img src={c.pagFotoBio} alt={nomeClinica} className="pp-bio-foto" />
                {c.pagFormacao  && <div className="pp-bio-badge">🎓 {c.pagFormacao}</div>}
                {c.pagAbordagem && <div className="pp-bio-badge">💡 {c.pagAbordagem}</div>}
              </div>
            )}
            <div className="pp-bio-texto">
              <div className="pp-section-label">Sobre mim</div>
              <h2 className="pp-section-titulo">{nomeClinica}</h2>
              {c.pagBio && <p className="pp-bio-desc">{c.pagBio}</p>}
              <BtnWpp texto="Vamos conversar" />
            </div>
          </div>
        </section>
      )}

      {/* ── DEPOIMENTOS ── */}
      {depoimentos.length > 0 && (
        <section className="pp-section pp-depoimentos-section">
          <div className="pp-container">
            <div className="pp-section-label">Resultados reais</div>
            <h2 className="pp-section-titulo">O que dizem meus clientes</h2>
            <div className="pp-dep-grid">
              {depoimentos.map((d, i) => (
                <div key={i} className="pp-dep-card">
                  <div className="pp-dep-quote">"</div>
                  <div className="pp-dep-stars">
                    {"★★★★★".split("").map((s, j) => (
                      <span key={j} style={{ color: corPrimaria }}>{s}</span>
                    ))}
                  </div>
                  <p className="pp-dep-texto">"{d.texto}"</p>
                  <div className="pp-dep-autor-row">
                    <div className="pp-dep-avatar" style={{ background: `rgba(${corRgb}, 0.12)`, color: corPrimaria }}>
                      {(d.autor || "?")[0].toUpperCase()}
                    </div>
                    <div className="pp-dep-autor">{d.autor}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pp-section-cta">
              <BtnWpp texto="Quero minha transformação" />
            </div>
          </div>
        </section>
      )}

      {/* ── PROCESSO ── */}
      {processo.length > 0 && (
        <section className="pp-section pp-processo-section">
          <div className="pp-container">
            <div className="pp-section-label">Passo a passo</div>
            <h2 className="pp-section-titulo">
              {c.pagProcessoTitulo || "Como funciona o processo"}
            </h2>
            <div className="pp-processo-lista">
              {processo.map((p, i) => (
                <div key={i} className="pp-processo-item">
                  <div className="pp-processo-num" style={{ background: corPrimaria }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="pp-processo-nome">{p.titulo}</div>
                    {p.descricao && <div className="pp-processo-desc">{p.descricao}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="pp-section-cta">
              <BtnWpp texto="Quero começar" />
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faq.length > 0 && (
        <section className="pp-section pp-faq-section">
          <div className="pp-container">
            <div className="pp-section-label">Dúvidas Frequentes</div>
            <h2 className="pp-section-titulo">Perguntas frequentes</h2>
            <Faq itens={faq} />
            <div className="pp-section-cta">
              <BtnWpp texto="Ainda tem dúvidas? Fale comigo" />
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FINAL ── */}
      <section className="pp-cta-final" style={{ background: corPrimaria }}>
        <div className="pp-container pp-cta-inner">
          <h2 className="pp-cta-titulo">
            {c.pagCtaTitulo || "Pronto para dar o primeiro passo?"}
          </h2>
          <p className="pp-cta-sub">
            {c.pagCtaSub || "Cada jornada começa com uma conversa. Vamos começar a sua."}
          </p>
          <BtnWpp texto={c.pagBtnTexto || "Falar Comigo no WhatsApp"} className="pp-btn-cta-final" />
        </div>
      </section>

      {/* ── RODAPÉ ── */}
      <footer className="pp-footer">
        <span>© {new Date().getFullYear()} {nomeClinica}</span>
        {onEntrar && (
          <button className="pp-footer-entrar" onClick={onEntrar}>
            Entrar no sistema →
          </button>
        )}
      </footer>
    </div>
  );
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "107,91,149";
  return `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`;
}
