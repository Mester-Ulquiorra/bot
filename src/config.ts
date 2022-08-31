import test_mode from "./test_mode";

const base = {
    MUTED_ROLE: "951893872668213288",
    MEMBER_ROLE: "953275784959774731",
    GIVEAWAY_ROLE: "917079814115037224",

    MOD_LOG_CHANNEL: "942169939496820837",
    MESSAGE_LOG_CHANNEL: "953289937791352892",
    WELCOME_CHANNEL: "811677044949123142",
    LEVEL_UP_CHANNEL: "953942388521447424",
    TEST_MODE_CHANNEL: "985544314878840932",
    APPEAL_CHANNEL: "1014149748015513712",
    GIVEAWAY_CHANNEL: "1014540440319565927",

    OPEN_TICKETS_CATEGORY: "846709798192152576",
    CLOSED_TICKETS_CATEGORY: "846709831044825119",

    MESTER_ID: "730775136881475645",
    GUILD_ID: "775789526781263912",
    PRISON_ID: "1014272380534804581",
    PRISON_INVITE: "https://discord.gg/G9SUcyzWCR",

    VERSION: "4.0.4",

    SUPER_USERS: [
        "730775136881475645",
        "477521549969063936",
        "897423396126752809",
    ],

    SNOWFLAKE_EPOCH: 1651269600,

    LEVEL_ROLES: [
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
    VERSION: base.VERSION + "-test",
};

export default test_mode ? Object.assign({}, base, test) : base;
