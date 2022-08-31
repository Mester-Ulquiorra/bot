import mongoose, { SchemaTypes } from "mongoose";

const GiveawayConfigSchema = new mongoose.Schema({
    id: {
        type: SchemaTypes.String,
        unique: true,
        required: true
    },
    message: {
        type: SchemaTypes.String,
        unique: true,
        required: true
    },
    channel: {
        type: SchemaTypes.String,
        required: true
    },
    host: {
        type: SchemaTypes.String,
        required: true
    },
    name: {
        type: SchemaTypes.String,
        required: true
    },
    start: {
        type: SchemaTypes.Number,
        required: true
    },
    end: {
        type: SchemaTypes.Number,
        required: true
    },
    ended: {
        type: SchemaTypes.Boolean,
        default: false
    },
    winners: {
        type: SchemaTypes.Number,
    }
})

export default mongoose.model("giveaway", GiveawayConfigSchema);