import { LevelToXP, XPToLevel } from "@mester-ulquiorra/commonlib";
import { logger } from "../Ulquiorra.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { GetLevelConfig } from "../util/LevelManager.js";
import { AddRankFieldEmbeds } from "./Rank.js";

const MaxXp = LevelToXP(100);

const XpCommand: SlashCommand = {
    name: "xp",

    async run(interaction) {
        const target = interaction.options.getUser("member", true);
        const value = interaction.options.getString("value", true);

        // if value ends with L, set levelmode to true, otherwise set it to false
        const levelMode = value.endsWith("L");

        // if the subcommand is set, set setmode to true
        const setmode = interaction.options.getSubcommand() === "set";

        // this is some very crazy shit, so let me explain it:
        // numbervalue is made up with this "formula": (base) * (exponent)
        // base is basically what the user puts into "value" (without the L ending)
        // exponent is based on if we're adding or removing XP (except if we're in setmode, then it's always 1)
        const numberValue = Number.parseInt(value.substring(0, value.length - (levelMode ? 1 : 0)), 10) * (setmode || interaction.options.getSubcommand() === "add" ? 1 : -1);

        // check if value is correct
        if (
            // check if we're in level mode and the value is either one single letter or numbervalue is over 100
            (levelMode && (value.length == 1 || numberValue > 100)) ||
            isNaN(numberValue)
        ) {
            return GetError("BadValue", "value");
        }

        // get the level config of the member
        const levelConfig = await GetLevelConfig(target.id);

        // calculate the xp we're going to get and see if it's valid
        // I really hope this is fairly clear, but basically if we're in set mode, we're taking the value as a constant
        // otherwise we add it to the current level/xp
        let newxp = 0;
        if (levelMode) {
            newxp = setmode ? LevelToXP(numberValue) : LevelToXP(XPToLevel(levelConfig.xp) + numberValue);
        } else {
            newxp = setmode ? numberValue : levelConfig.xp + numberValue;
        }

        // check if the new xp is valid
        if (newxp < 0 || newxp > MaxXp) {
            return GetError("BadValue", "value: not supported");
        }

        levelConfig.xp = newxp;
        await levelConfig.save();

        // log
        logger.log(
            `${interaction.user.tag} (${interaction.user.id}) has changed the level information of ${target.tag} (${target.id}). New level: ${XPToLevel(levelConfig.xp)}, xp: ${
                levelConfig.xp
            }`
        );

        // create the embed
        const embed = CreateEmbed(`New level information of ${target}`, {
            color: "success",
            title: `Successfully changed level information of ${target.tag}`
        });

        // add the fields about the rank
        AddRankFieldEmbeds(embed, levelConfig);

        // send the embed
        interaction.reply({ embeds: [embed] });
    }
};

export default XpCommand;
