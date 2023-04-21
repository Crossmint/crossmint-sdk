import { Locale } from "../models/types";
import { NestedPaths, TypeFromPath } from "../models/system";

const enUS = {
    crossmintPayButtonService: {
        CONNECTING: "Connecting...",
        BUY_WITH_ETH: "Buy with ETH",
        BUY_WITH_SOL: "Buy with SOL",
        BUY_WITH_CREDIT_CARD: "Buy with credit card",
    },
    crossmintStatusButtonService: {
        INVALID: "Invalid clientId",
        WAITING_SUBMISSION: "Click here to setup Crossmint",
        PENDING: "Your application is under review",
        ACCEPTED: "You're good to go!",
        REJECTED: "Your application was rejected",
    },
};

const esES = {
    crossmintPayButtonService: {
        CONNECTING: "Conectando...",
        BUY_WITH_ETH: "Comprar con ETH",
        BUY_WITH_SOL: "Comprar con SOL",
        BUY_WITH_CREDIT_CARD: "Comprar con tarjeta de crédito",
    },
    crossmintStatusButtonService: {
        INVALID: "clientId inválido",
        WAITING_SUBMISSION: "Haga clic aquí para configurar Crossmint",
        PENDING: "Su solicitud está en revisión",
        ACCEPTED: "¡Está listo para usar Crossmint!",
        REJECTED: "Su solicitud fue rechazada",
    },
};

const frFR = {
    crossmintPayButtonService: {
        CONNECTING: "Connexion...",
        BUY_WITH_ETH: "Acheter avec ETH",
        BUY_WITH_SOL: "Acheter avec SOL",
        BUY_WITH_CREDIT_CARD: "Acheter avec une carte de crédit",
    },
    crossmintStatusButtonService: {
        INVALID: "clientId invalide",
        WAITING_SUBMISSION: "Cliquez ici pour configurer Crossmint",
        PENDING: "Votre demande est en cours d'examen",
        ACCEPTED: "Vous êtes prêt à partir !",
        REJECTED: "Votre demande a été refusée",
    },
};

const itIT = {
    crossmintPayButtonService: {
        CONNECTING: "Connessione...",
        BUY_WITH_ETH: "Acquista con ETH",
        BUY_WITH_SOL: "Acquista con SOL",
        BUY_WITH_CREDIT_CARD: "Acquista con carta di credito",
    },
    crossmintStatusButtonService: {
        INVALID: "clientId non valido",
        WAITING_SUBMISSION: "Clicca qui per configurare Crossmint",
        PENDING: "La tua richiesta è in fase di revisione",
        ACCEPTED: "Sei pronto per iniziare!",
        REJECTED: "La tua richiesta è stata respinta",
    },
};

const koKR = {
    crossmintPayButtonService: {
        CONNECTING: "연결 중...",
        BUY_WITH_ETH: "이더리움으로 구매",
        BUY_WITH_SOL: "솔라나로 구매",
        BUY_WITH_CREDIT_CARD: "신용카드로 구매",
    },
    crossmintStatusButtonService: {
        INVALID: "유효하지 않은 clientId",
        WAITING_SUBMISSION: "여기를 클릭하여 크로스민트 설정",
        PENDING: "신청이 검토 중입니다",
        ACCEPTED: "이제 사용할 수 있습니다!",
        REJECTED: "신청이 거부되었습니다",
    },
};

const ptPT = {
    crossmintPayButtonService: {
        CONNECTING: "A conectar...",
        BUY_WITH_ETH: "Comprar com ETH",
        BUY_WITH_SOL: "Comprar com SOL",
        BUY_WITH_CREDIT_CARD: "Comprar com cartão de crédito",
    },
    crossmintStatusButtonService: {
        INVALID: "clientId inválido",
        WAITING_SUBMISSION: "Clique aqui para configurar o Crossmint",
        PENDING: "A sua candidatura está em análise",
        ACCEPTED: "Está tudo pronto!",
        REJECTED: "A sua candidatura foi rejeitada",
    },
};

const zhCN = {
    crossmintPayButtonService: {
        CONNECTING: "连接中...",
        BUY_WITH_ETH: "使用ETH购买",
        BUY_WITH_SOL: "使用SOL购买",
        BUY_WITH_CREDIT_CARD: "使用信用卡购买",
    },
    crossmintStatusButtonService: {
        INVALID: "无效的clientId",
        WAITING_SUBMISSION: "点击此处设置Crossmint",
        PENDING: "您的申请正在审查中",
        ACCEPTED: "您已准备就绪！",
        REJECTED: "您的申请已被拒绝",
    },
};

const zhTW = {
    crossmintPayButtonService: {
        CONNECTING: "連接中...",
        BUY_WITH_ETH: "用ETH購買",
        BUY_WITH_SOL: "用SOL購買",
        BUY_WITH_CREDIT_CARD: "用信用卡購買",
    },
    crossmintStatusButtonService: {
        INVALID: "無效的clientId",
        WAITING_SUBMISSION: "點擊此處設置Crossmint",
        PENDING: "您的申請正在審查中",
        ACCEPTED: "您已準備就緒！",
        REJECTED: "您的申請已被拒絕",
    },
};

