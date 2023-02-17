import { ActionRowBuilder, bold, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, inlineCode, MessageMentions, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import config from "../config.js";
import PunishmentConfig, { PunishmentType, PunishmentTypeToName } from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import Ulquiorra from "../Ulquiorra.js";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import ManageRole from "../util/ManageRole.js";
import { CreateModEmbed } from "../util/ModUtils.js";
import { DetectProfanity } from "../util/Reishi/CheckProfanity.js";

const AppealCommand: SlashCommand = {
    name: "appeal",

    async runButton(interaction, client) {
        const userConfig = await GetUserConfig(interaction.user.id, null, false);

        if (interaction.customId === "appeal.appeal") {
            return createAppeal(interaction);
        }

        if (!userConfig || userConfig.mod < 2) return GetError("Permission");

        if (interaction.customId === "appeal.accept") {
            return manageAppeal(interaction, true);
        }

        if (interaction.customId === "appeal.decline") {
            return manageAppeal(interaction, false);
        }
    },

    async runModal(modal, _client) {
        if (!/appeal\.appealmodal-\d+/.test(modal.customId)) return;

        const punishmentId = modal.customId.match(/appeal\.appealmodal-(\d+)/)[1];

        // validate punishment
        const punishment = await PunishmentConfig.findOne({ user: modal.user.id, active: true, punishmentId: punishmentId });

        if (!punishment) return "The punishment ID is either invalid, or the punishment is not active anymore";
        if (punishment.appealed) return "You've already appealed this punishment.";

        if (DetectProfanity(modal.fields.getTextInputValue("reason")) ||
            DetectProfanity(modal.fields.getTextInputValue("extra")))
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
            .setFooter({ text: `Punishment ID: ${punishmentId}` });

        if (modal.fields.getTextInputValue("extra").length !== 0)
            embed
                .addFields(
                    {
                        name: "Anything else you'd like to add?",
                        value: modal.fields.getTextInputValue("extra"),
                        inline: false
                    }
                );

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel("Accept appeal")
                    .setStyle(ButtonStyle.Success)
                    .setCustomId("appeal.accept"),
                new ButtonBuilder()
                    .setLabel("Decline appeal")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId("appeal.decline"),

            ).toJSON(),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel("Show punishment")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`punishmentinfo.showp-${punishmentId}`),
                new ButtonBuilder()
                    .setLabel("Show user info")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`userinfo.showu-${modal.user.id}`),
                new ButtonBuilder()
                    .setLabel("Punishment history")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`punishmentinfo.showallp-${modal.user.id}`)
            ).toJSON()
        ];

        GetSpecialChannel("Appeal").send({ embeds: [embed], components });

        punishment.appealed = true;
        await punishment.save();

        modal.reply({
            embeds: [CreateEmbed(`Your punishment appeal has been sent!`, { color: EmbedColor.Success })],
            ephemeral: true
        });
    }
};

