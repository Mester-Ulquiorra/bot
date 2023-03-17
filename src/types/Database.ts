import { GeoItem } from "../commands/Geo/GeoData.js";
import { PunishmentType } from "../database/PunishmentConfig.js";
import { TicketType } from "../database/TicketConfig.js";

export interface DBUser {
    userId: string;
    firstjoined: number;
    lastjoined: number;
    inguild: boolean;
    muted: boolean;
    banned: boolean;
    mod: number;
    ticketban: boolean;
}

export interface DBPunishment {
    punishmentId: string;
    user: string;
    mod: string;
    type: PunishmentType;
    reason: string;
    at: number;
    until: number;
    active: boolean;
    automated: boolean;
    appealed: boolean;
}

export interface DBGiveaway {
    giveawayId: string;
    message: string;
    channel: string;
    host: string;
    name: string;
    start: number;
    end: number;
    ended: boolean;
    winners: number;
    filter: GiveawayFilter;
}

export interface GiveawayFilter {
    /**
     * Are nitro users allowed to be winners?
     */
    nitro: boolean;
}

export interface DBLevel {
    userId: string;
    xp: number;
}

export interface DBTicket {
    ticketId: string;
    channel: string;
    creator: string;
    mod: string;
    modlevel: number;
    waitingfor: number;
    type: TicketType;
    users: Map<string, string>;
    closed: boolean;
    closedat: number;
}

export interface DBTictactoe {
    user: string;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    elo: number;
}

export interface DBDashboard {
    userId: string;
    avatar: string;
}

export interface DBGeo {
    userId: string;
    balance: {
        geo: number;
        public: boolean;
    };
    explore: {
        /**
         * The last time the user explored (in milliseconds)
         */
        lastExplore: number;
    };
    inventory: {
        items: Array<GeoItem>;
        public: boolean;
    }
}