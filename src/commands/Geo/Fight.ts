import { GuildMember } from "discord.js";

interface GeoFightPlayer {
    hp: number;
    skillLoad: number;
}

class GeoFight {
    playerMember: GuildMember;
    player: GeoFightPlayer;

}

export default GeoFight;