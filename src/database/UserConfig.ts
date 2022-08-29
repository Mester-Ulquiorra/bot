import mongoose from "mongoose";

const UserConfigSchema = new mongoose.Schema({
    id: {
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