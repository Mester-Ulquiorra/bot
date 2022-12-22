import mongoose, { Document } from "mongoose";
import { DBTicket } from "../types/Database.js";

export enum TicketType {
    Private = -1,
    General = 0,
    MemberReport = 1,
    ModReport = 2,
    HeadModReport = 3
}

export interface IDBTicket extends DBTicket, Document { };

const TicketConfigSchema = new mongoose.Schema<IDBTicket>({
    ticketId: {
        type: mongoose.SchemaTypes.String,
        unique: true,
        required: true,
    },
    channel: {
        type: mongoose.SchemaTypes.String,
        unique: true,
        required: true,
    },
    creator: {
        type: mongoose.SchemaTypes.String,
        required: true, // -1 if it's automatic / made by bot
    },
    mod: {
        type: mongoose.SchemaTypes.String,
        default: "-1", // -1 means the ticket is not claimed
    },
    modlevel: {
        type: mongoose.SchemaTypes.Number,
        default: 0, // determines what mods should be able to see this ticket
    },
    waitingfor: {
        type: mongoose.SchemaTypes.Number,
        default: 1, // which mod the ticket is currently waiting for
    },
    type: {
        type: mongoose.SchemaTypes.Number,
        default: TicketType.General,
    },
    users: {
        type: mongoose.SchemaTypes.Map,
        of: mongoose.SchemaTypes.String,
        default: new Map<string, string>(),
    },
    closed: {
        type: mongoose.SchemaTypes.Boolean,
        default: false,
    },
    closedat: {
        type: mongoose.SchemaTypes.Number,
        default: -1,
    },
});

export default mongoose.model("ticket", TicketConfigSchema);