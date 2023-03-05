import mongoose, { Document, SchemaTypes } from "mongoose";
import { DBGeo } from "../types/Database.js";

export interface IDBGeo extends Document, DBGeo { }

export default mongoose.model("geo", new mongoose.Schema<IDBGeo>({
    userId: {
        type: SchemaTypes.String,
        unique: true,
        required: true
    },
    balance: {
        public: {
            type: SchemaTypes.Boolean,
            default: false
        },
        geo: {
            type: SchemaTypes.Number,
            default: 0
        }
    },
    explore: {
        lastExplore: {
            type: SchemaTypes.Number,
            default: 0
        }
    },
    inventory: {
        public: {
            type: SchemaTypes.Boolean,
            default: false
        },
        items: {
            type: [{
                name: {
                    type: SchemaTypes.String,
                    required: true
                },
                count: {
                    type: SchemaTypes.Number,
                    required: true
                }
            }],
            _id: false
        }
    }
}));