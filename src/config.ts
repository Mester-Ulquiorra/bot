import test_mode from "./test_mode";

const base = {
    MutedRole: "951893872668213288",
    MemberRole: "953275784959774731",
    GiveawayRole: "917079814115037224",

    ModLogChannel: "942169939496820837",
    MessageLogChannel: "953289937791352892",
    MiscLogChannel: "953290376037429258",
    WelcomeChannel: "811677044949123142",
    LevelUpChannel: "953942388521447424",
    TestModeChannel: "985544314878840932",
    AppealChannel: "1014149748015513712",
    GiveawayChannel: "1014540440319565927",

    OpenTicketsCategory: "846709798192152576",
    ClosedTicketsCategory: "846709831044825119",

    MesterId: "730775136881475645",
    GuildId: "775789526781263912",
    PrisonId: "1014272380534804581",
    PrisonInvite: "https://discord.gg/SNVtdQHpxm",

    Version: "4.1.3",

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
};

const test = {
    Version: base.Version + "-test",
};

export default test_mode ? Object.assign({}, base, test) : base;