/**
 * Internationalization (i18n) System
 * Multi-language support from day one
 */

export type Locale = "en" | "pt" | "es" | "fr" | "de" | "zh" | "ja";

interface TranslationSet {
  [key: string]: string | TranslationSet;
}

interface Translations {
  [locale: string]: TranslationSet;
}

// Default translations
const defaultTranslations: Translations = {
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      search: "Search",
      filter: "Filter",
      close: "Close",
      back: "Back",
      next: "Next",
      previous: "Previous",
      submit: "Submit",
      confirm: "Confirm",
    },
    marketplace: {
      title: "Marketplace",
      searchPlaceholder: "Search servers, skills...",
      installed: "Installed",
      available: "Available",
      trending: "Trending",
      categories: "Categories",
      install: "Install",
      uninstall: "Uninstall",
      update: "Update",
      details: "Details",
      compatibility: "Compatibility",
      version: "Version",
      author: "Author",
      description: "Description",
      noResults: "No results found",
      installing: "Installing...",
      installedSuccess: "Successfully installed",
      installError: "Installation failed",
    },
    newsletter: {
      title: "AI Intelligence",
      morningDigest: "Morning Digest",
      afternoonUpdate: "Afternoon Update",
      eveningRecap: "Evening Recap",
      realtime: "Real-time",
      sources: "Sources",
      categories: "Categories",
      readMore: "Read more",
      saveForLater: "Save for later",
      share: "Share",
      discuss: "Discuss",
      markAsRead: "Mark as read",
      allArticles: "All Articles",
      saved: "Saved",
      insights: "Insights",
      chat: "Chat",
      noArticles: "No articles yet",
      loadingArticles: "Loading articles...",
      refresh: "Refresh",
      lastUpdated: "Last updated",
    },
    insights: {
      title: "Insights",
      trends: "Trends",
      opportunities: "Opportunities",
      risks: "Risks",
      actions: "Suggested Actions",
      askAbout: "Ask about this",
      relatedNews: "Related News",
      confidence: "Confidence",
    },
    channels: {
      title: "Channels",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      slack: "Slack",
      email: "Email",
      push: "Push Notifications",
      configure: "Configure",
      testConnection: "Test Connection",
      connected: "Connected",
      disconnected: "Disconnected",
    },
    navigation: {
      marketplace: "Marketplace",
      intelligence: "Intelligence",
      insights: "Insights",
      settings: "Settings",
      profile: "Profile",
    },
  },
  pt: {
    common: {
      loading: "Carregando...",
      error: "Erro",
      success: "Sucesso",
      cancel: "Cancelar",
      save: "Salvar",
      delete: "Excluir",
      edit: "Editar",
      create: "Criar",
      search: "Buscar",
      filter: "Filtrar",
      close: "Fechar",
      back: "Voltar",
      next: "Próximo",
      previous: "Anterior",
      submit: "Enviar",
      confirm: "Confirmar",
    },
    marketplace: {
      title: "Marketplace",
      searchPlaceholder: "Buscar servidores, skills...",
      installed: "Instalados",
      available: "Disponíveis",
      trending: "Em Alta",
      categories: "Categorias",
      install: "Instalar",
      uninstall: "Desinstalar",
      update: "Atualizar",
      details: "Detalhes",
      compatibility: "Compatibilidade",
      version: "Versão",
      author: "Autor",
      description: "Descrição",
      noResults: "Nenhum resultado encontrado",
      installing: "Instalando...",
      installedSuccess: "Instalado com sucesso",
      installError: "Falha na instalação",
    },
    newsletter: {
      title: "Inteligência AI",
      morningDigest: "Resumo da Manhã",
      afternoonUpdate: "Atualização da Tarde",
      eveningRecap: "Resumo da Noite",
      realtime: "Tempo Real",
      sources: "Fontes",
      categories: "Categorias",
      readMore: "Ler mais",
      saveForLater: "Salvar para depois",
      share: "Compartilhar",
      discuss: "Discutir",
      markAsRead: "Marcar como lido",
      allArticles: "Todos os Artigos",
      saved: "Salvos",
      insights: "Insights",
      chat: "Chat",
      noArticles: "Nenhum artigo ainda",
      loadingArticles: "Carregando artigos...",
      refresh: "Atualizar",
      lastUpdated: "Última atualização",
    },
    insights: {
      title: "Insights",
      trends: "Tendências",
      opportunities: "Oportunidades",
      risks: "Riscos",
      actions: "Ações Sugeridas",
      askAbout: "Perguntar sobre",
      relatedNews: "Notícias Relacionadas",
      confidence: "Confiança",
    },
    channels: {
      title: "Canais",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      slack: "Slack",
      email: "Email",
      push: "Notificações Push",
      configure: "Configurar",
      testConnection: "Testar Conexão",
      connected: "Conectado",
      disconnected: "Desconectado",
    },
    navigation: {
      marketplace: "Marketplace",
      intelligence: "Inteligência",
      insights: "Insights",
      settings: "Configurações",
      profile: "Perfil",
    },
  },
};

