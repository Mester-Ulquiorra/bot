import mongoose, { Document, SchemaTypes } from "mongoose";
import { DBDashboard } from "../types/Database.js";

export interface IDBDashboard extends Document, DBDashboard { }

export default mongoose.model("dashboardUser", new mongoose.Schema<IDBDashboard>({
    userId: {
        type: SchemaTypes.String,
        unique: true,
        required: true
    },
    avatar: {
        type: SchemaTypes.String,
        default: null
    }
}));