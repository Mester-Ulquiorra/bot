import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { GetLevelConfig, LevelToXP, XPToLevel } from "../util/LevelUtil.js";
import Log from "../util/Log.js";
import { AddRankFieldEmbeds } from "./Rank.js";

const MaxXp = LevelToXP(100);

const XpCommand: SlashCommand = {
    name: "xp",

    async run(interaction, _client) {
        const target = interaction.options.getUser("member");
        const value = interaction.options.getString("value");

        // if value ends with L, set levelmode to true, otherwise set it to false
        const levelmode = value.endsWith("L");

        // if the subcommand is set, set setmode to true
        const setmode = interaction.options.getSubcommand() === "set";

        // this is some very crazy shit, so let me explain it:
        // numbervalue is made up with this "formula": (base) * (exponent)
        // base is basically what the user puts into "value" (without the L ending)
        // exponent is based on if we're adding or removing XP (except if we're in setmode, then it's always 1)
        const numbervalue =
            Number.parseInt(value.substring(0, value.length - (levelmode ? 1 : 0)), 10) *
            ((setmode || interaction.options.getSubcommand() === "add") ? 1 : -1);

        // check if value is correct
        if (
            // check if we're in level mode and the value is either one single letter or numbervalue is over 100
            (levelmode && (value.length == 1 || numbervalue > 100)) ||
            isNaN(numbervalue)
        )
            return GetError("BadValue", "value");

        // get the level config of the member
        const levelConfig = await GetLevelConfig(target.id);

        // calculate the xp we're going to get and see if it's valid
        // I really hope this is fairly clear, but basically if we're in set mode, we're taking the value as a constant
        // otherwise we add it to the current level/xp
        let newxp = 0;
        if (levelmode) {
            newxp = setmode
                ? LevelToXP(numbervalue)
                : LevelToXP(levelConfig.level + numbervalue);
        } else {
            newxp = setmode ? numbervalue : levelConfig.xp + numbervalue;
        }

        // check if the new xp is valid
        if (newxp < 0 || newxp > MaxXp)
            return GetError("BadValue", "value: not supported");

        // calculate relativexp
        const relativexp = levelConfig.xp - LevelToXP(levelConfig.level);

        // we either change the xp, then regenerate the level, or the other way around
        // depends on levelmode
        if (levelmode) {
            levelConfig.level = !setmode
                ? levelConfig.level + numbervalue
                : numbervalue;
            if (setmode) levelConfig.xp = LevelToXP(levelConfig.level);
            else levelConfig.xp = LevelToXP(levelConfig.level) + relativexp;
        } else {
            if (setmode) levelConfig.xp = newxp;
            else levelConfig.xp += numbervalue;
            levelConfig.level = XPToLevel(levelConfig.xp);
        }
        await levelConfig.save();

        // log
        Log(`${interaction.user.tag} (${interaction.user.id}) has changed the level information of ${target.tag} (${target.id}). New level: ${levelConfig.level}, xp: ${levelConfig.xp}`);

        // create the embed
        const embed = CreateEmbed(`New level information of ${target}`, {
            color: EmbedColor.Success,
            title: `Successfully changed level information of ${target.tag}`,
        });

        // add the fields about the rank
        AddRankFieldEmbeds(embed, levelConfig);

        // send the embed
        interaction.reply({ embeds: [embed] });
    }
};

export default XpCommand;