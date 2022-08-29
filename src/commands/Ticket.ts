import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Client, GuildMember, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction } from "discord.js";
import TicketConfig, { TicketType } from "../database/TicketConfig";
import SlashCommand from "../types/SlashCommand";
import { GetUserConfig } from "../util/ConfigHelper";
import { CanManageTicket, ChannelIsTicket, CreateTicket, CreateWaitingforMessage, GetUsersFromTicket, ReloadTicketPermissions, TicketTypeToName } from "../util/TicketUtils";
import { v4 as uuidv4 } from "uuid";
import { CanManageUser, ModNameToLevel } from "../util/ModUtils";
import GetError from "../util/GetError";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";
import config from "../config";

const TicketCreateRegex = /^ticket\.create[0-3]$/;

const TicketCommand: SlashCommand = {
	name: "ticket",
	userContextCommandNames: ["Create Ticket"],

	async run(interaction: ChatInputCommandInteraction, _client: Client) {
		const userConfig = await GetUserConfig(interaction.user.id);

		// check if user's mod is 0 (if it is, return)
        if (userConfig.mod === 0) return GetError("Permission");

        // check if we're in a ticket
        if (!ChannelIsTicket(interaction.channel as TextChannel))
            return "You can only use this comand in a ticket.";

        const subcommand = interaction.options.getSubcommand();

        // if the subcommand is either add or remove
        if (subcommand === "add" || subcommand === "remove") {
            const target = interaction.options.getMember("member") as GuildMember;
            if (!target) return "The member is not in the server anymore"

            // get the reason
            const reason = interaction.options.getString("reason") ?? "no reason provided";

            // run the manage_user function and return it's value
            return manageUser(
                interaction,
                target,
                userConfig,
                subcommand.toUpperCase() as "ADD" | "REMOVE",
                reason
            );
        }

        if (subcommand === "close") return close(interaction, userConfig);
        if (subcommand === "delete") return deleteTicket(interaction, userConfig);
        if (subcommand === "sendto") return sendto(interaction, userConfig);
	},

	async runButton(interaction: ButtonInteraction, _client: Client) {
		const userConfig = await GetUserConfig(interaction.user.id);

		if (interaction.customId === "ticket.reopen")
            return reopen(interaction, userConfig);
        if (interaction.customId === "ticket.delete")
            return deleteTicket(interaction, userConfig);
        if (interaction.customId === "ticket.accept")
            return accept(interaction, userConfig);
        if (interaction.customId === "ticket.cancelsendto")
            return cancelsendto(interaction, userConfig);

		if(interaction.customId.match(TicketCreateRegex)) {
			// check if the user already has an open ticket (mods bypass this)
			if(userConfig.mod === 0 && (await TicketConfig.findOne({ creator: interaction.user.id, closed: false })))
				return "You already have an opened ticket";

			const ticketType = Number.parseInt(interaction.customId[interaction.customId.length - 1]);

			const modal = new ModalBuilder()
				.setTitle(`Create ticket: ${TicketTypeToName(ticketType)}`)
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents([
						new TextInputBuilder()
							.setCustomId("reason")
                            .setLabel("Reason (NOT the full problem)")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(
                                "Tell us why you opened this ticket in a short sentence."
                            )
                            .setMaxLength(100)
                            .setRequired(true),
					])
				);

			// set the correct customid
            // !!! to prevent multiple modals from being sent, an uuid is added to the start
            const uuid = uuidv4();
            switch (ticketType) {
                case TicketType.General:
                    modal.setCustomId(uuid + "0");
                    break;

                case TicketType.MemberReport:
                    modal.setCustomId(uuid + "1");
                    break;

                case TicketType.ModReport:
                    modal.setCustomId(uuid + "2");
                    break;

                case TicketType.HeadModReport:
                    modal.setCustomId(uuid + "3");
            }

            // send the modal and wait for it to return
            await interaction.showModal(modal);

            interaction.awaitModalSubmit({
                filter: (x) => x.user.id === interaction.user.id && x.customId.startsWith(uuid),
                time: 120_000,
            }).then((returnmodal) => {
                const type = Number.parseInt(returnmodal.customId[returnmodal.customId.length - 1]);

                // create the ticket (result should be handled)
                CreateTicket(
                    returnmodal.member as GuildMember,
                    returnmodal.fields.getTextInputValue("reason"),
                    returnmodal,
                    type
                );
            }).catch(() => {
                interaction.followUp({
                    content: "Sorry, you've run out of time!",
                    ephemeral: true,
                });
            })
		}
	},

	async runUserContextCommand(interaction: UserContextMenuCommandInteraction, _client: Client) {
		if(interaction.commandName === "Create Ticket") {
			CreateTicket(
				interaction.member as GuildMember,
				`added ${interaction.targetUser} from context menu`,
				interaction,
				TicketType.Private,
				[ interaction.targetId ]
			)
		}
	}
}

