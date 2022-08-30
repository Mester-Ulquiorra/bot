import mongoose from "mongoose";

export enum PunishmentType {
    Warn = 0,
    Mute = 1,
    Kick = 2,
    Ban = 3,
};

/**
 * A function to convert punishment types into strings.
 * The type of punishment.
 * @returns The string representation of the punishment type.
 */
export function PunishmentTypeToName(type: PunishmentType) {
    switch (type) {
        case PunishmentType.Warn:
            return "Warn";
        case PunishmentType.Mute:
            return "Mute";
        case PunishmentType.Kick:
            return "Kick";
        case PunishmentType.Ban:
            return "Ban";
    }
}

const PunishmentConfigSchema = new mongoose.Schema({
    id: {
        type: mongoose.SchemaTypes.String,
        unique: true,
        required: true,
    },
    user: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    mod: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    type: {
        type: mongoose.SchemaTypes.Number,
        required: true,
    },
    reason: {
        type: mongoose.SchemaTypes.String,
        default: "No reason",
    },
    at: {
        type: mongoose.SchemaTypes.Number,
        required: true,
    },
    until: {
        type: mongoose.SchemaTypes.Number,
        default: -1,
    },
    active: {
        type: mongoose.SchemaTypes.Boolean,
        default: true,
    },
    automated: {
        type: mongoose.SchemaTypes.Boolean,
        default: false,
    },
    appealed: {
        type: mongoose.SchemaTypes.Boolean,
        default: false
    }
});

export default mongoose.model("punishment", PunishmentConfigSchema);