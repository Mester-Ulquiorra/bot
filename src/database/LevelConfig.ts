import mongoose from "mongoose";

const LevelConfigSchema = new mongoose.Schema({
    id: {
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