/**
 * A function for managing users in a ticket
 * @param interaction The command interaction that invoked the command
 * @param target The member to add or remove
 * @param userConfig The user's config
 * @param type Either to add or remove the member
 * @param reason The reason for the action
 */
async function manageUser(interaction: ChatInputCommandInteraction, target: GuildMember, userConfig: any, type: "ADD" | "REMOVE", reason: string) {
    // get member config
    const targetConfig = await GetUserConfig(target.id);

    // check if user can manage member
    if (!CanManageUser(userConfig, targetConfig))
        return GetError("BadUser");

    // get ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });

    if (!ticketConfig) return GetError("Database");
    if (ticketConfig.closed) return "This ticket is closed.";

    // check if user can manage ticket
    if (!CanManageTicket(ticketConfig, userConfig))
        return GetError("Permission");

    const ticketChannel = interaction.channel as TextChannel;

    // get the users
    const ticketUsers = GetUsersFromTicket(ticketConfig);

    // if type is REMOVE
    if (type === "REMOVE") {
        // check if the member is in the ticket
        if (!ticketUsers.has(target.id))
            return "That user is not in the ticket.";

        // remove the member from the users
        ticketUsers.delete(target.id);

        // remove the member from the ticket as permission overwrite
        ticketChannel.permissionOverwrites.delete(target.id).catch(() => {
            return;
        });

        // create the embed and send it
        const embed = CreateEmbed(
            `**${target} has been removed from the ticket by ${interaction.user}: __${reason}__**`,
            {
                color: EmbedColor.Success,
            }
        );

        interaction.reply({ embeds: [embed] });
    }

    if (type === "ADD") {
        // check if the member is already in the ticket
        if (ticketUsers.has(target.id))
            return "That user is already in the ticket.";

        // add the member to the users
        ticketUsers.set(target.id, reason);

        // we don't have to add the member to the ticket as permission overwrite, we'll do a permission reload anyways

        // create the welcome embed
        const embed = CreateEmbed(
            `**${target}, you have been added to the ticket by ${interaction.user}: __${reason}__**`,
            {
                color: EmbedColor.Success,
            }
        );

        // send the welcome embed and also ghost ping the member (after we've reloaded ticket permissions)
        interaction.reply({ embeds: [embed] });
    }

    // save the ticket config
    await ticketConfig.save();

    // reload ticket permissions + ping the member (if it was an ADD type)
    ReloadTicketPermissions(ticketChannel, ticketConfig).then(() => {
        if (type !== "ADD") return;
        ticketChannel.send(target.toString()).then((message) => {
            message.delete();
        });
    });
};

/**
 *
 * @param interaction The command interaction that invoked the command
 * @param userConfig The user's config
 */
async function close(interaction: ChatInputCommandInteraction, userConfig: any) {
    // get the reason
    const reason = interaction.options.getString("reason") ?? "no reason provided";

    // get the ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });
    if (!ticketConfig) return GetError("Database");
    if (ticketConfig.closed) return "This ticket is already closed.";

    // check if user can manage ticket
    if (!CanManageTicket(ticketConfig, userConfig))
        return GetError("Permission");

    // get the ticket channel
    const ticketChannel = interaction.channel as TextChannel;

    // move the ticket to closed tickets
    ticketChannel.setParent(config.CLOSED_TICKETS_CATEGORY, {
        // make sure we DON'T lock permissions
        lockPermissions: false,
        reason: `Ticket closed by ${interaction.user.tag}: ${reason}`,
    });

    // set ticket to closed
    ticketConfig.closed = true;
    ticketConfig.closedat = Math.floor(Date.now() / 1000);
    await ticketConfig.save();

    // create the close embed
    const embed = CreateEmbed(
        `**Ticket closed by ${interaction.user}: __${reason}__**`,
        {
            color: EmbedColor.Success,
        }
    ).setFooter({ text: "The ticket is going to be deleted in a day." });

    // add the "Reopen ticket" and "Delete ticket" buttons
    const components = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
            .setCustomId("ticket.reopen")
            .setLabel("Reopen ticket")
            .setEmoji("↩️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("ticket.delete")
            .setLabel("Delete ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger),
    ]);

    interaction.reply({ embeds: [embed], components: [components.toJSON() as APIActionRowComponent<any>] });

    // reload ticket permissions
    ReloadTicketPermissions(ticketChannel, ticketConfig);
}

/**
 * A function for deleting a ticket
 * @param interaction The command interaction that invoked the command
 * @param userConfig The user's config
 */
