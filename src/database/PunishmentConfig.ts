import { PunishmentConfigSchema } from "@mester-ulquiorra/commonlib";
import mongoose from "mongoose";

export default mongoose.model("punishment", PunishmentConfigSchema);
