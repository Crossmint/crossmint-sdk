import { Locale } from "../../models/types";
import { NestedPaths, TypeFromPath } from "../../models/system";
import zhCN from "./dictionaries/zhCN";
import itIT from "./dictionaries/itIT";
import enUS from "./dictionaries/enUS";
import frFR from "./dictionaries/frFR";
import zhTW from "./dictionaries/zhTW";
import trTR from "./dictionaries/trTR";
import deDE from "./dictionaries/deDE";
import esES from "./dictionaries/esES";
import ruRU from "./dictionaries/ruRU";
import ukUA from "./dictionaries/ukUA";
import koKR from "./dictionaries/koKR";
import Klingon from "./dictionaries/Klingon";
import ptPT from "./dictionaries/ptPT";
import thTH from "./dictionaries/thTH";


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
