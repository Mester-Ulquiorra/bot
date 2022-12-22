import mongoose, { Document } from "mongoose";
import { DBTictactoe } from "../types/Database.js";

export interface IDBTictactoe extends DBTictactoe, Document { }

const TictactoeConfigSchema = new mongoose.Schema<IDBTictactoe>({
    user: {
        type: mongoose.SchemaTypes.String,
        required: true,
        unique: true,
    },
    gamesPlayed: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    gamesWon: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    gamesLost: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    elo: {
        type: mongoose.SchemaTypes.Number,
        default: 1000,
    }
});

export default mongoose.model("tictactoestat", TictactoeConfigSchema);
