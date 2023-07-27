import { Message } from "discord.js";
import { PunishMessage, ReishiEvaluation } from "../Reishi.js";
import https from "https";
import { Configuration, OpenAIApi } from "openai";
import config from "../../config.js";

const emojiRegex = /<a?:\w+:\d+>/g;

const openaiClient = new OpenAIApi(
	new Configuration({
		accessToken: config.DANGER.OPENAI_KEY,
		organization: config.DANGER.OPENAI_ORG,
	})
);

export default async function (message: Message<true>) {
	// goal: extract emojis and check if any of them are a skull

	// check the basic skull emoji
	if (message.content.includes("💀")) {
		PunishMessage(message, "BlacklistedWord", { comment: "__delete__" });
		return;
	}

	// check the skull and crossbones emoji
	if (message.content.includes("☠️")) {
		PunishMessage(message, "BlacklistedWord", { comment: "__delete__" });
		return;
	}

	// TODO: extract custom emojis when OpenAI supports image analysis

	/*
    // extract all custom emojis and put them into an array
    const customEmojis = message.content.match(emojiRegex);

    for (const customEmoji of customEmojis) {
        // extract the emoji id
        const emojiID = customEmoji.match(/\d+/g)[0];

        // emojis are available under https://cdn.discordapp.com/emojis/${emoji.id}, extension is either .png or .gif (depending on if it's animated)
        const animated = customEmoji.startsWith("<a:");
        const buffer = await new Promise<Buffer>((resolve, reject) => {
            https.get(`https://cdn.discordapp.com/emojis/${emojiID}.${animated ? "gif" : "png"}`, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download image. Status code: ${res.statusCode}`));
                    return;
                }

                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });

                res.on("error", (err) => {
                    reject(err);
                });
            });
        });
    }
    */
}