class I18n {
  private currentLocale: Locale = "en";
  private translations: Translations = defaultTranslations;
  private listeners: Set<(locale: Locale) => void> = new Set();

  constructor() {
    // Load saved locale preference
    this.loadLocale();
  }

  private loadLocale(): void {
    try {
      const saved = localStorage.getItem("openclaw-locale");
      if (saved && this.isValidLocale(saved)) {
        this.currentLocale = saved as Locale;
      } else {
        // Detect browser locale
        const browserLocale = navigator.language.split("-")[0];
        if (this.isValidLocale(browserLocale)) {
          this.currentLocale = browserLocale as Locale;
        }
      }
    } catch {
      // Fallback to default
    }
  }

  private isValidLocale(locale: string): boolean {
    return ["en", "pt", "es", "fr", "de", "zh", "ja"].includes(locale);
  }

  getLocale(): Locale {
    return this.currentLocale;
  }

  setLocale(locale: Locale): void {
    if (this.isValidLocale(locale)) {
      this.currentLocale = locale;
      localStorage.setItem("openclaw-locale", locale);
      this.notifyListeners();
    }
  }

  t(key: string, params?: Record<string, string>): string {
    const keys = key.split(".");
    let value: unknown = this.translations[this.currentLocale];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as TranslationSet)[k];
      } else {
        // Fallback to English
        value = this.getFallbackValue(keys);
        break;
      }
    }

    if (typeof value !== "string") {
      // Return key if translation not found
      return key;
    }

    // Replace parameters
    if (params) {
      return Object.entries(params).reduce(
        (str, [param, val]) => str.replace(`{{${param}}}`, val),
        value,
      );
    }

    return value;
  }

  private getFallbackValue(keys: string[]): string | undefined {
    let value: unknown = this.translations["en"];
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as TranslationSet)[k];
      } else {
        return undefined;
      }
    }
    return typeof value === "string" ? value : undefined;
  }

  addTranslations(locale: Locale, translations: TranslationSet): void {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }
    this.translations[locale] = {
      ...this.translations[locale],
      ...translations,
    };
  }

  onLocaleChange(callback: (locale: Locale) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentLocale);
    }
  }

  getAvailableLocales(): { code: Locale; name: string }[] {
    return [
      { code: "en", name: "English" },
      { code: "pt", name: "Português" },
      { code: "es", name: "Español" },
      { code: "fr", name: "Français" },
      { code: "de", name: "Deutsch" },
      { code: "zh", name: "中文" },
      { code: "ja", name: "日本語" },
    ];
  }
}

// Singleton instance
export const i18n = new I18n();

// Helper function for templates
export const t = (key: string, params?: Record<string, string>): string => i18n.t(key, params);