const deDE = {
    crossmintPayButtonService: {
        CONNECTING: "Verbindung wird hergestellt...",
        BUY_WITH_ETH: "Mit ETH kaufen",
        BUY_WITH_SOL: "Mit SOL kaufen",
        BUY_WITH_CREDIT_CARD: "Mit Kreditkarte kaufen",
    },
    crossmintStatusButtonService: {
        INVALID: "Ungültige clientId",
        WAITING_SUBMISSION: "Hier klicken, um Crossmint einzurichten",
        PENDING: "Ihre Anfrage wird geprüft",
        ACCEPTED: "Sie sind startklar!",
        REJECTED: "Ihre Anfrage wurde abgelehnt",
    },
};

const ruRU = {
    crossmintPayButtonService: {
        CONNECTING: "Подключение...",
        BUY_WITH_ETH: "Купить за ETH",
        BUY_WITH_SOL: "Купить за SOL",
        BUY_WITH_CREDIT_CARD: "Купить с помощью кредитной карты",
    },
    crossmintStatusButtonService: {
        INVALID: "Недействительный clientId",
        WAITING_SUBMISSION: "Нажмите здесь, чтобы настроить Crossmint",
        PENDING: "Ваша заявка на рассмотрении",
        ACCEPTED: "Вы готовы к работе!",
        REJECTED: "Ваша заявка была отклонена",
    },
};

const trTR = {
    crossmintPayButtonService: {
        CONNECTING: "Bağlanıyor...",
        BUY_WITH_ETH: "ETH ile Satın Al",
        BUY_WITH_SOL: "SOL ile Satın Al",
        BUY_WITH_CREDIT_CARD: "Kredi Kartı ile Satın Al",
    },
    crossmintStatusButtonService: {
        INVALID: "Geçersiz clientId",
        WAITING_SUBMISSION: "Crossmint'i ayarlamak için buraya tıklayın",
        PENDING: "Başvurunuz inceleniyor",
        ACCEPTED: "İşlem yapmaya hazırsınız!",
        REJECTED: "Başvurunuz reddedildi",
    },
};

const ukUA = {
    crossmintPayButtonService: {
        CONNECTING: "Підключення...",
        BUY_WITH_ETH: "Купити за ETH",
        BUY_WITH_SOL: "Купити за SOL",
        BUY_WITH_CREDIT_CARD: "Купити за допомогою кредитної картки",
    },
    crossmintStatusButtonService: {
        INVALID: "Недійсний clientId",
        WAITING_SUBMISSION: "Натисніть тут, щоб налаштувати Crossmint",
        PENDING: "Ваша заявка розглядається",
        ACCEPTED: "Ви готові до роботи!",
        REJECTED: "Вашу заявку відхилено",
    },
};

const thTH = {
    crossmintPayButtonService: {
        CONNECTING: "กำลังเชื่อมต่อ...",
        BUY_WITH_ETH: "ซื้อด้วย ETH",
        BUY_WITH_SOL: "ซื้อด้วย SOL",
        BUY_WITH_CREDIT_CARD: "ซื้อด้วยบัตรเครดิต",
    },
    crossmintStatusButtonService: {
        INVALID: "clientId ไม่ถูกต้อง",
        WAITING_SUBMISSION: "คลิกที่นี่เพื่อตั้งค่า Crossmint",
        PENDING: "ใบสมัครของคุณกำลังอยู่ในระหว่างการตรวจสอบ",
        ACCEPTED: "คุณพร้อมแล้ว!",
        REJECTED: "ใบสมัครของคุณถูกปฏิเสธ",
    },
};

const Klingon = {
    crossmintPayButtonService: {
        CONNECTING: "yImej...",
        BUY_WITH_ETH: "ETH vItlhutlh",
        BUY_WITH_SOL: "SOL vItlhutlh",
        BUY_WITH_CREDIT_CARD: "QelI'qam vItlhutlh",
    },
    crossmintStatusButtonService: {
        INVALID: "mIw clientId",
        WAITING_SUBMISSION: "ghItlh Crossmint vImej tlhej",
        PENDING: "Dochvam DIlmeH, vIpoQ",
        ACCEPTED: "Do' rur!",
        REJECTED: "Dochvam luHutlh",
    },
};

const localeMap = {
    "en-US": enUS,
    "es-ES": esES,
    "fr-FR": frFR,
    "it-IT": itIT,
    "ko-KR": koKR,
    "pt-PT": ptPT,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    "de-DE": deDE,
    "ru-RU": ruRU,
    "tr-TR": trTR,
    "uk-UA": ukUA,
    "th-TH": thTH,
    "Klingon": Klingon,
};

export function t<K extends NestedPaths<typeof enUS>>(wordingKey: K, locale: Locale): TypeFromPath<typeof enUS, K> {
    const localeWording = localeMap[locale] ?? enUS;
    return wordingKey.split(".").reduce((obj: any, i) => obj[i], localeWording);
}
