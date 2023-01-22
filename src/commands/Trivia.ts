import { ActionRowBuilder, APIActionRowComponent, APIButtonComponent, APISelectMenuOption, APIStringSelectComponent, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder, GuildMember, Interaction, InteractionCollector, Message, StringSelectMenuBuilder } from "discord.js";
import { getQuestions, Question } from "open-trivia-db";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import Log, { LogType } from "../util/Log.js";

const TriviaCommmand: SlashCommand = {
    name: "trivia",

    async run(interaction, _client) {
        const category = Number.parseInt(
            interaction.options.getString("category")
        );

        await interaction.reply({
            embeds: [CreateEmbed("Setting up the game...")],
        });
        const message = await interaction.fetchReply();

        // create the game
        new TriviaGame(
            message,
            interaction.member as GuildMember,
            isNaN(category) ? null : category,
            interaction.options.getString("difficulty") as "easy" | "medium" | "hard" | "mixed" ?? "medium",
            interaction.options.getInteger("rounds") ?? 5
        );
    }
};

class TriviaGame {
    player: GuildMember;
    difficulty: "easy" | "medium" | "hard" | "mixed";
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
    constructor(
        message: Message,
        player: GuildMember,
        category: number,
        difficulty: "easy" | "medium" | "hard" | "mixed" = "medium",
        amount = 5
    ) {
        this.player = player;
        this.category = category;
        this.difficulty = difficulty;
        this.message = message;
        this.turn = 0;
        this.correctAnswers = 0;

        // set up component collector for the Continue and Quit buttons
        this.componentCollector = this.message
            .createMessageComponentCollector({
                filter: (x) =>
                    x.user.id === this.player.id &&
                    ["trivia.continue", "trivia.quit"].includes(x.customId),
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
                            color: EmbedColor.Success,
                        });

                        embed.addFields([
                            {
                                name: "Correct answers",
                                value: this.correctAnswers.toString(),
                                inline: true,
                            },
                            {
                                name: "Incorrect answers",
                                value: (
                                    this.questions.length - this.correctAnswers
                                ).toString(),
                                inline: true,
                            },
                            {
                                name: "Accuracy",
                                value: `${(
                                    (this.correctAnswers * 100) /
                                    this.questions.length
                                ).toFixed(2)}%`,
                            },
                        ]);

                        // also add a "Show questins" button
                        this.message.edit({
                            embeds: [embed],
                            components: [
                                new ActionRowBuilder<ButtonBuilder>().addComponents([
                                    new ButtonBuilder()
                                        .setCustomId("trivia.history")
                                        .setStyle(ButtonStyle.Secondary)
                                        .setLabel("Show questions"),
                                ]).toJSON(),
                            ],
                        });

                        this.message
                            .createMessageComponentCollector({
                                filter: (x) => x.customId === "trivia.history",
                                componentType: ComponentType.Button,
                            })
                            .on("collect", (button2) => {
                                // check if we already have a summery embed
                                if (this.summaryEmbed) {
                                    button2.reply({
                                        embeds: [this.summaryEmbed],
                                        ephemeral: true
                                    });
                                    return;
                                }

                                const embed2 = CreateEmbed(
                                    `Player: ${this.player}`,
                                    {
                                        title: "Trivia game question summary",
                                    }
                                );

                                for (let i = 0; i < this.questions.length; i++) {
                                    const question = this.questions[i];
                                    embed2.addFields([
                                        {
                                            name: `${i + 1}. ${question.value}`,
                                            value: `Correct answer: ${question.correctAnswer} | Player's answer: ${question.userAnswer != null ? question.userAnswer : "ran out of time"}`,
                                        },
                                    ]);
                                }

                                // save the summary embed
                                this.summaryEmbed = embed2;

                                button2.reply({
                                    embeds: [embed2],
                                    ephemeral: true,
                                });
                            });

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

    async start(amount: number) {
        // generate questions
        if (this.difficulty === "mixed") {
            // this is a bit trickier
            // generate 3 arrays with all the difficulties, each arrays has amount / 3 questions (with mixed difficulty amount will always be 3 or more)
            const amounts = [
                Math.floor(amount / 3),
                Math.floor(amount / 3) + (amount % 3),
                Math.floor(amount / 3),
            ];

            const easy =
                await getQuestions({
                    difficulty: "easy",
                    amount: amounts[0],
                    category: this.category,
                });

            const medium =
                await getQuestions({
                    difficulty: "medium",
                    amount: amounts[1],
                    category: this.category,
                });

            const hard =
                await getQuestions({
                    difficulty: "hard",
                    amount: amounts[2],
                    category: this.category,
                });

            // combine and shuffle the arrays
            this.questions = shuffle<Question>(easy.concat(medium, hard));
        } else {
            this.questions = await getQuestions({
                difficulty: this.difficulty,
                amount,
                category: this.category,
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
                filter: (i: Interaction) => i.user.id === this.player.id && (i.isStringSelectMenu() || i.isButton()),
                time: 30_000,
            })
            .then(async (interaction) => {
                interaction.deferUpdate();

                // get the id
                let id = 0;
                if (interaction.isButton()) {
                    id = Number.parseInt(interaction.customId[interaction.customId.length - 1]);
                } else if (interaction.isStringSelectMenu()) {
                    id = Number.parseInt(interaction.values[0]);
                } else {
                    // wtf
                    Log(`Trivia question got neither a button or select menu???`, LogType.Error);
                    this.end(true, "a fatal error has occured, please alert Mester");
                    return;
                }

                const userAnswer = this.questions[this.turn].mappedAnswers.get(id);

                // save user's answer
                this.questions[this.turn].userAnswer = userAnswer;

                // check if the answer is correct
                if (this.questions[this.turn].checkAnswer(userAnswer)) {
                    // correct answer
                    this.correctAnswers++;

                    // redraw message
                    const { embed: embed2, components: components2 } =
                        this.generateMessage(
                            true,
                            this.questions[this.turn].value +
                            `\nYour answer: **${userAnswer}**`
                        );

                    this.message.edit({
                        embeds: [embed2],
                        components: components2,
                    });
                } else {
                    // incorrect answer
                    let correct_answer = this.questions[this.turn].correctAnswer;

                    if (this.questions[this.turn].type === "boolean")
                        correct_answer = correct_answer === "True" ? "Correct" : "Incorrect";

                    const { embed: embed2, components: components2 } =
                        this.generateMessage(
                            false,
                            this.questions[this.turn].value +
                            `\nThe correct answer was: **${correct_answer}**`
                        );

                    this.message.edit({
                        embeds: [embed2],
                        components: components2,
                    });
                }
            })
            .catch(() => {
                // redraw message
                const { embed: embed2, components: components2 } =
                    this.generateMessage(false, "You ran out of time!");

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

        let color = EmbedColor.Info;
        if (isCorrect != null) color = isCorrect ? EmbedColor.Success : EmbedColor.Error;

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
                value:
                    this.questions[this.turn].difficulty
                        .charAt(0)
                        .toUpperCase() +
                    this.questions[this.turn].difficulty.slice(1),
                inline: true,
            },
        ]);

        if (isCorrect == null)
            embed.setFooter({ text: "You have 30 seconds to answer!" });

        let components: Array<APIActionRowComponent<APIButtonComponent | APIStringSelectComponent>> = [];

        if (isCorrect != null) {
            components = [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setCustomId("trivia.continue")
                        .setLabel(
                            this.turn === this.questions.length - 1
                                ? "Summary"
                                : "Continue"
                        )
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("trivia.quit")
                        .setLabel("Quit")
                        .setStyle(ButtonStyle.Danger),
                ]).toJSON(),
            ];
            return { embed, components };
        }

