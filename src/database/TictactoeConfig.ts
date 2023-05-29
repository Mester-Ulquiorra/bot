import { TictactoeConfigSchema } from "@mester-ulquiorra/commonlib";
import mongoose from "mongoose";

export default mongoose.model("tictactoe", TictactoeConfigSchema);