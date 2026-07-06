import React, { useState, useEffect } from "react";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.navigator.standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

export default function InstallPrompt() {
  const [visivel, setVisivel] = useState(false);
  const [plataforma, setPlataforma] = useState(null); // "ios" | "android" | "outro"
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    // Já está instalado ou usuário já dispensou
    if (isStandalone()) return;
    if (localStorage.getItem("pwa_dispensado")) return;

    if (isIOS()) {
      setPlataforma("ios");
      setVisivel(true);
    } else if (isAndroid()) {
      setPlataforma("android");
      // Aguarda evento nativo do Chrome
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisivel(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      // Se não vier o evento em 3s, mostra tutorial manual
      const timer = setTimeout(() => {
        setVisivel(true);
      }, 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(timer);
      };
    } else {
      // Desktop ou outro — não mostra
    }
  }, []);

  const dispensar = () => {
    localStorage.setItem("pwa_dispensado", "1");
    setVisivel(false);
  };

  const instalarAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dispensar();
      setDeferredPrompt(null);
    } else {
      // Sem evento nativo, mostra tutorial manual
      setPlataforma("android-manual");
    }
  };

  if (!visivel) return null;

  // ── iOS Tutorial ──
  if (plataforma === "ios") {
    const passos = [
      {
        icone: "⬆️",
        titulo: 'Toque em "Compartilhar"',
        desc: 'No Safari, toque no ícone de compartilhar na barra inferior (seta apontando para cima).',
      },
      {
        icone: "➕",
        titulo: '"Adicionar à Tela de Início"',
        desc: 'Role a lista e toque em "Adicionar à Tela de Início".',
      },
      {
        icone: "✅",
        titulo: "Confirme",
        desc: 'Toque em "Adicionar" no canto superior direito. Pronto!',
      },
    ];

    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.pill} />
          <div style={styles.appRow}>
            <div style={styles.appIcon}>N</div>
            <div>
              <div style={styles.appNome}>Novu</div>
              <div style={styles.appSub}>Adicione à tela de início</div>
            </div>
          </div>
          <p style={styles.intro}>
            Para a melhor experiência, instale o Novu como app no seu iPhone. É rápido e gratuito!
          </p>

          {/* Passos */}
          <div style={styles.passos}>
            {passos.map((p, i) => (
              <div
                key={i}
                style={{ ...styles.passo, opacity: passo === i ? 1 : 0.45, transform: passo === i ? "scale(1.02)" : "scale(1)", transition: "all 0.2s" }}
                onClick={() => setPasso(i)}
              >
                <div style={{ ...styles.passoNum, background: passo === i ? "#1a73e8" : "#e8edf3", color: passo === i ? "white" : "#666" }}>
                  {i + 1}
                </div>
                <div>
                  <div style={styles.passoTitulo}>{p.icone} {p.titulo}</div>
                  {passo === i && <div style={styles.passoDesc}>{p.desc}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Seta apontando para baixo (onde fica o botão compartilhar no iOS) */}
          <div style={styles.setaBox}>
            <div style={styles.setaTexto}>👇 Botão Compartilhar está aqui em baixo</div>
          </div>

          <button style={styles.btnDismiss} onClick={dispensar}>
            Agora não
          </button>
        </div>
      </div>
    );
  }

  // ── Android com prompt nativo ──
  if (plataforma === "android" && deferredPrompt) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.pill} />
          <div style={styles.appRow}>
            <div style={styles.appIcon}>N</div>
            <div>
              <div style={styles.appNome}>Novu</div>
              <div style={styles.appSub}>Adicione à tela de início</div>
            </div>
          </div>
          <p style={styles.intro}>
            Instale o Novu como app no seu celular para acesso rápido, sem precisar abrir o navegador!
          </p>
          <button style={styles.btnInstalar} onClick={instalarAndroid}>
            📲 Instalar agora
          </button>
          <button style={styles.btnDismiss} onClick={dispensar}>
            Agora não
          </button>
        </div>
      </div>
    );
  }

  // ── Android manual (sem evento nativo) ──
  if (plataforma === "android" || plataforma === "android-manual") {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.pill} />
          <div style={styles.appRow}>
            <div style={styles.appIcon}>N</div>
            <div>
              <div style={styles.appNome}>Novu</div>
              <div style={styles.appSub}>Adicione à tela de início</div>
            </div>
          </div>
          <p style={styles.intro}>
            Para instalar o Novu como app, siga os passos abaixo:
          </p>
          <div style={styles.passos}>
            {[
              { icone: "⋮", titulo: 'Toque nos "3 pontinhos"', desc: "No canto superior direito do Chrome." },
              { icone: "➕", titulo: '"Adicionar à tela inicial"', desc: 'Toque nessa opção no menu.' },
              { icone: "✅", titulo: "Confirme", desc: 'Toque em "Adicionar". Pronto!' },
            ].map((p, i) => (
              <div
                key={i}
                style={{ ...styles.passo, opacity: passo === i ? 1 : 0.45 }}
                onClick={() => setPasso(i)}
              >
                <div style={{ ...styles.passoNum, background: passo === i ? "#1a73e8" : "#e8edf3", color: passo === i ? "white" : "#666" }}>
                  {i + 1}
                </div>
                <div>
                  <div style={styles.passoTitulo}>{p.icone} {p.titulo}</div>
                  {passo === i && <div style={styles.passoDesc}>{p.desc}</div>}
                </div>
              </div>
            ))}
          </div>
          <button style={styles.btnDismiss} onClick={dispensar}>
            Agora não
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-end",
  },
  modal: {
    width: "100%",
    background: "white",
    borderRadius: "20px 20px 0 0",
    padding: "12px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  pill: {
    width: 40,
    height: 4,
    background: "#ddd",
    borderRadius: 99,
    margin: "0 auto 4px",
  },
  appRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
    color: "white",
    fontSize: 26,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appNome: {
    fontSize: 18,
    fontWeight: 800,
    color: "#1a2535",
  },
  appSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  intro: {
    margin: 0,
    fontSize: 14,
    color: "#444",
    lineHeight: 1.5,
  },
  passos: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  passo: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#f8f9fa",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  passoNum: {
    width: 28,
    height: 28,
    borderRadius: 99,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
    transition: "all 0.2s",
  },
  passoTitulo: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a2535",
  },
  passoDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 1.4,
  },
  setaBox: {
    background: "#fff3cd",
    borderRadius: 10,
    padding: "10px 14px",
    textAlign: "center",
  },
  setaTexto: {
    fontSize: 13,
    color: "#856404",
    fontWeight: 600,
  },
  btnInstalar: {
    padding: "14px",
    background: "#1a73e8",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  btnDismiss: {
    padding: "12px",
    background: "none",
    color: "#888",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
  },
};
