import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export type VoiceCommand = {
  /** Patterns to match (lowercase). Supports multiple languages. */
  patterns: Record<string, string[]>;
  /** Action to execute */
  action: () => void;
  /** Description key for help display */
  descKey: string;
};

interface UseVoiceAssistantOptions {
  onNavigate?: (path: string) => void;
}

const LANG_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-TN",
  es: "es-ES",
  de: "de-DE",
  tr: "tr-TR",
  it: "it-IT",
  pt: "pt-BR",
};

export function useVoiceAssistant(options?: UseVoiceAssistantOptions) {
  const { i18n, t } = useTranslation();
  const [, navigate] = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Use refs for stable access from speech recognition callbacks
  const navigateRef = useRef<(path: string) => void>(navigate);
  navigateRef.current = options?.onNavigate ?? ((p: string) => navigate(p));

  // Check support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  // Build commands — use navigateRef.current so actions always have the latest navigate
  const getCommands = useCallback((): VoiceCommand[] => {
    return [
      {
        patterns: {
          fr: ["accueil", "aller à l'accueil", "page d'accueil", "retour"],
          en: ["home", "go home", "go to home", "main page", "back"],
          ar: ["الرئيسية", "الصفحة الرئيسية", "رجوع"],
          es: ["inicio", "ir al inicio", "página principal"],
          de: ["startseite", "zur startseite", "hauptseite"],
          tr: ["ana sayfa", "anasayfa", "geri"],
          it: ["home", "pagina principale", "inizio"],
          pt: ["início", "página inicial", "voltar"],
        },
        action: () => navigateRef.current("/"),
        descKey: "voice.cmdHome",
      },
      {
        patterns: {
          fr: ["connexion", "se connecter", "connecter", "login"],
          en: ["login", "sign in", "log in", "connect"],
          ar: ["تسجيل الدخول", "دخول"],
          es: ["iniciar sesión", "conectar", "login"],
          de: ["anmelden", "einloggen", "login"],
          tr: ["giriş yap", "oturum aç"],
          it: ["accedi", "login", "accesso"],
          pt: ["entrar", "login", "acessar"],
        },
        action: () => navigateRef.current("/login"),
        descKey: "voice.cmdLogin",
      },
      {
        patterns: {
          fr: ["inscription", "s'inscrire", "créer un compte", "nouveau compte"],
          en: ["register", "sign up", "create account", "new account"],
          ar: ["تسجيل", "إنشاء حساب", "حساب جديد"],
          es: ["registrarse", "crear cuenta", "nueva cuenta"],
          de: ["registrieren", "konto erstellen", "neues konto"],
          tr: ["kayıt ol", "hesap oluştur", "yeni hesap"],
          it: ["registrati", "crea account", "nuovo account"],
          pt: ["registrar", "criar conta", "nova conta"],
        },
        action: () => navigateRef.current("/register"),
        descKey: "voice.cmdRegister",
      },
      {
        patterns: {
          fr: ["créer un cas", "nouveau cas", "publier un cas", "ajouter un cas"],
          en: ["create case", "new case", "publish case", "add case"],
          ar: ["إنشاء حالة", "حالة جديدة", "إضافة حالة"],
          es: ["crear caso", "nuevo caso", "publicar caso"],
          de: ["fall erstellen", "neuer fall", "fall veröffentlichen"],
          tr: ["vaka oluştur", "yeni vaka", "vaka ekle"],
          it: ["crea caso", "nuovo caso", "pubblica caso"],
          pt: ["criar caso", "novo caso", "publicar caso"],
        },
        action: () => navigateRef.current("/create-case"),
        descKey: "voice.cmdCreateCase",
      },
      {
        patterns: {
          fr: ["tableau de bord", "dashboard", "mon espace", "espace personnel"],
          en: ["dashboard", "my dashboard", "my space", "my area"],
          ar: ["لوحة التحكم", "لوحة القيادة", "مساحتي"],
          es: ["panel", "tablero", "mi espacio", "dashboard"],
          de: ["dashboard", "mein bereich", "übersicht"],
          tr: ["panel", "kontrol paneli", "benim alanım"],
          it: ["dashboard", "pannello", "il mio spazio"],
          pt: ["painel", "dashboard", "meu espaço"],
        },
        action: () => navigateRef.current("/dashboard/donor"),
        descKey: "voice.cmdDashboard",
      },
      {
        patterns: {
          fr: ["administration", "admin", "panneau admin"],
          en: ["admin", "administration", "admin panel"],
          ar: ["إدارة", "لوحة الإدارة"],
          es: ["administración", "admin", "panel admin"],
          de: ["administration", "admin", "verwaltung"],
          tr: ["yönetim", "admin", "yönetim paneli"],
          it: ["amministrazione", "admin", "pannello admin"],
          pt: ["administração", "admin", "painel admin"],
        },
        action: () => navigateRef.current("/dashboard/admin"),
        descKey: "voice.cmdAdmin",
      },
      {
        patterns: {
          fr: ["cas santé", "santé", "cas médicaux", "maladie"],
          en: ["health cases", "health", "medical cases", "medical"],
          ar: ["حالات صحية", "صحة", "حالات طبية"],
          es: ["casos de salud", "salud", "casos médicos"],
          de: ["gesundheitsfälle", "gesundheit", "medizinische fälle"],
          tr: ["sağlık vakaları", "sağlık", "tıbbi vakalar"],
          it: ["casi sanitari", "salute", "casi medici"],
          pt: ["casos de saúde", "saúde", "casos médicos"],
        },
        action: () => {
          navigateRef.current("/");
        },
        descKey: "voice.cmdHealthCases",
      },
      {
        patterns: {
          fr: ["agrandir le texte", "texte plus grand", "police plus grande", "grande police"],
          en: ["bigger text", "larger text", "increase font", "bigger font"],
          ar: ["تكبير الخط", "خط أكبر", "نص أكبر"],
          es: ["texto más grande", "aumentar fuente", "fuente grande"],
          de: ["text vergrößern", "größere schrift", "schrift vergrößern"],
          tr: ["yazıyı büyüt", "büyük yazı", "font büyüt"],
          it: ["testo più grande", "ingrandire testo", "carattere grande"],
          pt: ["texto maior", "aumentar fonte", "fonte grande"],
        },
        action: () => {
          document.documentElement.classList.remove("font-normal", "font-xlarge");
          document.documentElement.classList.add("font-large");
        },
        descKey: "voice.cmdBiggerText",
      },
      {
        patterns: {
          fr: ["lire la page", "lecture vocale", "lire le contenu", "lecteur d'écran"],
          en: ["read page", "read aloud", "screen reader", "read content"],
          ar: ["اقرأ الصفحة", "قراءة صوتية", "قارئ الشاشة"],
          es: ["leer página", "lectura en voz alta", "lector de pantalla"],
          de: ["seite vorlesen", "vorlesen", "bildschirmleser"],
          tr: ["sayfayı oku", "sesli okuma", "ekran okuyucu"],
          it: ["leggi pagina", "lettura vocale", "lettore schermo"],
          pt: ["ler página", "leitura em voz alta", "leitor de tela"],
        },
        action: () => {
          // Toggle screen reader mode via accessibility context
          const btn = document.querySelector('[aria-label*="accessib"], [aria-label*="Accessib"], [aria-label*="ccessibilit"]') as HTMLButtonElement;
          if (btn) {
            btn.click();
            // Click the screen reader menu item after menu opens
            setTimeout(() => {
              const items = document.querySelectorAll('[role="menuitem"]');
              items.forEach((item) => {
                if (item.textContent?.toLowerCase().includes("lecteur") ||
                    item.textContent?.toLowerCase().includes("screen reader") ||
                    item.textContent?.toLowerCase().includes("reader")) {
                  (item as HTMLElement).click();
                }
              });
            }, 300);
          }
        },
        descKey: "voice.cmdReadPage",
      },
      {
        patterns: {
          fr: ["aide", "aide vocale", "quelles commandes", "que peux-tu faire"],
          en: ["help", "voice help", "what commands", "what can you do"],
          ar: ["مساعدة", "ماذا يمكنك", "الأوامر"],
          es: ["ayuda", "comandos de voz", "qué puedes hacer"],
          de: ["hilfe", "sprachhilfe", "was kannst du"],
          tr: ["yardım", "sesli yardım", "ne yapabilirsin"],
          it: ["aiuto", "comandi vocali", "cosa puoi fare"],
          pt: ["ajuda", "comandos de voz", "o que pode fazer"],
        },
        action: () => {
          // Feedback is set separately
        },
        descKey: "voice.cmdHelp",
      },
    ];
  }, []);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(""), 5000);
  }, []);

  // Speak feedback via TTS
  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      const lang = i18n.language?.split("-")[0] ?? "fr";
      utterance.lang = LANG_MAP[lang] || "fr-FR";
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [i18n.language]
  );

  // Keep a ref to processTranscript so the recognition callback always uses the latest
  const processTranscriptRef = useRef<(raw: string) => void>(() => {});

  const processTranscript = useCallback(
    (raw: string) => {
      const text = raw.toLowerCase().trim();
      if (!text) return;

      const lang = i18n.language?.split("-")[0] ?? "fr";
      const commands = getCommands();

      // Check for help command first
      const helpCmd = commands.find((c) => c.descKey === "voice.cmdHelp");
      const helpPatterns = helpCmd?.patterns[lang] || helpCmd?.patterns["fr"] || [];
      const isHelp = helpPatterns.some((p) => text.includes(p));

      if (isHelp) {
        const helpLines = commands
          .filter((c) => c.descKey !== "voice.cmdHelp")
          .map((c) => {
            const example = (c.patterns[lang] || c.patterns["fr"] || [])[0];
            return `"${example}" → ${t(c.descKey)}`;
          })
          .join("\n");
        showFeedback(t("voice.helpTitle") + "\n" + helpLines);
        speak(t("voice.helpSpoken"));
        return;
      }

      // Try to match a command
      for (const cmd of commands) {
        const patterns = cmd.patterns[lang] || cmd.patterns["fr"] || [];
        const matched = patterns.some(
          (p) => text.includes(p) || p.includes(text)
        );
        if (matched) {
          cmd.action();
          const fb = t(cmd.descKey);
          showFeedback(`✅ ${fb}`);
          speak(fb);
          return;
        }
      }

      // No command matched
      showFeedback(`❓ ${t("voice.notUnderstood")}: "${raw}"`);
      speak(t("voice.notUnderstood"));
    },
    [i18n.language, getCommands, showFeedback, speak, t]
  );

  // Always keep processTranscriptRef up to date
  processTranscriptRef.current = processTranscript;

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    const lang = i18n.language?.split("-")[0] ?? "fr";
    recognition.lang = LANG_MAP[lang] || "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setFeedback("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        processTranscriptRef.current(final);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        showFeedback(`⚠️ ${t("voice.error")}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      speak(t("voice.listening"));
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }, [i18n.language, showFeedback, speak, t]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    feedback,
    supported,
    toggleListening,
    startListening,
    stopListening,
    getCommands,
  };
}
