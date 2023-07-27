import { DBTicket, DBUser, TicketType } from "@mester-ulquiorra/commonlib";
import {
	APIActionRowComponent,
	APIButtonComponent,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	GuildMember,
	ModalSubmitInteraction,
	TextChannel,
	UserContextMenuCommandInteraction,
} from "discord.js";
import { SnowFlake } from "../Ulquiorra.js";
import config from "../config.js";
import TicketConfig from "../database/TicketConfig.js";
import { GetGuild } from "./ClientUtils.js";
import { GetUserConfig } from "./ConfigHelper.js";
import CreateEmbed from "./CreateEmbed.js";
import { ModName, ModNameToId, ModNameToLevel } from "./ModUtils.js";

export async function CreateTicket(
	ticketOwner: GuildMember,
	reason = "no reason provided",
	interaction: ModalSubmitInteraction | UserContextMenuCommandInteraction = null,
	type: TicketType = TicketType.General,
	usersToAdd: Array<string> = []
) {
	const ticketId = SnowFlake.getUniqueID().toString();

	const channelName = `ticket-${(ticketOwner.user.username + "xxxx").substring(0, 4)}-${ticketId.substring(ticketId.length - 4)}`;

	const ticketChannel = await GetGuild()
		.channels.create({
			name: channelName,
			topic: `Ticket created by ${ticketOwner}: **${reason}**`,
			parent: config.OpenTicketsCategory,
			reason: `Ticket created by ${ticketOwner.displayName}: ${reason}`,
		})
		.catch((error) => {
			throw error;
		});

	const ticket = await TicketConfig.create({
		ticketId: ticketId,
		channel: ticketChannel.id,
		creator: ticketOwner.id,
		type,
		// if usersToAdd is empty, we used the button and not the user context command
		mod: usersToAdd.length === 0 ? "-1" : ticketOwner.id,
		waitingfor: usersToAdd.length === 0 ? WaitingforFromType(type) : 0,
		modlevel: usersToAdd.length === 0 ? 0 : (await GetUserConfig(ticketOwner.id, "creating ticket")).mod,
	});

	// add the users to the ticket config
	usersToAdd.forEach((user) => ticket.users.set(user, "automatic"));
	await ticket.save();

	// reload ticket permissions
	ReloadTicketPermissions(ticketChannel, ticket);

	// create welcome embed
	const welcomeEmbed = CreateEmbed(`**Ticket __${channelName}__ created by ${ticketOwner}**`, {
		color: "success",
	})
		.addFields([
			{
				name: "Type",
				value: TicketTypeToName(type),
				inline: true,
			},
			{
				name: "Reason",
				value: reason,
				inline: true,
			},
			{
				name: "Created at",
				value: `<t:${Math.floor(Date.now() / 1000)}>`,
				inline: true,
			},
		])
		.setFooter({ text: `Ticket ID: ${ticketId}` });

	// only add the last field if userstoadd it empty
	if (usersToAdd.length === 0) {
		welcomeEmbed.addFields([
			{
				name: `Please tell us your problem and staff will be with you shortly.`,
				value: `Try to be as descriptive as possible.`,
				inline: false,
			},
		]);
	}

	ticketChannel.send({ embeds: [welcomeEmbed] });

	// ghost ping the users for their attention
	ticketChannel.send(ticketOwner.toString()).then((message) => message.delete());
	usersToAdd.forEach((user) => ticketChannel.send(`<@${user}>`).then((message) => message.delete()));

	// if userstoadd is empty, create a waitingfor message
	if (usersToAdd.length === 0) {
		const [waitingembed, components] = CreateWaitingforMessage(ticket.waitingfor, "new ticket", false);
		ticketChannel.send({
			embeds: [waitingembed],
			components: [components],
		});
	}

	// if we don't have an interaction, just leave now
	if (interaction === null) return;

	// create the return embed
	const embed = CreateEmbed(`**Ticket __${channelName}__ created in ${ticketChannel}**`, { color: "success" });

	interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Get the name of the ticket type
 * @param ticketType The ticket type to get the name of
 */
export function TicketTypeToName(ticketType: TicketType) {
	switch (ticketType) {
		case TicketType.General:
			return "General help";
		case TicketType.MemberReport:
			return "Member report";
		case TicketType.ModReport:
			return "Moderator report";
		case TicketType.HeadModReport:
			return "Head mod report";
		case TicketType.Private:
			return "Private ticket";
		default:
			return "No type";
	}
}

/**
 * A function for checking if the channel is a ticket
 * @param channelName The channel name we want to check.
 * @returns Wheter the channel is a ticket channel or not.
 */
export function ChannelIsTicket(channelName: string) {
	return /ticket-.+-\d{4}/.test(channelName);
}

/**
 * A function to check if the user can manage the ticket
 * @param ticket the ticket
 * @param userConfig the user config
 */
export function CanManageTicket(ticket: DBTicket, userConfig: DBUser) {
	// if the user is an admin or higher, return true
	if (userConfig.mod >= ModNameToLevel("Admin")) return true;

	// if the user is a head mod, and the ticket's type is not a head mod report, return true
	if (userConfig.mod === ModNameToLevel("Head") && ticket.type < TicketType.HeadModReport) return true;

	// if the user is a normal mod, and the ticket's type is not a mod or a headmod report, return true
	if (userConfig.mod < ModNameToLevel("Head") && userConfig.mod != 0 && ticket.type < TicketType.ModReport) return true;

	// if the id of the user is the same as the creator of ticketconfig, return true
	if (ticket.creator === userConfig.userId) return true;

	return false;
}

/**
 *
 * @param modlevel The mod level we're waiting for.
 * @param reason The reason for the waiting.
 * @param showcancel Whether or not to show the cancel button.
 */
export function CreateWaitingforMessage(
	modlevel: number,
	reason = "no reason",
	showcancel = true
): [EmbedBuilder, APIActionRowComponent<APIButtonComponent>] {
	const returnembed = CreateEmbed(`**This ticket is now waiting for a mod with at least ${modlevel} mod level: __${reason}__**`);

	const components = new ActionRowBuilder<ButtonBuilder>().addComponents([
		new ButtonBuilder().setCustomId("ticket.accept").setLabel("Accept ticket").setStyle(ButtonStyle.Success).setEmoji("✅"),
	]);

	if (showcancel)
		components.addComponents([
			new ButtonBuilder().setCustomId("ticket.cancelsendto").setLabel("Cancel").setStyle(ButtonStyle.Danger).setEmoji("❎"),
		]);

	return [returnembed, components.toJSON()];
}

/**
 * A function for reloading a ticket channel's permissions to match its mod level
 * @param channel The ticket channel
 * @param ticket The ticket's config
 */
export async function ReloadTicketPermissions(channel: TextChannel, ticket: DBTicket) {
	// if waitingfor is 0, set modlevel to the modlevel of the ticket, otherwise set it to waitingfor
	const modlevel: number = ticket.waitingfor === 0 ? ticket.modlevel : ticket.waitingfor;

	// give every user access permission (send message if the ticket is not closed)
	for (const [user, reason] of ticket.users) {
		channel.permissionOverwrites
			.create(
				user,
				{
					ViewChannel: true,
					SendMessages: !ticket.closed,
				},
				{
					reason: `user is part of ticket: ${reason}`,
				}
			)
			.catch(() => {
				return;
			});
	}

	// add view permission to the creator
	channel.permissionOverwrites
		.create(ticket.creator, {
			ViewChannel: true,
			SendMessages: !ticket.closed,
		})
		.catch(() => {
			return;
		});

	// if ticketconfig's mod is not -1, give the mod access permission
	if (ticket.mod !== "-1") {
		channel.permissionOverwrites
			.create(ticket.mod, {
				ViewChannel: true,
				SendMessages: !ticket.closed,
			})
			.catch(() => {
				return;
			});
	}

	channel.permissionOverwrites
		.create(ModNameToId("Head"), {
			ViewChannel: ModNameToLevel("Head") >= modlevel,
			SendMessages: true,
			ManageMessages: true,
		})
		.catch(() => {
			return;
		});

	// now we are at the normal mods
	// let's go through them, cause cool
	for (let i = 1; i <= ModNameToLevel("Level 3"); i++) {
		const modRoleId = ModNameToId(`Level ${i}` as ModName);
		channel.permissionOverwrites
			.create(modRoleId, {
				ViewChannel: ModNameToLevel(`Level ${i}` as ModName) >= modlevel,
				SendMessages: false, // this is so only the claimer mod can send messages
			})
			.catch(() => {
				return;
			});
	}
}

function WaitingforFromType(ticketType: TicketType) {
	switch (ticketType) {
		case TicketType.Private:
			return 0;
		case TicketType.General:
		case TicketType.MemberReport:
			return 1;
		case TicketType.ModReport:
			return 4;
		case TicketType.HeadModReport:
			return 5;
	}
}
