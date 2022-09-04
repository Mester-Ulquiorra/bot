import { ActionRowBuilder, APIActionRowComponent, bold, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import config from "../config";
import PunishmentConfig, { PunishmentType, PunishmentTypeToName } from "../database/PunishmentConfig";
import SlashCommand from "../types/SlashCommand";
import Ulquiorra from "../Ulquiorra";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";
import GetError from "../util/GetError";
import Log from "../util/Log";
import ManageRole from "../util/ManageRole";
import { CreateModEmbed } from "../util/ModUtils";
import { DetectProfanity } from "../util/Reishi/CheckProfanity";

const AppealCommand: SlashCommand = {
    name: "appeal",

    async runButton(interaction, client) {
        if (interaction.customId === "appeal.appeal") {
            // try to find the user's active punishment
            const punishment = await PunishmentConfig.findOne({ user: interaction.user.id, active: true });
            if (!punishment) return "You don't have any active punishments!";
            if (punishment.appealed) return "You've already appealed this punishment.";

            // create modal
            const modal =
                new ModalBuilder()
                    .setTitle(`Appeal punishment ${punishment.id}`)
                    .setCustomId("appeal.appealmodal")
                    .setComponents(
                        //@ts-expect-error
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel("Why should your punishment be appealed?")
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setMinLength(50)
                                .setMaxLength(1024)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("extra")
                                .setLabel("Anything else you'd like to add?")
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false)
                                .setMaxLength(1024)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("punishment")
                                .setLabel("Punishment ID (don't change)")
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(punishment.id.length)
                                .setMinLength(punishment.id.length)
                                .setValue(punishment.id)
                                .setRequired(true)
                        ),
                    );

            // send the modal
            interaction.showModal(modal);
        }

        if (interaction.customId === "appeal.accept") {
            //if (interaction.message.embeds[0].fields.length !== 2) return "That appeal has already been declined/accepted.";

            const punishment = await PunishmentConfig.findOne({ id: interaction.message.embeds[0].footer.text.match(/\d+/)?.[0] })
            if (!punishment) return GetError("Database");

            // get the reason for the action
            const reasonMessage = await interaction.reply({
                embeds: [CreateEmbed(`**Please give a reason for your action by __replying__ to this message.**`)],
                fetchReply: true
            });

            return reasonMessage.channel.awaitMessages({
                filter: m => m.author.id === interaction.user.id && m.reference?.messageId === reasonMessage.id,
                max: 1,
                time: 60_000
            })
                .then(async (collected) => {
                    let reason = collected.first().content;
                    if (reason.length > 1024) reason = reason.substring(0, 1024);

                    collected.first().delete().then(() => { reasonMessage.delete() });

                    const user = await Ulquiorra.users
                        .fetch(interaction.message.embeds[0].description.match(/<@(\d+)>/)[1])
                        .then((user) => { return user; })
                        .catch(() => { return; });

                    if (!user) return "Somehow we couldn't fetch the user";

                    const userConfig = await GetUserConfig(user.id);

                    switch (punishment.type) {
                        case PunishmentType.Mute:
                            userConfig.muted = false;
                            await userConfig.save();

                            const member = await GetGuild().members
                                .fetch(user.id)
                                .then((user) => { return user; })
                                .catch(() => { return; });

                            if (!member) return GetError("MemberUnavailable");

                            ManageRole(member, config.MutedRole, "Remove", `appeal accepted by ${interaction.user.tag}`);
                        case PunishmentType.Ban:
                            userConfig.banned = false;
                            await userConfig.save();

                            GetGuild().members.unban(user, `appeal accepted by ${interaction.user.tag}`).catch(() => { return; });
                    }
                    punishment.active = false;
                    await punishment.save();

                    Log(`${interaction.user.tag} (${interaction.user.id}) has accepted the punishment appeal of ${user.tag} (${user.id}). ID: ${punishment.id}`);

                    // add an extra field to the embed
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .addFields(
                            {
                                name: `Accepted by ${(interaction.member as GuildMember).displayName}`,
                                value: reason,
                                inline: false
                            }
                        )
                        .setColor([22, 137, 101]);

                    const modEmbed = CreateModEmbed(interaction.user, user, punishment, {
                        anti: true,
                        reason: `Punishment appeal accepted: ${bold(reason)}`
                    });
                    const userEmbed = CreateModEmbed(interaction.user, user, punishment, {
                        anti: true,
                        userEmbed: true,
                        reason: `Punishment appeal accepted: ${bold(reason)}`
                    });

                    user.send({ embeds: [userEmbed] })
                        .catch(() => { return; })
                        .finally(() => {
                            // kick the member from the prison
                            GetGuild(true).members.kick(user, "appealed punishment").catch(() => { return; });
                        })
                    GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });
                    interaction.message.edit({ embeds: [embed], components: [] });
                })
                .catch(() => {
                    reasonMessage.delete();
                    return "You've run out of time"
                })
        }

        if (interaction.customId === "appeal.decline") {
            //if (interaction.message.embeds[0].fields.length !== 2) return "That appeal has already been declined/accepted.";

            const punishment = await PunishmentConfig.findOne({ id: interaction.message.embeds[0].footer.text.match(/\d+/)?.[0] })
            if (!punishment) return GetError("Database");

            // get the reason for the action
            const reasonMessage = await interaction.reply({
                embeds: [CreateEmbed(`**Please give a reason for your action by __replying__ to this message.**`)],
                fetchReply: true
            });

            reasonMessage.channel.awaitMessages({
                filter: m => m.author.id === interaction.user.id && m.reference?.messageId === reasonMessage.id,
                max: 1,
                time: 60_000
            })
                .then(async (collected) => {
                    let reason = collected.first().content;
                    if (reason.length > 1024) reason = reason.substring(0, 1024);

                    collected.first().delete().then(() => { reasonMessage.delete() });

                    // add an extra field to the embed
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .addFields(
                            {
                                name: `Declined by ${(interaction.member as GuildMember).displayName}`,
                                value: reason,
                                inline: false
                            }
                        )
                        .setColor([237, 56, 36]);

                    const user = await client.users.fetch(interaction.message.embeds[0].description.match(/<@(\d+)>/)[1])
                        .then((user) => { return user; })
                        .catch(() => { return; });

                    if (!user) return "Couldn't fetch user";

                    user.send({
                        embeds: [
                            CreateEmbed(`**Your punishment appeal has been declined by ${interaction.user}**`, { color: EmbedColor.Error })
                                .addFields({
                                    name: "Reason",
                                    value: reason,
                                })
                        ]
                    })
                        .catch(() => { return; })
                        .finally(() => {
                            // kick the member from the prison
                            GetGuild(true).members.kick(user, "appealed punishment").catch(() => { return; });
                        })

                    interaction.message.edit({ embeds: [embed], components: [] });

                    // kick the member from the prison
                    GetGuild(true).members.kick(user, "appealed punishment");
                })
                .catch(() => {
                    reasonMessage.delete();
                    return "You've run out of time"
                })
        }
    },

    async runModal(modal, _client) {
        if (modal.customId === "appeal.appealmodal") {
            const punishmentId = modal.fields.getTextInputValue("punishment");

            // validate punishment
            const punishment = await PunishmentConfig.findOne({ user: modal.user.id, active: true, id: punishmentId });

            if (!punishment) return "The punishment ID is either invalid, or the punishment is not active anymore";
            if (punishment.appealed) return "You've already appealed this punishment.";

            if (DetectProfanity(modal.fields.getTextInputValue("reason").replaceAll(/\n/g, " ")) ||
                DetectProfanity(modal.fields.getTextInputValue("extra").replaceAll(/\n/g, " ")))
                return "Profanity detected in one of the fields, totally uncool";

            // create the embed
            const embed = CreateEmbed(`**Appeal request of punishment ${punishmentId} from ${modal.user}**`, {
                author: modal.user
            })
                .addFields(
                    {
                        name: "Punishment type",
                        value: PunishmentTypeToName(punishment.type),
                        inline: false
                    },
                    {
                        name: "Why should your punishment be appealed?",
                        value: modal.fields.getTextInputValue("reason"),
                        inline: false
                    },
                )
                .setFooter({ text: `Punishment ID: ${punishmentId} ` });

            if (modal.fields.getTextInputValue("extra").length !== 0)
                embed
                    .addFields(
                        {
                            name: "Anything else you'd like to add?",
                            value: modal.fields.getTextInputValue("extra"),
                            inline: false
                        }
                    )

            const components = [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Accept appeal")
                            .setStyle(ButtonStyle.Success)
                            .setCustomId("appeal.accept"),
                        new ButtonBuilder()
                            .setLabel("Decline appeal")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId("appeal.decline")
                    ).toJSON() as APIActionRowComponent<any>
            ]

            GetSpecialChannel("Appeal").send({ embeds: [embed], components });

            punishment.appealed = true;
            await punishment.save();

            modal.reply({
                embeds: [CreateEmbed(`Your punishment appeal has been sent!`, { color: EmbedColor.Success })],
                ephemeral: true
            });
        }
    }
}

export default AppealCommand;