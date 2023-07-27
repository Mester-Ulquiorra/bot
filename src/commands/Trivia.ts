import {
	ActionRowBuilder,
	APIActionRowComponent,
	APIButtonComponent,
	APISelectMenuOption,
	APIStringSelectComponent,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	Interaction,
	InteractionCollector,
	Message,
	StringSelectMenuBuilder,
} from "discord.js";
import { getQuestions, Question } from "open-trivia-db";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import { shuffleArray } from "../util/MiscUtils.js";

const TriviaCommmand: SlashCommand = {
	name: "trivia",

	async run(interaction, _client) {
		const category = Number.parseInt(interaction.options.getString("category"));

		await interaction.reply({
			embeds: [CreateEmbed("Setting up the game...")],
		});
		const message = await interaction.fetchReply();

		// create the game
		new TriviaGame(
			message,
			interaction.member as GuildMember,
			isNaN(category) ? null : category,
			(interaction.options.getString("difficulty") as TriviaDifficulty) ?? "medium",
			interaction.options.getInteger("rounds") ?? 5
		);
	},
};

type TriviaDifficulty = "easy" | "medium" | "hard" | "mixed";

class TriviaGame {
	player: GuildMember;
	difficulty: TriviaDifficulty;
	category: number;
	questions: Array<TriviaQuestion>;
	turn: number;
	message: Message;
	correctAnswers: number;
	componentCollector: InteractionCollector<ButtonInteraction>;
	summaryEmbed: EmbedBuilder;

	/**
	 *
	 * @param {Message} message The game's messages
	 * @param {GuildMember} player The player who is playing the game
	 * @param {number} category The category of the game
	 * @param {string} difficulty The difficulty of the game
	 * @param {number} amount The amount of questions to be asked
	 */
	constructor(message: Message, player: GuildMember, category: number, difficulty: TriviaDifficulty = "medium", amount = 5) {
		this.player = player;
		this.category = category;
		this.difficulty = difficulty;
		this.message = message;
		this.turn = 0;
		this.correctAnswers = 0;

		// set up component collector for the Continue and Quit buttons
		this.componentCollector = this.message
			.createMessageComponentCollector({
				filter: (x) => x.user.id === this.player.id && ["trivia.continue", "trivia.quit"].includes(x.customId),
				componentType: ComponentType.Button,
			})
			.on("collect", (button: ButtonInteraction) => {
				button.deferUpdate();
				if (button.customId === "trivia.continue") {
					this.turn++;
					if (this.turn >= this.questions.length) {
						// show summary
						const embed = CreateEmbed("Here are your results!", {
							title: "Summary",
							color: "success",
						});

						embed.addFields([
							{
								name: "Correct answers",
								value: this.correctAnswers.toString(),
								inline: true,
							},
							{
								name: "Incorrect answers",
								value: (this.questions.length - this.correctAnswers).toString(),
								inline: true,
							},
							{
								name: "Accuracy",
								value: `${((this.correctAnswers * 100) / this.questions.length).toFixed(2)}%`,
							},
						]);

						// also add a "Show questins" button
						this.message.edit({
							embeds: [embed],
							components: [
								new ActionRowBuilder<ButtonBuilder>()
									.addComponents([
										new ButtonBuilder()
											.setCustomId("trivia.history")
											.setStyle(ButtonStyle.Secondary)
											.setLabel("Show questions"),
									])
									.toJSON(),
							],
						});

						this.message
							.createMessageComponentCollector({
								filter: (x) => x.customId === "trivia.history",
								componentType: ComponentType.Button,
							})
							.on("collect", this.showSummary.bind(this));

						this.end(false);
						return;
					}
					this.performTurn();
				} else if (button.customId === "trivia.quit") {
					this.end();
				}
			});
		this.start(amount);
	}

	async showSummary(button: ButtonInteraction) {
		// check if we already have a summary embed
		if (this.summaryEmbed) {
			button.reply({
				embeds: [this.summaryEmbed],
				ephemeral: true,
			});
			return;
		}

		const embed = CreateEmbed(`Player: ${this.player}`, {
			title: "Trivia game question summary",
		});

		for (let i = 0; i < this.questions.length; i++) {
			const question = this.questions[i];
			embed.addFields([
				{
					name: `${i + 1}. ${question.value}`,
					value: `Correct answer: ${question.correctAnswer} | Player's answer: ${
						question.userAnswer != null ? question.userAnswer : "ran out of time"
					}`,
				},
			]);
		}

		// save the summary embed
		this.summaryEmbed = embed;

		button.reply({
			embeds: [this.summaryEmbed],
			ephemeral: true,
		});
	}

	async start(amount: number) {
		// generate questions
		if (this.difficulty === "mixed") {
			// this is a bit trickier
			// generate 3 arrays with all the difficulties, each arrays has amount / 3 questions (with mixed difficulty amount will always be 3 or more)
			const amounts = [Math.floor(amount / 3), Math.floor(amount / 3) + (amount % 3), Math.floor(amount / 3)];

			const easy = await getQuestions({
				difficulty: "easy",
				amount: amounts[0],
				category: this.category,
				type: "multiple",
			});

			const medium = await getQuestions({
				difficulty: "medium",
				amount: amounts[1],
				category: this.category,
				type: "multiple",
			});

			const hard = await getQuestions({
				difficulty: "hard",
				amount: amounts[2],
				category: this.category,
				type: "multiple",
			});

			// combine and shuffle the arrays
			this.questions = shuffleArray(easy.concat(medium, hard));
		} else {
			this.questions = await getQuestions({
				difficulty: this.difficulty,
				amount,
				category: this.category,
				type: "multiple",
			});
		}

		this.performTurn();
	}

