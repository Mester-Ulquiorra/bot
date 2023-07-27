import { GiveawayConfigSchema } from "@mester-ulquiorra/commonlib";
import mongoose from "mongoose";

export default mongoose.model("giveaway", GiveawayConfigSchema);
