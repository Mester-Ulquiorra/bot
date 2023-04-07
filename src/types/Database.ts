import { GeoItem } from "../commands/Geo/GeoData.js";
import { PunishmentType } from "../database/PunishmentConfig.js";
import { TicketType } from "../database/TicketConfig.js";

export interface DBUser {
    /**
     * The user's id
     */
    userId: string;
    /**
     * The first time the user joined the server (in seconds)
     */
    firstjoined: number;
    /**
     * The last time the user joined the server (in seconds)
     */
    lastjoined: number;
    /**
     * If the user is in the guild
     */
    inguild: boolean;
    /**
     * If the user is muted
     */
    muted: boolean;
    /**
     * If the user is banned
     */
    banned: boolean;
    /**
     * The user's mod level
     */
    mod: number;
    /**
     * If the user is banned from tickets (currently unused)
     */
    ticketban: boolean;
}

export interface DBPunishment {
    /**
     * The punishment's id
     */
    punishmentId: string;
    /**
     * The user's id who was punished
     */
    user: string;
    /**
     * The moderator's id who punished the user
     */
    mod: string;
    /**
     * The type of punishment
     */
    type: PunishmentType;
    /**
     * The reason of the punishment
     */
    reason: string;
    /**
     * The time the punishment was created (in seconds)
     */
    at: number;
    /**
     * The time the punishment will end (in seconds)
     */
    until: number;
    /**
     * If the punishment is active
     */
    active: boolean;
    /**
     * If the punishment was created by automod
     */
    automated: boolean;
    /**
     * If the punishment was appealed
     */
    appealed: boolean;
}

export interface DBGiveaway {
    /**
     * The giveaway's id
     */
    giveawayId: string;
    /**
     * The giveaway's message id
     */
    message: string;
    /**
     * The giveaway's channel id
     */
    channel: string;
    /**
     * The user's id who created the giveaway
     */
    host: string;
    /**
     * The giveaway's name
     */
    name: string;
    /**
     * The time the giveaway was created (in seconds)
     */
    start: number;
    /**
     * The time the giveaway will end (in seconds)
     */
    end: number;
    /**
     * If the giveaway has ended
     */
    ended: boolean;
    /**
     * The number of winners
     */
    winners: number;
    /**
     * The giveaway's filter
     */
    filter: GiveawayFilter;
}

export interface GiveawayFilter {
    /**
     * Are nitro users allowed to be winners?
     */
    nitro: boolean;
}

export interface DBLevel {
    /**
     * The user's id
     */
    userId: string;
    /**
     * The user's xp
     */
    xp: number;
}

export interface DBTicket {
    /**
     * The ticket's id
     */
    ticketId: string;
    /**
     * The channel's id that serves as the ticket
     */
    channel: string;
    /**
     * The user's id who created the ticket
     */
    creator: string;
    /**
     * The moderator's id who claimed the ticket
     */
    mod: string;
    /**
     * The minimum mod level required to claim the ticket
     */
    modlevel: number;
    /**
     * The mod level this ticket is waiting for (0 if not waiting for a mod)
     */
    waitingfor: number;
    /**
     * The type of ticket
     */
    type: TicketType;
    /**
     * The users of the ticket who were manually added
     */
    users: Map<string, string>;
    /**
     * If the ticket is closed
     */
    closed: boolean;
    /**
     * The time the ticket was closed (in seconds)
     */
    closedat: number;
}

export interface DBTictactoe {
    /**
     * The user's id
     */
    user: string;
    /**
     * The user's played games
     */
    gamesPlayed: number;
    /**
     * The user's won games
     */
    gamesWon: number;
    /**
     * The user's lost games
     */
    gamesLost: number;
    /**
     * The user's elo
     */
    elo: number;
}

export interface DBDashboard {
    /**
     * The user's id
     */
    userId: string;
    /**
     * The user's avatar hash
     */
    avatar: string;
}

export interface DBGeo {
    /**
     * The user's id
     */
    userId: string;
    /**
     * The user's balance
     */
    balance: {
        /**
         * The total amount of Geo the user has
         */
        geo: number;
        /**
         * If the user's balance is public
         */
        public: boolean;
    };
    /**
     * The user's explore data
     */
    explore: {
        /**
         * The last time the user explored (in milliseconds)
         */
        lastExplore: number;
    };
    /**
     * The user's inventory
     */
    inventory: {
        /**
         * The items in the user's inventory
         */
        items: Array<GeoItem>;
        /**
         * If the user's inventory is public
         */
        public: boolean;
    }
}