	performTurn() {
		const { embed, components } = this.generateMessage();

		this.message.edit({ embeds: [embed], components });

		// wait for a response
		this.message
			.awaitMessageComponent({
				filter: (i: Interaction) => i.user.id === this.player.id,
				time: 30_000,
				componentType: ComponentType.StringSelect,
			})
			.then(async (interaction) => {
				interaction.deferUpdate();

				// get the id
				const id = Number.parseInt(interaction.values[0]);

				const userAnswer = this.questions[this.turn].shuffledAnswers.find((a) => a.id === id).answer;

				// save user's answer
				this.questions[this.turn].userAnswer = userAnswer;

				// check if the answer is correct
				if (this.questions[this.turn].checkAnswer(userAnswer)) {
					// correct answer
					this.correctAnswers++;

					// redraw message
					const { embed: embed2, components: components2 } = this.generateMessage(
						true,
						this.questions[this.turn].value + `\nYour answer: **${userAnswer}**`
					);

					this.message.edit({
						embeds: [embed2],
						components: components2,
					});
				} else {
					// incorrect answer
					let correct_answer = this.questions[this.turn].correctAnswer;

					if (this.questions[this.turn].type === "boolean") correct_answer = correct_answer === "True" ? "Correct" : "Incorrect";

					const { embed: embed2, components: components2 } = this.generateMessage(
						false,
						this.questions[this.turn].value + `\nThe correct answer was: **${correct_answer}**`
					);

					this.message.edit({
						embeds: [embed2],
						components: components2,
					});
				}
			})
			.catch(() => {
				// redraw message
				const { embed: embed2, components: components2 } = this.generateMessage(false, "You ran out of time!");

				this.message.edit({
					embeds: [embed2],
					components: components2,
				});
			});
	}

	/**
	 *
	 * @param isCorrect Whether the answer was correct or not
	 * @param reason Optional reason why the answer was (in)correct
	 */
	generateMessage(isCorrect: boolean = null, reason: string = null) {
		let description = `**${this.questions[this.turn].value}**`;

		if (isCorrect != null && reason != null) description = reason;

		let color: EmbedColor = "info";
		if (isCorrect != null) color = isCorrect ? "success" : "error";

		const embed = CreateEmbed(description, {
			title: `Trivia game (Question ${this.turn + 1}/${this.questions.length})`,
			color,
		});

		embed.addFields([
			{
				name: "Category",
				value: this.questions[this.turn].category,
				inline: true,
			},
			{
				name: "Difficulty",
				value: this.questions[this.turn].difficulty.charAt(0).toUpperCase() + this.questions[this.turn].difficulty.slice(1),
				inline: true,
			},
		]);

		if (isCorrect == null) embed.setFooter({ text: "You have 30 seconds to answer!" });

		let components: Array<APIActionRowComponent<APIButtonComponent | APIStringSelectComponent>> = [];

		if (isCorrect != null) {
			components = [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents([
						new ButtonBuilder()
							.setCustomId("trivia.continue")
							.setLabel(this.turn === this.questions.length - 1 ? "Summary" : "Continue")
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder().setCustomId("trivia.quit").setLabel("Quit").setStyle(ButtonStyle.Danger),
					])
					.toJSON(),
			];
			return { embed, components };
		}

		const allAnswers = shuffleArray(
			[this.questions[this.turn].correctAnswer, ...this.questions[this.turn].incorrectAnswers].map((x) => String(x))
		);

		// assign a random id to each answer
		const answerMap = new Array<{ id: number; answer: string }>();
		for (let i = 0; i < allAnswers.length; i++) {
			answerMap.push({ id: i, answer: allAnswers[i] });
		}

		// set the shuffled answers
		this.questions[this.turn].shuffledAnswers = answerMap;
		const options: Array<APISelectMenuOption> = [];

		// fill options based on allAnswers and ids
		for (let i = 0, answer = answerMap[0]; i < answerMap.length; i++, answer = answerMap[i]) {
			options.push({
				label: answer.answer,
				value: answer.id.toString(),
			});
		}

		components = [
			new ActionRowBuilder<StringSelectMenuBuilder>()
				.addComponents([
					new StringSelectMenuBuilder().setCustomId("trivia.answer").setOptions(options).setMaxValues(1).setMinValues(1),
				])
				.toJSON(),
		];

		return { embed, components };
	}

	/**
	 *
	 * @param didQuit If the player quit the game (false if it's actually the end of the game)
	 * @param reason Optional reason for the end
	 */
	end(didQuit = true, reason = null) {
		this.componentCollector.stop("The game has ended!");
		if (didQuit) {
			const embed = CreateEmbed(reason ? reason : "You quit the game!", {
				title: `Trivia game (Question ${this.turn + 1}/${this.questions.length})`,
				color: "error",
			});
			this.message.edit({ embeds: [embed], components: [] });
		}
	}
}

interface TriviaQuestion extends Question {
	userAnswer?: string;
	shuffledAnswers?: { id: number; answer: string }[];
}

export default TriviaCommmand;
