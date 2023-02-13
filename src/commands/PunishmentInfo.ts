import { ActionRowBuilder, ButtonInteraction, ChatInputCommandInteraction, SelectMenuComponentOptionData, SelectMenuInteraction, StringSelectMenuBuilder, User } from "discord.js";
import PunishmentConfig, { PunishmentTypeToName } from "../database/PunishmentConfig.js";
import { DBPunishment } from "../types/Database.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { CalculateMaxPage } from "../util/MathUtils.js";

const PageSize = 10;

const PunishmentInfoCommand: SlashCommand = {
    name: "punishmentinfo",

    async run(interaction, _client) {
        // check for subcommand
        switch (interaction.options.getSubcommand()) {
            case "id":
                return showPunishmentById(
                    interaction,
                    interaction.options.getString("id")
                );
            case "member":
                return showPunishmentsOfMember(
                    interaction,
                    interaction.options.getUser("member"),
                    interaction.options.getInteger("page") ?? 1
                );
        }

        return new Error("Incorrect subcommand");
    },

    async runStringSelectMenu(interaction, client) {
        if (interaction.customId === "punishmentinfo.pageselector") {
            // get the user id using this very shitty and messy way
            const userId = interaction.message.embeds[0].footer.text
                .match(/\d{17,}/)[0]
                .replaceAll(/[<@>]/gi, "");

            const user = await client.users.fetch(userId)
                .then(user => { return user; })
                .catch(() => { return; });

            if (!user) return "User was not found";

            return showPunishmentsOfMember(
                interaction,
                user,
                Number.parseInt(interaction.values[0]),
                true
            );
        }
    },

    async runButton(interaction, client) {
        if (interaction.customId === "punishmentinfo.showactivep") {
            // get the user id using this very shitty and messy way
            const userId = interaction.message.embeds[0].footer.text
                .match(/\d{17,}/)[0]
                .replaceAll(/[<@>]/gi, "");

            // find the user's latest punishment
            const punishment = await PunishmentConfig.findOne({
                user: userId,
                active: true,
            });

            if (!punishment) return "No punishment found.";

            // run the showpunishment command on the punishment
            return showPunishmentById(
                interaction,
                punishment.punishmentId
            );
        }

        if (interaction.customId.startsWith("punishmentinfo.showallp-")) {
            // get the user id using this very shitty and messy way
            const userId = interaction.customId.match(/punishmentinfo\.showallp-(\d+)/)[1];

            const user = await client.users.fetch(userId)
                .then(user => { return user; })
                .catch(() => { return; });

            if (!user) return GetError("UserUnavailable");

            return showPunishmentsOfMember(
                interaction,
                user,
                1
            );
        }

        if (interaction.customId.startsWith("punishmentinfo.showp-")) {
            const punishmentId = interaction.customId.match(/punishmentinfo\.showp-(\d+)/)[1];

            return showPunishmentById(interaction, punishmentId);
        }
    },
};

/**
 *
 * @param interaction The interaction that requested this function.
 * @param id The ID of the punishment.
 */
