import { TicketConfigSchema } from "@mester-ulquiorra/commonlib";
import mongoose from "mongoose";

export default mongoose.model("ticket", TicketConfigSchema);