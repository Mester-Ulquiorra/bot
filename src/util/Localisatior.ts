import { GuildMember } from "discord.js";
import config from "../config.js";
import ManageRole from "./ManageRole.js";

type LangFile = { [key: string]: string };
export type LocLanguage = "en" | "hu" | "de";

export async function GetMemberLanguage(member: GuildMember): Promise<LocLanguage> {
    if (await ManageRole(member, config.roles.Languages.Hungarian)) return "hu";
    if (await ManageRole(member, config.roles.Languages.German)) return "de";
    return "en";
}

export default class {
    langFiles: { [key in LocLanguage]?: LangFile };
    constructor(langFiles: { [key in LocLanguage]: LangFile }) {
        this.langFiles = langFiles;
    }

    get(lang: LocLanguage, key: string, ...args: string[]) {
        if (this.langFiles[lang]?.[key] == null) return this.get("en", key, ...args);
        const data = this.langFiles[lang][key];
        // replace {\d} with the arguments
        return data.replace(/{(\d+)}/g, (match, number) => {
            return args[number] ?? "#error#";
        });
    }

    getResolve(key: string, ...args: string[]) {
        return {
            resolve: (lang: LocLanguage) => {
                return this.get(lang, key, ...args);
            }
        };
    }
}