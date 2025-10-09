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
      eu: "BlokLM IA bidezko ikerketa eta idazketa laguntzailea da, zuk kargatutako fitxategietan oinarrituta funtzionatzen duena",
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
      eu: "Zure fitxategietan oinarritutako chatbot bat",
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
    today: {
      eu: "Gaur",
      es: "Hoy",
    },
    yestarday: {
      eu: "Atzo",
      es: "Ayer",
    },
    days_ago_1: {
      eu: "Duela",
      es: "Hace",
    },
    days_ago_2: {
      eu: "egun",
      es: "días",
    },
    configure: {
      eu: "Konfiguratu",
      es: "Configura",
    },
    sources: {
      eu: "Fitxategiak",
      es: "Fuentes",
    },
    source:{
      eu: "Fitxategi",
      es: "Archivo",
    },
    supported: {
      eu: "Onartutako formatuak",
      es: "Formatos admitidos",
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
      eu: "Fitxategi lokalak igo",
      es: "Subir fuentes locales",
    },
    addSourceToGetStarted: {
      eu: "Gehitu fitxategi bat hasteko",
      es: "Añade una fuente para comenzar",
    },
    uploadSource: {
      eu: "Kargatu fitxategia",
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
    summary: {
      eu: "Laburpena",
      es: "Resumen",
    },
    FAQ: {
      eu: "FAQ",
      es: "FAQ",
    },
    timeline: {
      eu: "Kronograma",
      es: "Cronograma",
    },
    mindmap: {
      eu: "Kontzeptu-mapa",
      es: "Mapa Conceptual",
    },
    outline: {
      eu: "Eskema",
      es: "Esquema",
    },
    glossary: {
      eu: "Glosarioa",
      es: "Glosario",
    },
    addSources: {
      eu: "Gehitu Fitxategiak",
      es: "Añadir fuentes",
    },
    uploadSources: {
      eu: "Kargatu Fitxategiak",
      es: "Subir fuentes",
    },
    dragDropOrChoose: {
      eu: "Arrastatu eta askatu edo aukeratu fitxategia kargatzeko",
      es: "Arrastra y suelta o elige archivo para subir",
    },
    supportedFileTypes: {
      eu: "Onartutako fitxategi motak: PDF, TXT, SRT, DOCS, DOC",
      es: "Tipos de archivo soportados: PDF, TXT, SRT, DOCS, DOC",
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
    copyText: {
      eu: "Kopiatutako testua",
      es: "Texto kopiado",
    },
    sourceLimit: {
      eu: "Fitxategi muga",
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
    cancel: {
      eu:"Ezeztatu",
      es:"Anular"
    },
    close: {
      eu:"Itxi",
      es:"Cerrar"
    },
    confirm_delete: {
      eu:"Ziur zaude hurrengo bilduma ezabatu nahi duzula: ",
      es:"Estas seguro que quieres borrar la siguiente colección: "
    },
    modal_info: {
      eu:"Igotako fitxategien arabera, BlokLMk gehien axola zaizun informazioan oinarritzen ditu bere erantzunak. (Esaterako: marketin-planak, ikastaroen irakurketa, ikerketa-oharrak, bileren transkripzioak, salmenta-dokumentuak, etab.)",
      es:"Según los archivos subidos, BlokLM basa sus respuestas en la información que más le importa. (Por ejemplo: planes de marketing, lectura de cursos, notas de investigación, transcripciones de reuniones, documentos de venta, etc.)"
    },
    disclaimer: {
      eu:"BlokLM okertu daiteke; mesedez, berrikusi zure erantzunak.",
      es:"BlokLM puede ser inexacto; por favor, revise sus respuestas."
    },
    sources_list: {
      eu:"Gordetako fitxategiak hemen agertuko dira",
      es:"Las fuentes guardadas se mostrarán aquí"
    },
    modal_paste_text: {
      eu:"Itsatsi testua",
      es:"Pegar texto"
    },
    modal_filesToUp: {
      eu:"Kargatzeko fitxategiak",
      es:"Archivos para subir"
    },
    modal_paste_Clipboard: {
      eu:"Itsatsi testua arbeletik",
      es:"Pegar texto de Portapeles"
    },
    modal_upload_files: {
      eu:"Igo Fitxategiak",
      es:"Subir Archivos"
    },
    uploading: {
      eu:"Prozesatzen...",
      es:"Procesando..."
    },
    modal_addText: {
      eu:"Gehitu testua",
      es:"Añadir texto"
    },
    modal_placeholdertext: {
      eu:"Idatzi hemen testua...",
      es:"Escribe aquí el texto..."
    },
    modal_placeholdertext_docname: {
      eu:"Sartu fitxategiaren izena (adib., dokumentua.txt)",
      es:"Escriba el nombre del archivo (e.g., documento.txt)"
    },
    modal_cancel_confirm: {
      eu:"Igo gabeko fitxategiak dituzu. Ziur zaude itxi nahi duzula?",
      es:"Tienes archivos pendientes de subir. ¿Estás seguro de que quieres cerrar?"
    },
    modal_alertFormat: {
      eu:"PDF, TXT, SRT, DOC eta DOCX fitxategiak bakarrik onartzen dira.\n\nOndorengo fitxategiak ez daude onartuta:",
      es:"Solo se permiten archivos PDF, TXT, SRT, DOC y DOCX.\n\nLos siguientes archivos no son compatibles:"
    },
    modal_alertFileNum: {
      eu:"fitxategi bakarrik gehitu dira. Gainditu duzu 50 fitxategien gehienezko muga.",
      es:"archivos han sido añadidos unicamente. Límite máximo de 50 archivos alcanzado."
    },
    modal_alertFileExists: {
      eu:"Ya existe un archivo con este nombre.",
      es:"Izen hori duen fitxategia badago lehendik ere."
    },
    modal_alertUploadFailed: {
      eu:"Huts egin du fitxategiak igotzean. Mesedez, saiatu berriro.",
      es:"Error al subir los archivos. Por favor, inténtenlo de nuevo."
    },
    chat_placerholder: {
      eu:"Hasi idazten...",
      es:"Empieza a escribir..."
    },
    chat_placerholder_empty: {
      eu:"Igo fitxategirenbat txateatzen hasteko",
      es:"Sube algun archivo para empezar a chatear"
    },
    chat_clear_title: {
      eu:"Txat Garbiketa",
      es:"Limpieza del Chat"
    },
    chat_clear_confirmation: {
      eu:"Ziur zaude txateko mezu guztiak ezabatu nahi dituzula? Ekintza hau ezingo da desegin.",
      es:"¿Está seguro de que desea borrar todos los mensajes del chat? Esta acción no se podrá deshacer."
    },
    chat_clear_button: {
      eu:"Ezabatu Mezuak",
      es:"Borrar Mensajes"
    },  
    chat_clear_noti: {
      eu:"Txateko mezuak ezabatu dira",
      es:"Se han borrado los mensajes del chat"
    },  
    chat_loading_message: {
      eu:"Txata kargatzen",
      es:"Cargando el chat"
    },  
    chat_input_placeholder: {
      eu:"Idatzi hemen",
      es:"Escribe un mensaje"
    }, 
    chat_api_error: {
      eu:"Errorea gertatu da APIarekin komunikatzean.",
      es:"Lo siento, hubo un error comunicándose con la API."
    },
    studio_conf_formality: {
      eu:"Formaltasun Maila",
      es:"Grado de formalidad"
    },
    studio_conf_style: {
      eu:"Estiloa",
      es:"Estilo"
    },
    studio_conf_detail: {
      eu:"Xehetasun Maila",
      es:"Nivel de Detalle"
    },
    studio_conf_complexity: {
      eu:"Konplexutasun Linguistikoa",
      es:"Complejidad Linguística"
    },
    studio_conf_type: {
      eu:"Podcast mota",
      es:"Tipo de podcast"
    },
    studio_conf_create_btn: {
      eu:"Sortu Oharra",
      es:"Crear Nota"
    },
    studio_conf_opt_formal: {
      eu:"Formala",
      es:"Formal"
    },
    studio_conf_opt_neutro: {
      eu:"Neutroa-Estandarra",
      es:"Neutro-Estandar"
    },
    studio_conf_opt_informal: {
      eu:"Informala",
      es:"Informal"
    },
    studio_conf_opt_academic: {
      eu:"Akademikoa",
      es:"Académico"
    },
    studio_conf_opt_technical: {
      eu:"Teknikoa",
      es:"Técnico"
    },
    studio_conf_opt_non_expert: {
      eu:"Ez-Espertua",
      es:"No-Experto"
    },
    studio_conf_opt_low: {
      eu:"Baxua",
      es:"Bajo"
    },
    studio_conf_opt_medium: {
      eu:"Ertaina",
      es:"Medio"
    },
    studio_conf_opt_high: {
      eu:"Altua",
      es:"Alto"
    },
    studio_conf_opt_simple: {
      eu:"Sinplea",
      es:"Simple"
    },
    studio_conf_opt_moderate: {
      eu:"Neurrizkoa",
      es:"Moderado"
    },
    studio_conf_opt_complex: {
      eu:"Konplexua",
      es:"Complejo"
    },
    studio_conf_opt_conversational: {
      eu:"Elkarrizketa",
      es:"Conversaciónal"
    },
    studio_conf_opt_narrative: {
      eu:"Narratzailea",
      es:"Narrativo"
    },
    studio_info_notes: {
      eu:"Gordetako oharrak hemen agertuko dira",
      es:"Las notas guardadas aparecerán aquí"
    },
    studio_generating_note: {
      eu:"edukiak sortzen",
      es:"Generando el contenido del"
    },
    studio_not_sources_selected: {
      eu:"Aukeratu gutxienez fitxategi 1 mesedez",
      es:"Selecciona, al menos, 1 archivo por favor"
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