        let ids: number[] = [];
        for (let i = 0; i < this.questions[this.turn].allAnswers.length; i++) {
            ids.push(i);
        }
        ids = shuffle(ids);

        const allAnswers = [this.questions[this.turn].correctAnswer, ...this.questions[this.turn].incorrectAnswers].map(x => String(x));

        // set the mapped answers
        this.questions[this.turn].mappedAnswers = new Map<number, string>(
            allAnswers.map((x, i) => { return [ids[i], x]; })
        );

        // check if correct answer is a yes/no question
        if (this.questions[this.turn].type === "boolean") {
            components = [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`trivia.answer${ids[0]}`)
                        .setLabel("Correct")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`trivia.answer${ids[1]}`)
                        .setLabel("Incorrect")
                        .setStyle(ButtonStyle.Danger),
                ]).toJSON(),
            ];
        } else {
            let options: Array<APISelectMenuOption> = [];

            // fill options based on allAnswers and ids
            for (let i = 0, answer = allAnswers[0]; i < allAnswers.length; i++, answer = allAnswers[i]) {
                options.push({
                    label: answer,
                    value: ids[i].toString()
                });
            }

            // shuffle options
            options = shuffle(options);

            components = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId("trivia.answer")
                        .setOptions(options)
                        .setMaxValues(1)
                        .setMinValues(1),
                ]).toJSON()
            ];
        }

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
                color: EmbedColor.Error,
            });
            this.message.edit({ embeds: [embed], components: [] });
        }
    }
}

interface TriviaQuestion extends Question {
    userAnswer?: string,
    mappedAnswers?: Map<number, string>
}

/**
 * A utility function for shuffling an array (https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
 * @param array The array to shuffle
 * @returns The shuffled array
 */
function shuffle<T>(array: Array<T>) {
    let currentIndex = array.length,
        randomIndex: number;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }

    return array;
}

export default TriviaCommmand;