import * as chess from "chess.js";
import testMode from "./testMode.js";
import { ModName } from "./util/ModUtils.js";

const base = {
    DANGER: {
        TOKEN: "Nzc2NDU3NDQ3ODg3NDcwNTkz.GLURYw.b-Kpp4IgwjXWvprOZQSwmdaDoPd3GdveEUlVK4",
        DB_URL: "ulquiorra-db.mknjf.mongodb.net",
        DB_NAME: "discord-database",
        DB_KEY: "DB-key-prod.pem",
        DEEPL_KEY: "fec3a7da-60da-2873-b354-b3ea318e81e2:fx",
        DASH_KEY: "D:\\Programming\\Ulquiorra\\ssl\\testkey.pem",
        DASH_CERT: "D:\\Programming\\Ulquiorra\\ssl\\testcert.pem",
        CLIENT_ID: "776457447887470593",
        CLIENT_SECRET: "Xrar8OPsmvGe_ECZ9SqDnK89a_imk_fv",
        CALLBACK_URL: "https://localhost:3000/auth/discord/redirect",
        DASH_SECRET: "56304af020068e51c77aa43eb5e729575dcbbd0612752eea6f378f4a6d008e170446b331e6b4f4028aa57b04a97837dada11365c7ee66a4b426adcbdedde108877d92cbc98bc3c80aaa3ba1d7d666fa500d88b8a1e9cd5dd1d537abf17386df38f8bdcd7f8a4867b19fc4ea2f7edb11ab5a4e12e37d40ac168971561e4c37223"
    },

    roles: {
        Muted: "951893872668213288",
        Member: "953275784959774731",
        Giveaway: "917079814115037224",
        Protected: "1037013896290123786",
        Everyone: "775789526781263912",

        BotUpdatePing: "1074406103707824178",
        GiveawayPing: "778691988206649345",
        AnnouncementPing: "1074406227079081984"
    },

    channels: {
        ModLog: "942169939496820837",
        MessageLog: "953289937791352892",
        MiscLog: "953290376037429258",
        Welcome: "811677044949123142",
        LevelUp: "953942388521447424",
        Appeal: "1014149748015513712",
        Giveaway: "1014540440319565927",
        Members: "811680790370058271",
        Boosts: "979763624916684862",
        Verify: "1006077960584970280",
        Tickets: "812699682391457812",
        SelfRoles: "1074401675596542004",

        /**
         * Array containing channel ids where link detection should be absolutely excluded.
         */
        AbsoluteNoSearch: [
            "992888358789459998" // level 100 chat
        ],
        /**
         * the channel ids, where normal links shouldn't be checked (this doesn't include discord invites)
         */
        ExcludeNormalSearch: [
            "841687705989152778", // media
            "1008039145563750420", // music commands
        ],
        /**
         * An array with the ids of channels to lock when an all lock is executed.
         */
        LockAllIds: [
            "841687635109478440", // general-caht
            "841687705989152778", // media
            "1005570504817655930", // bot commands
            "1008039145563750420" // music commands
        ]
    },

    /**
     * A Map object containing the IDs of mod roles
     */
    ModRoleIds: new Map<ModName, string>([
        ["Base", "812701332250951682"],
        ["Level 1", "977969136216993883"],
        ["Level 2", "977969134442790982"],
        ["Level 3", "977969128071651368"],
        ["Head", "846696368419373057"],
        ["Admin", "835532621664354404"],
        ["Owner", "776477974148808724"],
        ["Test", "985576003969646634"],
    ]),

    OpenTicketsCategory: "846709798192152576",
    ClosedTicketsCategory: "846709831044825119",

    MesterId: "730775136881475645",
    GuildId: "775789526781263912",
    PrisonId: "1014272380534804581",

    PrisonInvite: "https://discord.gg/SNVtdQHpxm",
    ServerInvite: "https://discord.gg/MfmUFk5kbe",

    Version: "4.4.0",

    SuperUsers: [
        "730775136881475645",
        "477521549969063936",
        "897423396126752809",
    ],

    SnowflakeEpoch: 1651269600,

    MaxDuration: 31536000000,

    MaxMutes: [
        { mod: 1, duration: 21600 },
        { mod: 2, duration: 259200 },
        { mod: 3, duration: 1209600 }
    ],

    MaxBans: [
        { mod: 1, duration: 0 },
        { mod: 2, duration: 2592000 },
        { mod: 3, duration: 66355200 }
    ],

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
        { level: 100, id: "992445002527559780" },
    ],

    ChessPieceEmojis: new Map<string, string>([
        [chess.WHITE + chess.PAWN, "1005159635038261388"],
        [chess.BLACK + chess.PAWN, "1005159627547222156"],

        [chess.WHITE + chess.ROOK, "1005159631099809843"],
        [chess.BLACK + chess.ROOK, "1005159623881404497"],

        [chess.WHITE + chess.KNIGHT, "1005159633696084029"],
        [chess.BLACK + chess.KNIGHT, "1005159626498646119"],

        [chess.WHITE + chess.BISHOP, "1005159637051506800"],
        [chess.BLACK + chess.BISHOP, "1005159629761822720"],

        [chess.WHITE + chess.QUEEN, "1005159636330086490"],
        [chess.BLACK + chess.QUEEN, "1005159628570636288"],

        [chess.WHITE + chess.KING, "1005159632081268757"],
        [chess.BLACK + chess.KING, "1005159625173250190"],
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
        "--no-sandbox",
        "--no-zygote",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain",
    ]
};

