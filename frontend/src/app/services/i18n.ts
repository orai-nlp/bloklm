import { Injectable, signal } from "@angular/core"

export type Language = "eu" | "es"

interface Translations {
  [key: string]: {
    eu: string
    es: string
  }
}

@Injectable({
  providedIn: "root",
})
export class I18nService {
  private currentLanguage = signal<Language>("eu")

  private translations: Translations = {
    welcome: {
      eu: "Ongi etorri BlokLM-ra",
      es: "Bienvenido a BlokLM",
    },
    createFirstNotebook: {
      eu: "Sortu zure lehen koadernoa",
      es: "Crea tu primer cuaderno",
    },
    notebookDescription: {
      eu: "BlokLM IA bidezko ikerketa eta idazketa laguntzailea da, zuk kargatutako iturrietan oinarrituta funtzionatzen duena",
      es: "BlokLM es un asistente de investigación y escritura impulsado por IA que funciona mejor con las fuentes que subes",
    },
    gainNewUnderstandings: {
      eu: "Lortu ulermen berriak edozein dokumenturi buruz",
      es: "Obtén nuevas comprensiones sobre cualquier documento",
    },
    gainNewUnderstandingsDesc: {
      eu: "Bihurtu material konplexua ulertzeko erraza den formatuetara, hala nola Audio Ikuspegi Orokorrak, FAQ-ak edo Briefing Dokumentuak",
      es: "Convierte material complejo en formatos fáciles de entender como Resúmenes de Audio, FAQs o Documentos de Briefing",
    },
    chatbotGrounded: {
      eu: "Zure iturrietan oinarritutako chatbot bat",
      es: "Un chatbot basado en tus fuentes",
    },
    chatbotGroundedDesc: {
      eu: "Kargatu zure dokumentuak eta BlokLM-k galdera zehatzak erantzungo ditu edo gako-ikuspegiak azalduko ditu",
      es: "Sube tus documentos y BlokLM responderá preguntas detalladas o destacará ideas clave",
    },
    shareInsights: {
      eu: "Partekatu zure ikuspegiak",
      es: "Comparte tus ideas",
    },
    shareInsightsDesc: {
      eu: "Gehitu baliabide garrantzitsuak koaderno batera eta partekatu zure erakundearekin talde-ezagutza base bat sortzeko",
      es: "Añade recursos clave a un cuaderno y comparte con tu organización para crear una base de conocimiento grupal",
    },
    tryExampleNotebook: {
      eu: "Probatu adibide-koaderno bat",
      es: "Prueba un cuaderno de ejemplo",
    },
    createNewNotebook: {
      eu: "Sortu koaderno berria",
      es: "Crear nuevo cuaderno",
    },
    createNew: {
      eu: "Sortu berria",
      es: "Crear nuevo",
    },
    mostRecent: {
      eu: "Azkenak",
      es: "Más recientes",
    },
    settings: {
      eu: "Ezarpenak",
      es: "Configuración",
    },
    sources: {
      eu: "Iturburuak",
      es: "Fuentes",
    },
    chat: {
      eu: "Txata",
      es: "Chat",
    },
    studio: {
      eu: "Estudioa",
      es: "Estudio",
    },
    add: {
      eu: "Gehitu",
      es: "Añadir",
    },
    discover: {
      eu: "Aurkitu",
      es: "Descubrir",
    },
    addSourceToGetStarted: {
      eu: "Gehitu iturri bat hasteko",
      es: "Añade una fuente para comenzar",
    },
    uploadSource: {
      eu: "Kargatu iturria",
      es: "Subir fuente",
    },
    audioOverview: {
      eu: "Audio Ikuspegi Orokorra",
      es: "Resumen de Audio",
    },
    notes: {
      eu: "Oharrak",
      es: "Notas",
    },
    addNote: {
      eu: "Gehitu oharra",
      es: "Añadir nota",
    },
    studyGuide: {
      eu: "Ikasketa Gida",
      es: "Guía de Estudio",
    },
    briefingDoc: {
      eu: "Briefing Dokumentua",
      es: "Documento de Briefing",
    },
    faq: {
      eu: "FAQ",
      es: "FAQ",
    },
    timeline: {
      eu: "Denbora-lerroa",
      es: "Línea de Tiempo",
    },
    addSources: {
      eu: "Gehitu iturburuak",
      es: "Añadir fuentes",
    },
    uploadSources: {
      eu: "Kargatu iturburuak",
      es: "Subir fuentes",
    },
    dragDropOrChoose: {
      eu: "Arrastatu eta jaregin edo aukeratu fitxategia kargatzeko",
      es: "Arrastra y suelta o elige archivo para subir",
    },
    supportedFileTypes: {
      eu: "Onartutako fitxategi motak: PDF, txt, Markdown, Audio (adib. mp3)",
      es: "Tipos de archivo soportados: PDF, txt, Markdown, Audio (ej. mp3)",
    },
    googleDrive: {
      eu: "Google Drive",
      es: "Google Drive",
    },
    link: {
      eu: "Esteka",
      es: "Enlace",
    },
    pasteText: {
      eu: "Itsatsi testua",
      es: "Pegar texto",
    },
    sourceLimit: {
      eu: "Iturri muga",
      es: "Límite de fuentes",
    },
    share: {
      eu: "Partekatu",
      es: "Compartir",
    },
    untitledNotebook: {
      eu: "Izenburu gabeko koadernoa",
      es: "Cuaderno sin título",
    },
    loading: {
      eu:"Kargatzen...",
      es:"Cargando..."
    },
    rename: {
      eu:"Berrizendatu",
      es:"Renombrar"
    },
    delete: {
      eu:"Ezabatu",
      es:"Borrar"
    },
    confirm_delete: {
      eu:"Ziur zaude hurrengo bilduma ezabatu nahi duzula: ",
      es:"Estas seguro que quieres borrar la siguiente colección: "
    },
  }


  get language() {
    return this.currentLanguage()
  }

  setLanguage(lang: Language) {
    this.currentLanguage.set(lang)
    localStorage.setItem("notebookLM_language", lang)
  }

  translate(key: string): string {
    const translation = this.translations[key]
    if (!translation) {
      return key
    }
    return translation[this.currentLanguage()]
  }

  constructor() {
    const savedLang = localStorage.getItem("notebookLM_language") as Language
    if (savedLang && (savedLang === "eu" || savedLang === "es")) {
      this.currentLanguage.set(savedLang)
    }
  }
}
