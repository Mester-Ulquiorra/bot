import { InviteConfigSchema } from "@mester-ulquiorra/commonlib";
import mongoose from "mongoose";

export default mongoose.model("invite", InviteConfigSchema);