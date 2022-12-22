import mongoose, { Document } from "mongoose";
import { DBLevel } from "../types/Database.js";

export interface IDBLevel extends DBLevel, Document { }

const LevelConfigSchema = new mongoose.Schema<IDBLevel>({
    userId: {
        type: mongoose.SchemaTypes.String,
        unique: true,
        required: true,
    },
    level: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    xp: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
});

export default mongoose.model("level", LevelConfigSchema);