async function deleteTicket(interaction: ChatInputCommandInteraction | ButtonInteraction, userConfig: any) {
    // get ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });

    if (!ticketConfig) return GetError("Database");

    // check if user can manage ticket
    if (!CanManageTicket(ticketConfig, userConfig))
        return GetError("Permission");

    // get the ticket channel
    const ticketChannel = interaction.channel as TextChannel;

    // delete the interaction, then delete the ticket
    interaction.deferReply().then(() => {
        interaction.deleteReply().then(() => {
            ticketChannel.delete(
                `Ticket deleted by ${interaction.user.tag}`
            );
        });
    });

    // delete the ticket config
    await ticketConfig.delete();
};

/**
 *
 * @param interaction The command interaction that invoked the command
 * @param userConfig The user's config
 */
async function sendto(interaction: ChatInputCommandInteraction, userConfig: any) {
    // get ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });
    if (!ticketConfig) return GetError("Database");

    // check if user can manage ticket
    if (!CanManageTicket(ticketConfig, userConfig))
        return GetError("Permission");

    // get the mod level and reason
    const modLevel = interaction.options.getInteger("modlevel");
    const reason = interaction.options.getString("reason") ?? "no reason provided";

    // check if the ticket is already waiting for a moderator (head mods and higher bypass this check)
    if (
        ticketConfig.waitingfor != 0 &&
        userConfig.mod < ModNameToLevel("Head")
    )
        return "This ticket is already waiting for a moderator.";

    // check if the modLevel is lower than the user's mod level (head mods and higher bypass this check)
    if (
        modLevel <= userConfig.mod &&
        userConfig.mod < ModNameToLevel("Head")
    )
        return "You can't send a ticket to a lower mod level than yours.";

    // check if modLevel is 0
    if (modLevel === 0) return GetError("Value", "modlevel");

    // change the ticket's waitingfor to the mod level
    ticketConfig.waitingfor = modLevel;
    await ticketConfig.save();

    // send the waitingfor message
    const [embed, components] = CreateWaitingforMessage(
        modLevel,
        reason,
        true
    );

    // send the embed
    interaction.reply({ embeds: [embed], components: [components] });
};

async function reopen(interaction: ButtonInteraction, userConfig: any) {
    // get ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });

    if (!ticketConfig) return GetError("Database");
    if (!ticketConfig.closed) return "The ticket is not closed.";

    // check if user can manage ticket
    if (!CanManageTicket(ticketConfig, userConfig))
        return GetError("Permission");

    // get the ticket channel
    const ticketChannel = interaction.channel as TextChannel;

    // move channel to opened ticket category
    ticketChannel.setParent(config.OPEN_TICKETS_CATEGORY, {
        // make sure we DON'T lock permissions
        lockPermissions: false,
        reason: `Ticket reopened by ${interaction.user.tag}`,
    });

    // set ticket to opened
    ticketConfig.closed = false;
    ticketConfig.closedat = -1;
    await ticketConfig.save();

    // send the embed
    const embed = CreateEmbed(
        `**Ticket reopened by ${interaction.user}**`,
        { color: EmbedColor.Success }
    );
    ticketChannel.send({ embeds: [embed] });

    // remove the buttons from the original message
    interaction.update({ components: [] });

    // reload ticket permissions
    ReloadTicketPermissions(ticketChannel, ticketConfig);
};

async function accept(interaction: ButtonInteraction, userConfig: any) {
    // get ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });

    if (!ticketConfig) return GetError("Database");

    // check if user's mod is lower than the ticket's waitingfor
    if (userConfig.mod < ticketConfig.waitingfor)
        return GetError("Permission");

    // set the ticket's mod to the user's id
    ticketConfig.mod = interaction.user.id;

    // set the ticket's modlevel to waitingfor
    ticketConfig.modlevel = ticketConfig.waitingfor;

    // set the ticket's waitingfor to 0
    ticketConfig.waitingfor = 0;
    await ticketConfig.save();

    // edit the interaction
    interaction.update({
        embeds: [
            CreateEmbed(`**Ticket claimed by ${interaction.user}**`, {
                color: EmbedColor.Success,
            }),
        ],
        components: [],
    });

    // reload ticket permissions
    ReloadTicketPermissions(interaction.channel as TextChannel, ticketConfig);
};

async function cancelsendto(interaction: ButtonInteraction, userConfig: any) {
    // get ticket config
    const ticketConfig = await TicketConfig.findOne({
        channel: interaction.channelId,
    });

    if (!ticketConfig) return GetError("Database");

    // check if user can actually cancel the sendto
    if (
        interaction.user.id != ticketConfig.mod &&
        // head mods and higher bypass this check
        userConfig.mod < ModNameToLevel("Head")
    )
        return GetError("Permission");

    // set the ticket's waitingfor to 0
    ticketConfig.waitingfor = 0;
    await ticketConfig.save();

    // edit the original message
    interaction.update({
        embeds: [CreateEmbed(`**Cancelled by ${interaction.user}**`)],
        components: [],
    });
};

export default TicketCommand;