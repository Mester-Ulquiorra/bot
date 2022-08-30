import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import config from "../config";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig";
import SlashCommand from "../types/SlashCommand";
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
            // the punishment id will be in the embed
            const punishmentId = interaction.message.embeds[0].footer.text.match(/\d+/)?.[0];

            if (!punishmentId) return "For some super bizarre reason, the punishment id was not found";

            // get punishment config
            const punishment = await PunishmentConfig.findOne({ id: punishmentId });
            if (!punishment) return GetError("Database");
            if (punishment.appealed) return "You've already appealed this punishment.";

            // create modal
            const modal =
                new ModalBuilder()
                    .setTitle(`Appeal punishment ${punishmentId}`)
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
                                .setMaxLength(punishmentId.length)
                                .setMinLength(punishmentId.length)
                                .setValue(punishmentId)
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

                    const member = await GetGuild().members
                        .fetch(interaction.message.embeds[0].description.match(/<@(\d+)>/)[1])
                        .then((user) => { return user; })
                        .catch(() => { return; });
                    
                    if(!member) return GetError("MemberUnavailable");

                    punishment.active = false;
                    switch(punishment.type) {
                        case PunishmentType.Mute:
                            const userConfig = await GetUserConfig(member.id);

                            userConfig.muted = false;
                            await userConfig.save();

                            ManageRole(member, config.MUTED_ROLE, "Remove", `appeal accepted by ${interaction.user.tag}`);
                    }
                    await punishment.save();
                    
                    Log(`${interaction.user.tag} (${interaction.user.id}) has accepted the punishment appeal of ${member.user.tag} (${member.user.id}). ID: ${punishment.id}`);

                    const modEmbed = CreateModEmbed(interaction.user, member.user, punishment, {
                        anti: true
                    });
                    const userEmbed = CreateModEmbed(interaction.user, member.user, punishment, {
                        anti: true,
                        userEmbed: true
                    });

                    member.send({ embeds: [userEmbed] }).catch(() => { return; });
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
                .then((collected) => {
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

                    // send an alert embed to the user
                    const userId = interaction.message.embeds[0].description.match(/<@(\d+)>/)[1];

                    client.users
                        .fetch(userId).then((user) => {
                            user.send({
                                embeds: [
                                    CreateEmbed(`**Your punishment appeal has been declined by ${interaction.user}**`, { color: EmbedColor.Error })
                                        .addFields({
                                            name: "Reason",
                                            value: reason,
                                        })
                                ]
                            }).catch(() => { return; });
                        })
                        .catch(() => { return; });

                    interaction.message.edit({ embeds: [embed], components: [] });
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

            if(DetectProfanity(modal.fields.getTextInputValue("reason").replaceAll(/\n/g, " ")) || 
                DetectProfanity(modal.fields.getTextInputValue("extra").replaceAll(/\n/g, " ")) )
                return "Profanity detected in one of the fields, totally uncool"

            // create the embed
            const embed = CreateEmbed(`**Appeal request of punishment ${punishmentId} from ${modal.user}**`, {
                author: modal.user
            })
                .addFields(
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