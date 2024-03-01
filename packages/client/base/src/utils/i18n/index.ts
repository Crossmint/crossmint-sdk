import { Locale } from "../../types";
import { NestedPaths, TypeFromPath } from "../../types/system";
import Klingon from "./dictionaries/Klingon";
import deDE from "./dictionaries/deDE";
import enUS from "./dictionaries/enUS";
import esES from "./dictionaries/esES";
import frFR from "./dictionaries/frFR";
import itIT from "./dictionaries/itIT";
import koKR from "./dictionaries/koKR";
import ptPT from "./dictionaries/ptPT";
import ruRU from "./dictionaries/ruRU";
import thTH from "./dictionaries/thTH";
import trTR from "./dictionaries/trTR";
import ukUA from "./dictionaries/ukUA";
import zhCN from "./dictionaries/zhCN";
import zhTW from "./dictionaries/zhTW";
import viVN from "./dictionaries/viVN";
import jaJp from "./dictionaries/jaJp";

const localeMap = {
    "en-US": enUS,
    "es-ES": esES,
    "fr-FR": frFR,
    "it-IT": itIT,
    "ja-JP": jaJp,
    "ko-KR": koKR,
    "pt-PT": ptPT,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    "de-DE": deDE,
    "ru-RU": ruRU,
    "tr-TR": trTR,
    "uk-UA": ukUA,
    "th-TH": thTH,
    "vi-VN": viVN,
    Klingon: Klingon,
};

export function t<K extends NestedPaths<typeof enUS>>(wordingKey: K, locale: Locale): TypeFromPath<typeof enUS, K> {
    const localeWording = localeMap[locale] ?? enUS;
    return wordingKey.split(".").reduce((obj: any, i) => obj[i], localeWording);
}
