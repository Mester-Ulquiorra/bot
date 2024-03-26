import * as chess from "chess.js";
import testMode from "./testMode.js";
import { ModName } from "./util/ModUtils.js";

const base = {
    /**
     * Values that are considered dangerous and should not be shared.
     */
    DANGER: {
        /**
         * The token of the bot.
         */
        TOKEN: "redacted",
        /**
         * URL of the MongoDB database.
         */
        DB_URL: "redacted",
        /**
         * The name of the database.
         */
        DB_NAME: "redacted",
        /**
         * Name of the key file for the database.
         */
        DB_KEY: "redacted",
        /**
         * DeepL API key.
         */
        DEEPL_KEY: "redacted",
        /**
         * The client ID of the bot.
         */
        CLIENT_ID: "776457447887470593",
        /**
         * Steam API key.
         */
        STEAM_API_KEY: "redacted",
        /**
         * Hypixel API key (currently unused).
         */
        HYPIXEL_API_KEY: "redacted",
        /**
         * OpenAI API key.
         */
        OPENAI_KEY: "redacted",
        /**
         * OpenAI organisation name.
         */
        OPENAI_ORG: "redacted"
    },

    /**
     * IDs of roles commonly used in the bot.
     */
    roles: {
        /**
         * The muted role, which is given to users who are muted.
         */
        Muted: "951893872668213288",
        /**
         * The member role, which is given to all members.
         */
        Member: "953275784959774731",
        /**
         * The giveaway role, which is given to users who have access to the giveaway channel.
         */
        Giveaway: "917079814115037224",
        /**
         * The protected role, which is given to users who are not allowed to be pinged.
         */
        Protected: "1037013896290123786",
        /**
         * The @everyone role.
         */
        Everyone: "775789526781263912",
        /**
         * The role given to users who use the UCP.
         */
        UCPUser: "1134938892123000952",

        /**
         * The language roles.
         */
        Languages: {
            /**
             * The English language role.
             */
            English: "1096089417623552010",
            /**
             * The Hungarian language role.
             */
            Hungarian: "1096089475186184262",
            /**
             * The German language role.
             */
            German: "1096089446568448161"
        }
    },

    /**
     * IDs of channels commonly used in the bot.
     */
    channels: {
        /**
         * The mod log channel, where all moderation actions are logged.
         */
        ModLog: "942169939496820837",
        /**
         * The message log channel, where all message actions (edit, delete) are logged.
         */
        MessageLog: "953289937791352892",
        /**
         * The misc log channel, where all other actions are logged.
         */
        MiscLog: "953290376037429258",
        /**
         * The welcome channel, where new members are greeted.
         */
        Welcome: "811677044949123142",
        /**
         * The level up channel, where level up messages are sent.
         */
        LevelUp: "953942388521447424",
        /**
         * The appeal channel, where incoming punishment appeals are sent.
         */
        Appeal: "1014149748015513712",
        /**
         * The giveaway channel, where giveaways are held.
         */
        Giveaway: "1014540440319565927",
        /**
         * The members channel, where member count is displayed.
         */
        Members: "811680790370058271",
        /**
         * The boosts channel, where server boosts are displayed.
         */
        Boosts: "979763624916684862",
        /**
         * The ticket channel, where tickets are created.
         */
        Tickets: "812699682391457812",
        /**
         * The bot commands channel, where bot commands are executed.
         */
        Commands: "1005570504817655930",

        /**
         * Array containing channel IDs where no punishment should be executed.
         */
        AbsoluteNoSearch: [
            "992888358789459998" // level 100 chat
        ],
        /**
         * the channel IDs, where normal links shouldn't be checked (this doesn't include discord invites)
         */
        ExcludeNormalSearch: [
            "841687705989152778", // media
            "1008039145563750420" // music commands
        ],
        /**
         * An array with the IDs of channels to lock when an all lock is executed.
         */
        LockAllIds: [
            "841687635109478440", // general-caht
            "841687705989152778", // media
            "1005570504817655930", // bot-commands
            "1134951518261481603" // technology-caht
        ]
    },

    /**
     * A Map object containing the IDs of mod roles
     */
    ModRoleIds: (<const>{
        // eslint-disable-next-line prettier/prettier
        Base: "812701332250951682",
        "Level 1": "977969136216993883",
        "Level 2": "977969134442790982",
        "Level 3": "977969128071651368",
        Head: "846696368419373057",
        Admin: "835532621664354404",
        Owner: "776477974148808724",
        Test: "985576003969646634"
    }) as Record<ModName, string>,

    OpenTicketsCategory: "846709798192152576",
    ClosedTicketsCategory: "846709831044825119",

    MesterId: "730775136881475645",
    GuildId: "775789526781263912",

    Version: "5.2.0-mnu",

    SuperUsers: ["730775136881475645", "477521549969063936"],

    SnowflakeEpoch: 1651269600,

    MaxDuration: 31536000000,

    MaxMutes: (<const>{
        1: 21600,
        2: 259200,
        3: 1209600
    }) as Record<number, number>,

    MaxBans: (<const>{
        1: 0,
        2: 2592000,
        3: 94608000
    }) as Record<number, number>,

    LevelRoles: [
        { level: 5, id: "992427815490310194" },
        { level: 10, id: "992439841071571015" },
        { level: 20, id: "992441789074120854" },
        { level: 30, id: "992443094022750209" },
        { level: 40, id: "992443650225213520" },
        { level: 50, id: "992444084943847425" },
        { level: 60, id: "992444312606494740" },
        { level: 70, id: "992444411441074206" },
        { level: 75, id: "992444500335153214" },
        { level: 80, id: "992444624868225076" },
        { level: 85, id: "992444713527427205" },
        { level: 90, id: "992444815440613436" },
        { level: 99, id: "992444910022180965" },
        { level: 100, id: "992445002527559780" }
    ],

    /**
     * Emoji IDs for chess pieces.
     */
    ChessPieceEmojis: new Map<string, string>([
        [chess.WHITE + chess.PAWN, "1005159635038261388"], // white pawn
        [chess.BLACK + chess.PAWN, "1005159627547222156"], // black pawn

        [chess.WHITE + chess.ROOK, "1005159631099809843"], // white rook
        [chess.BLACK + chess.ROOK, "1005159623881404497"], // black rook

        [chess.WHITE + chess.KNIGHT, "1005159633696084029"], // white knight
        [chess.BLACK + chess.KNIGHT, "1005159626498646119"], // black knight

        [chess.WHITE + chess.BISHOP, "1005159637051506800"], // white bishop
        [chess.BLACK + chess.BISHOP, "1005159629761822720"], // black bishop

        [chess.WHITE + chess.QUEEN, "1005159636330086490"], // white queen
        [chess.BLACK + chess.QUEEN, "1005159628570636288"], // black queen

        [chess.WHITE + chess.KING, "1005159632081268757"], // white king
        [chess.BLACK + chess.KING, "1005159625173250190"] // black king
    ]),

    puppeteerArgs: [
        "--autoplay-policy=user-gesture-required",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-domain-reliability",
        "--disable-extensions",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-notifications",
        "--disable-offer-store-unmasked-wallet-cards",
        "--disable-popup-blocking",
        "--disable-print-preview",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-setuid-sandbox",
        "--disable-speech-api",
        "--disable-sync",
        "--hide-scrollbars",
        "--ignore-gpu-blacklist",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--no-pings",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain"
    ]
};