async function showPunishmentById(interaction: ChatInputCommandInteraction | ButtonInteraction, id: string) {
    // get the punishment from config
    const punishment = await PunishmentConfig.findOne({ punishmentId: id });

    // check if punishment exists
    if (!punishment)
        return "The punishment wasn't found.";

    // create the embed
    const embed = CreateEmbed(
        `**Information about punishment ${punishment.punishmentId}**`
    ).addFields([
        {
            name: `Punished member`,
            value: `<@${punishment.user}>`,
            inline: true,
        },
        {
            name: `Moderator`,
            value: `<@${punishment.mod}>`,
            inline: true,
        },
        {
            name: `Type`,
            value: PunishmentTypeToName(punishment.type),
            inline: true,
        },
        {
            name: "Punished at",
            value: `<t:${punishment.at}>`,
            inline: true,
        },
        {
            name: "Punished until",
            // if punishment.until is -1, show "permanent"
            value:
                punishment.until === -1
                    ? "Permanent"
                    : `<t:${punishment.until}>`,
            inline: true,
        },
        {
            name: "Active?",
            value: punishment.active ? "Yes" : "No",
            inline: true,
        },
        {
            name: "Reason",
            value: punishment.reason,
            inline: false,
        },
    ]);

    // send the embed
    interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 *
 * @param interaction The interaction object.
 * @param user The user.
 * @param page The page to display.
 * @param refresh If this is a refresh (the interaction already exists)
 */
async function showPunishmentsOfMember(interaction: ChatInputCommandInteraction | ButtonInteraction | SelectMenuInteraction, user: User, page: number, refresh = false) {
    const maxPage = await GetMaxPunishmentPages(user.id);

    // check if page is bigger than the available pages
    if (page > maxPage) return "Page is not available.";

    // get every punishment of the user
    const punishments = await PunishmentConfig.find({
        user: user.id,
    }).sort({ at: -1 });

    if (punishments.length === 0) return "The member has no punishments.";

    // create the embed
    const embed = await createPunishmentsEmbed(
        user.id,
        punishments,
        page,
        maxPage
    );

    // -------------------------------------------------------------------

    /**
     * The object for the page selector options
     */
    const options = new Array<SelectMenuComponentOptionData>();

    // loop through every available page and create a select menu for it
    for (let i = 1; i <= maxPage; i++) {
        options.push({
            label: `Page ${i}`,
            value: i.toString(),
            description: `Show page ${i}`,
        });
    }

    const components = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
        new StringSelectMenuBuilder()
            .setCustomId("punishmentinfo.pageselector")
            .setMaxValues(1)
            .setOptions(options),
    ]).toJSON()];

    // --------------------------------------------------------------------

    // send the embed
    // if it's a refresh, update it
    if (!(interaction instanceof ChatInputCommandInteraction) && refresh)
        interaction.update({
            embeds: [embed],
            components,
        });
    else
        interaction.reply({
            embeds: [embed],
            components,
            ephemeral: true,
        });
}

/**
 *
 * @param userid The ID of the member.
 * @param punishments The punishments of the member.
 * @param page The page to display.
 * @param max_page The maximum page available.
 */
async function createPunishmentsEmbed(userid: string, punishments: Array<DBPunishment>, page: number, max_page: number) {
    // create the embed
    const returnEmbed = CreateEmbed(`**Punishments of <@${userid}> (page ${page} / ${max_page})**`)
        .setFooter({ text: `User ID: ${userid}` });

    for (
        // this weird shit is doing some crazy magic to get the correct index values for the punishments
        let i = (page - 1) * PageSize, punishment = punishments[i];
        i < punishments.length && i < page * PageSize;
        i++, punishment = punishments[i]
    ) {
        returnEmbed.addFields([
            {
                // This shows: type, member, moderator, punished at, punished until, active, reason
                name: `**__Punishment ${punishment.punishmentId}__**`,
                value:
                    `**Type:** ${PunishmentTypeToName(punishment.type)}\n` +
                    `**Member:** <@${punishment.user}>. **Moderator:** <@${punishment.mod}>\n` +
                    `**At** <t:${punishment.at}> **until** ${punishment.until != -1
                        ? `<t:${punishment.until}>`
                        : `Permanent`
                    } (Active: ${punishment.active ? "Yes" : "No"})\n` +
                    `**Reason:** ${punishment.reason}`,
                inline: false,
            },
        ]);
    }

    return returnEmbed;
}

/**
 *
 * @param user The ID of the user.
 * @returns The maximum page available for the user's punishments.
 */
async function GetMaxPunishmentPages(user: string) {
    const punishmentcount = await PunishmentConfig.countDocuments({ user });

    return CalculateMaxPage(punishmentcount, PageSize);
}

export default PunishmentInfoCommand;