import testMode from "./testMode.js";
import { ModName } from "./util/ModUtils.js";
import chess from "chess.js";

const base = {
    MutedRole: "951893872668213288",
    MemberRole: "953275784959774731",
    GiveawayRole: "917079814115037224",
    ProtectedRole: "1037013896290123786",
    EveryoneRole: "775789526781263912",

    channels: {
        ModLogChannel: "942169939496820837",
        MessageLogChannel: "953289937791352892",
        MiscLogChannel: "953290376037429258",
        WelcomeChannel: "811677044949123142",
        LevelUpChannel: "953942388521447424",
        TestModeChannel: "985544314878840932",
        AppealChannel: "1014149748015513712",
        GiveawayChannel: "1014540440319565927",
        MembersChannel: "811680790370058271",
        BoostChannel: "979763624916684862",
        VerifyChannel: "1006077960584970280",
        TicketsChannel: "812699682391457812",

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
            "841687635109478440",
            "841687705989152778",
            "1005570504817655930",
            "1008039145563750420"
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

    Version: "4.3.1",

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

    ChessPieceEmojis: new Map<{ color: string, piece: string }, string>([
        [{ color: chess.WHITE, piece: chess.PAWN }, "1005159635038261388"],
        [{ color: chess.BLACK, piece: chess.PAWN }, "1005159627547222156"],

        [{ color: chess.WHITE, piece: chess.ROOK }, "1005159631099809843"],
        [{ color: chess.BLACK, piece: chess.ROOK }, "1005159623881404497"],

        [{ color: chess.WHITE, piece: chess.KNIGHT }, "1005159633696084029"],
        [{ color: chess.BLACK, piece: chess.KNIGHT }, "1005159626498646119"],

        [{ color: chess.WHITE, piece: chess.BISHOP }, "1005159637051506800"],
        [{ color: chess.BLACK, piece: chess.BISHOP }, "1005159629761822720"],

        [{ color: chess.WHITE, piece: chess.QUEEN }, "1005159636330086490"],
        [{ color: chess.BLACK, piece: chess.QUEEN }, "1005159628570636288"],

        [{ color: chess.WHITE, piece: chess.KING }, "1005159632081268757"],
        [{ color: chess.BLACK, piece: chess.KING }, "1005159625173250190"],
    ])
};

const test = {
    channels: {
        TicketsChannel: "1074350346035531776"
    },

    OpenTicketsCategory: "1074350795492970506",
    ClosedTicketsCategory: "1074350872349397123",

    GuildId: "1074348306660069428",

    Version: base.Version + "-test",
};

export default testMode ? Object.assign({}, base, test) : base;