// these values are used in test environments (where the .test file exists)
const test = {
    DANGER: { ...base.DANGER, TOKEN: "redacted", DB_NAME: "redacted", DB_KEY: "redacted", CLIENT_ID: "1074348382946070568" },

    roles: {
        Muted: "1074393963626233940",
        Member: "1074393963626233941",
        Giveaway: "1074393964016324690",
        Protected: "1074393963626233938",
        Everyone: "1074393963626233937",
        Unverified: "1094962613080830043",
        UCPUser: "1134958314032201851",
        Friend: "1074393964016324691",

        BotUpdatePing: "1074406494134611998",
        GiveawayPing: "1074406520093163580",
        AnnouncementPing: "1074406470013173930",

        Languages: {
            English: "1095817028746608642",
            Hungarian: "1095817083108999278",
            German: "1095817061697081454"
        }
    },

    channels: {
        ModLog: "1074393965073289360",
        MessageLog: "1074393965073289362",
        MiscLog: "1074393965073289361",
        Welcome: "1074393964515426444",
        LevelUp: "1074393965274595388",
        Appeal: "1074393964788060179",
        Giveaway: "1074393964788060174",
        Members: "1074393964515426440",
        Boosts: "1074393964515426441",
        Verify: "1074393964515426437",
        Tickets: "1074393964788060171",
        SelfRoles: "1074400782755053600",
        Automod: "1074393965073289357",
        Commands: "1074393965073289366",
        GeneralVC: "1074393965274595391",

        /**
         * Array containing channel ids where link detection should be absolutely excluded.
         */
        AbsoluteNoSearch: [
            "1074393965274595389" // level 100 chat
        ],
        /**
         * the channel ids, where normal links shouldn't be checked (this doesn't include discord invites)
         */
        ExcludeNormalSearch: [
            "1074393965073289365", // media
            "1074393965274595390" // music commands
        ],
        /**
         * An array with the ids of channels to lock when an all lock is executed.
         */
        LockAllIds: [
            "1074393965073289364", // general-caht
            "1074393965073289365", // media
            "1074393965073289366", // bot commands
            "1074393965274595390" // music commands
        ]
    },

    /**
     * A Map object containing the IDs of mod roles
     */
    ModRoleIds: (<const>{
        Base: "1074393964016324693",
        "Level 1": "1074393964016324694",
        "Level 2": "1074393964016324695",
        "Level 3": "1074393964016324696",
        Head: "1074393964016324697",
        Admin: "1074393964016324698",
        Owner: "1074393964016324699",
        Test: "1074393964016324692"
    }) as Record<ModName, string>,

    OpenTicketsCategory: "1074393965274595392",
    ClosedTicketsCategory: "1074393965274595393",

    GuildId: "1074393963626233937",

    Version: base.Version + "-test",

    SuperUsers: ["730775136881475645", "477521549969063936"],

    LevelRoles: [
        { level: 5, id: "1074393963626233942" },
        { level: 10, id: "1074393963626233943" },
        { level: 20, id: "1074393963626233944" },
        { level: 30, id: "1074393963626233945" },
        { level: 40, id: "1074393963995336744" },
        { level: 50, id: "1074393963995336745" },
        { level: 60, id: "1074393963995336746" },
        { level: 70, id: "1074393963995336747" },
        { level: 75, id: "1074393963995336748" },
        { level: 80, id: "1074393963995336749" },
        { level: 85, id: "1074393963995336750" },
        { level: 90, id: "1074393963995336751" },
        { level: 99, id: "1074393963995336752" },
        { level: 100, id: "1074393963995336753" }
    ],

    ChessPieceEmojis: new Map<string, string>([
        [chess.WHITE + chess.PAWN, "1076527700765851708"],
        [chess.BLACK + chess.PAWN, "1076527763323883581"],

        [chess.WHITE + chess.ROOK, "1076527703836078161"],
        [chess.BLACK + chess.ROOK, "1076527711457132665"],

        [chess.WHITE + chess.KNIGHT, "1076527699553697962"],
        [chess.BLACK + chess.KNIGHT, "1076527707963281449"],

        [chess.WHITE + chess.BISHOP, "1076527696437334026"],
        [chess.BLACK + chess.BISHOP, "1076527704565878785"],

        [chess.WHITE + chess.QUEEN, "1076527702057693184"],
        [chess.BLACK + chess.QUEEN, "1076527779228692561"],

        [chess.WHITE + chess.KING, "1076527697729167440"],
        [chess.BLACK + chess.KING, "1076527706121965568"]
    ])
};

/**
 * Default configuration for Ulquiorra.
 */
export default testMode ? { ...base, ...test } : base;
