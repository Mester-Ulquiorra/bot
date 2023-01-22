import mongoose, { Document } from "mongoose";
import { DBUser } from "../types/Database.js";

export interface IDBUser extends DBUser, Document { }

const UserConfigSchema = new mongoose.Schema<IDBUser>({
    userId: {
        type: mongoose.SchemaTypes.String,
        unique: true,
        required: true,
    },
    firstjoined: {
        type: mongoose.SchemaTypes.Number,
        required: true,
    },
    lastjoined: {
        type: mongoose.SchemaTypes.Number,
        required: true,
    },
    inguild: {
        type: mongoose.SchemaTypes.Boolean,
        default: true,
    },
    muted: {
        type: mongoose.SchemaTypes.Boolean,
        default: false,
    },
    banned: {
        type: mongoose.SchemaTypes.Boolean,
        default: false,
    },
    mod: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    ticketban: {
        type: mongoose.SchemaTypes.Boolean,
        default: false,
    },
});

export default mongoose.model("user", UserConfigSchema);