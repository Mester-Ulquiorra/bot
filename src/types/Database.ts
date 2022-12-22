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
}


export interface DBLevel {
    userId: string;
    level: number;
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