import { LevelConfigSchema } from "@mester-ulquiorra/commonlib";
import mongoose from "mongoose";

export default mongoose.model("level", LevelConfigSchema);
