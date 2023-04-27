export interface CssFontSource {
    cssSrc: string;
    family: string;
}

export interface CustomFontSource {
    family: string;
    // This will be guarded and only Crossmint domain will be allowed
    src: string;
    display?: string;
    style?: "normal" | "italic" | "oblique";
    weight?: string;
}