const test = {
    DANGER: {
        TOKEN: "MTA3NDM0ODM4Mjk0NjA3MDU2OA.Ghju_3.xeJzlS5xZGaCDj6OqL-h3FSXEVBqOJk9Dig49Y",
        DB_URL: "ulquiorra-db.mknjf.mongodb.net",
        DB_NAME: "discord-test",
        DB_KEY: "DB-key-test.pem",
        DEEPL_KEY: "fec3a7da-60da-2873-b354-b3ea318e81e2:fx",
        DASH_KEY: "D:\\Programming\\Ulquiorra\\ssl\\testkey.pem",
        DASH_CERT: "D:\\Programming\\Ulquiorra\\ssl\\testcert.pem",
        CLIENT_ID: "1074348382946070568",
        CLIENT_SECRET: "HWMNItzGYvpvzOBvwVR_b5JCIUSQ0tjQ",
        CALLBACK_URL: "https://localhost:3000/auth/discord/redirect",
        DASH_SECRET: "a6591e94117f5d89d6aa11b80def06288264a4e4a8bad01633809a43fcf9209e7466263bcae9b31abc50a02f1fb23fb1409f1a040f16407bf800c2ed5f1bb7441bfe02757bb63bf03db7d43c79b5ccb16e66e3a4198f6c57fd88fa9236b1612708ab001140d10ff76f3336bbb4f84726f9c999c955681ca6ec06107436bc2c06"
    },

    roles: {
        Muted: "1074393963626233940",
        Member: "1074393963626233941",
        Giveaway: "1074393964016324690",
        Protected: "1074393963626233938",
        Everyone: "1074393963626233937",

        BotUpdatePing: "1074406494134611998",
        GiveawayPing: "1074406520093163580",
        AnnouncementPing: "1074406470013173930"
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
        Boosts: "1074393964515426439",
        Verify: "1074393964515426437",
        Tickets: "1074393964788060171",
        SelfRoles: "1074400782755053600",

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
            "1074393965274595390", // music commands
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
    ModRoleIds: new Map<ModName, string>([
        ["Base", "1074393964016324693"],
        ["Level 1", "1074393964016324694"],
        ["Level 2", "1074393964016324695"],
        ["Level 3", "1074393964016324696"],
        ["Head", "1074393964016324697"],
        ["Admin", "1074393964016324698"],
        ["Owner", "1074393964016324699"],
        ["Test", "1074393964016324692"],
    ]),

    OpenTicketsCategory: "1074393965274595392",
    ClosedTicketsCategory: "1074393965274595393",

    GuildId: "1074393963626233937",

    ServerInvite: "https://discord.gg/eGjpcveaHG",

    Version: base.Version + "-test",

    SuperUsers: [
        "730775136881475645",
        "477521549969063936",
    ],

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
        { level: 100, id: "1074393963995336753" },
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
        [chess.BLACK + chess.KING, "1076527706121965568"],
    ])
};

export default testMode ? Object.assign({}, base, test) : base;