async function manageAppeal(interaction: ButtonInteraction, accepted: boolean) {
    const punishment = await PunishmentConfig.findOne({ punishmentId: interaction.message.embeds[0].footer.text.match(/\d+/)?.[0] });
    if (!punishment) return GetError("Database");

    // get the reason for the action
    const reasonMessage = await interaction.reply({
        embeds: [CreateEmbed(`**Please give a reason for your action by __replying__ to this message.** (Max. length = 500 characters)\n**Type ${inlineCode("cancel")} to cancel.**`)],
        fetchReply: true
    });

    return reasonMessage.channel.awaitMessages({
        filter: m => m.author.id === interaction.user.id && m.reference?.messageId === reasonMessage.id,
        max: 1,
        time: 60_000
    })
        .then(async (collected) => {
            collected.first().delete().then(() => { reasonMessage.delete(); });

            const reason = collected.first().content;
            if (reason === "cancel") return;
            if (reason.length > 500) return "Sorry, that's too long!";

            const target = await Ulquiorra.users.fetch(interaction.message.embeds[0].description.match(MessageMentions.UsersPattern)[1])
                .then((user) => { return user; })
                .catch(() => { return; });

            if (!target) return "User couldn't be fetched (probably deleted account)";

            // add an extra field to the embed
            const appealEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
            appealEmbed
                .setDescription(appealEmbed.data.description + `\n**${accepted ? "Accepted" : "Declined"} by ${interaction.user}**`)
                .addFields(
                    {
                        name: `${accepted ? "Accept" : "Decline"} reason`,
                        value: reason,
                        inline: false
                    }
                )
                .setColor(accepted ? [22, 137, 101] : [237, 56, 36]);

            Log(`${interaction.user.tag} (${interaction.user.id}) has ${accepted ? "accepted" : "declined"} the punishment appeal of ${target.tag} (${target.id}). ID: ${punishment.punishmentId}`);

            interaction.message.edit({ embeds: [appealEmbed], components: [] });

            if (!accepted) {
                target.send({
                    embeds: [
                        CreateEmbed(`**Your punishment appeal has been declined by ${interaction.user}**`, { color: EmbedColor.Error })
                            .addFields({
                                name: "Reason",
                                value: reason,
                            })
                    ]
                })
                    .catch(() => { return; });

                return;
            }

            const targetConfig = await GetUserConfig(target.id);

            switch (punishment.type) {
                case PunishmentType.Mute: {
                    targetConfig.muted = false;
                    await targetConfig.save();

                    const targetMember = await GetGuild().members
                        .fetch(target.id)
                        .then((member) => { return member; })
                        .catch(() => { return; });

                    if (!targetMember) break;

                    ManageRole(targetMember, config.roles.Muted, "Remove", `appeal accepted by ${interaction.user.tag}`);
                    break;
                }

                case PunishmentType.Ban: {
                    targetConfig.banned = false;
                    await targetConfig.save();

                    GetGuild().members.unban(target, `appeal accepted by ${interaction.user.tag}`).catch(() => { return; });
                    break;
                }
            }
            punishment.active = false;
            await punishment.save();

            const modEmbed = CreateModEmbed(interaction.user, target, punishment, {
                anti: true,
                reason: `Punishment appeal accepted: ${bold(reason)}`
            });
            const userEmbed = CreateModEmbed(interaction.user, target, punishment, {
                anti: true,
                userEmbed: true,
                reason: `Punishment appeal accepted: ${bold(reason)}`
            });

            target.send({
                embeds: [userEmbed], components: punishment.type === PunishmentType.Ban ? [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setURL(config.ServerInvite)
                                .setLabel("You can join back using this link!")
                        )
                ] : []
            })
                .catch(() => { return; })
                .finally(async () => {
                    // kick the member from the prison
                    const member = await GetGuild(true).members.fetch(target.id);
                    member.kick("appealed punishment").catch(() => { return; });
                });
            GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });
        })
        .catch(() => {
            reasonMessage.delete();
            return "You've run out of time";
        });
}

async function createAppeal(interaction: ButtonInteraction) {
    const punishment = await PunishmentConfig.findOne({ user: interaction.user.id, active: true });
    if (!punishment) return "You don't have any active punishments!";
    if (punishment.appealed) return "You've already appealed this punishment.";

    const modal =
        new ModalBuilder()
            .setTitle(`Appeal punishment ${punishment.punishmentId}`)
            .setCustomId(`appeal.appealmodal-${punishment.punishmentId}`)
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("reason")
                        .setLabel("Why should your punishment be appealed?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMinLength(50)
                        .setMaxLength(1024)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("extra")
                        .setLabel("Anything else you'd like to add?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                        .setMaxLength(1024)
                )
            );

    try {
        await interaction.showModal(modal);
    } catch (e) {
        // handle error
        return "An error occurred while creating the modal";
    }
}

export default AppealCommand;