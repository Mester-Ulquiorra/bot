import mongoose from "mongoose";

const TictactoeConfigSchema = new mongoose.Schema({
    user: {
        type: mongoose.SchemaTypes.String,
        required: true,
        unique: true,
    },
    games_played: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    games_won: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    games_lost: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    elo: {
        type: mongoose.SchemaTypes.Number,
        default: 1000,
    }
});

export default mongoose.model("tictactoestat", TictactoeConfigSchema);
