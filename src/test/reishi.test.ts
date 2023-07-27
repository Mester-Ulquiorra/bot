import { test, expect, describe } from "bun:test";
import { DetectFlood } from "../util/Reishi/CheckFlood.js";
import { DiscordInviteRegExp, UrlRegExp } from "../util/Reishi/CheckLink.js";
import { DetectProfanity } from "../util/Reishi/CheckProfanity.js";

describe("Reishi", () => {
	describe("ProfanityCheck", () => {
		test("detect simple swear words", () => {
			expect(DetectProfanity("Hey nigga")).toBe("nigga");
			expect(DetectProfanity("Shut up you motherfucker")).toBe("motherfucker");
			expect(DetectProfanity("This is a clean message")).toBeNull();
		});
		test("ignore case", () => {
			expect(DetectProfanity("I'm doing some MASturbation")).toBe("masturbation");
			expect(DetectProfanity("YOU'RE SUCH A MOFO")).toBe("mofo");
		});
		test("detect words that contain punctuation", () => {
			expect(DetectProfanity("COMG!")).toBe("comg");
			expect(DetectProfanity("yeah, she is such a pussylips.")).toBe("pussylips");
			expect(DetectProfanity("WANKER!!! should return the stripped down word")).not.toBe("wanker!!!");
		});
		test("reverse leetspeak", () => {
			expect(DetectProfanity("don't be a pu$$y")).toBe("pussy");
			expect(DetectProfanity("so there was this f4ggot")).toBe("faggot");
			expect(DetectProfanity("bl0wj0b$")).toBe("blowjobs");
		});
		test("detect fragmented words", () => {
			expect(DetectProfanity("di ck")).toBe("dick");
			expect(DetectProfanity("lmao, look at that pu ssy")).toBe("pussy");
		});
		test("reverse leetspeek in fragmented words", () => {
			expect(DetectProfanity("there is this n4 zi")).toBe("nazi");
			expect(DetectProfanity("he is a mo th3 rfu ck3 r")).toBe("motherfucker");
		});
		test("ignore puncutation and other special characters", () => {
			expect(DetectProfanity("look mom, I'm a fi ........-.-. n .-.-.-!! gerf --.-.->\" ucke --/!.., r")).toBe("fingerfucker");
			expect(DetectProfanity("**MAS** -- +u!**r!b 4t --- i**  0n")).toBe("masturbation");
		});
	});
	describe("FloodCheck", () => {
		test("should detect 4 or more newlines in a row", () => {
			expect(
				DetectFlood(`This message has 4 newlines in a row



            hi`)
			).toBe("too many newlines in a row");
			expect(
				DetectFlood(`This message has 6 newlines in a row





            hi`)
			).toBe("too many newlines in a row");
			expect(
				DetectFlood(`This message has 3 newlines in a row


            hi`)
			).not.toBe("too many newlines in a row");
		});
		test("should detect 10 or more newlines overall", () => {
			expect(
				DetectFlood(`This is a very long message
            
            
            
            
            hi
            
            
            
            
            
            
            hey`)
			).toBe("too many newlines");
			expect(
				DetectFlood(`print("Chest")
            sorted ("Iron And Metal")
            property ("You can put stuff in it")
            
            print("Inventory")
            sorted ("Sword")
            property ("You have stuff in it")
            
            print("Player")
            sorted ("Blood")
            property ("Can move can attack and can open chests")
            
            ImportError ("Can't do this Now")
            sum = 404
            set: sum = 404
            
            any :sum = 404
            license
            
            map :KeyboardInterrupt = 4
            'Opens map and closes it'
            
            copyright = True
            
            match = True
            
            ZeroDivisionError = False
            
            ProcessLookupError = True
            
            UnboundLocalError = True
            
            all ("Players")
            
            ValueError = 404
            
            not ("Players are Full"
            )
            
            print("finally GAME OVER")
            str (all)
            print(sum
            )
            
            zizo = "Error Man Sorry"
            
            print(zizo
            )
            
            Lol = "You are bad at the game"
            
            print(Lol
            )
            coding a game in python be like`)
			).toBe("too many newlines");
			expect(
				DetectFlood(`Basically this is a long message
            but it doesn't have
            4 or more newlines in a row
            and it also has less than
            10 newlines overall, therefore it
            should not get detected
            and that's why we include it in this test
            because we never know and it might always fail
            anyway goodbye people`)
			).toBeNull();
		});
		test("detect repeated words", () => {
			expect(DetectFlood("Hello, I'm repeating repeating repeating repeating repeating repeating repeating ")).toBe(
				"repeated word repeating"
			);
			expect(DetectFlood("hello hello hello hello hello hello")).toBe("repeated word hello");
			expect(DetectFlood("Hey, you're hey, hey?")).not.toBe("hey");
		});
		test("detect repeated letters", () => {
			expect(DetectFlood("hellllllllllllo")).toBe("repeated letter l");
			expect(DetectFlood("craaaaaaazy")).toBe("repeated letter a");
			expect(DetectFlood("what's uppppp")).not.toBe("repeated letter p");
		});
		test("ignore leet speak", () => {
			expect(DetectFlood("hiii111i1i1")).toBe("repeated letter i");
			expect(DetectFlood("Wo444a444h")).toBe("repeated letter a");
			expect(DetectFlood("This is r3p3tition repetition r3pet1tion repe+ition repetiti0n r3p3+1+10n r3p3+1ti0n")).toBe(
				"repeated word repetition"
			);
		});
	});
	describe("LinkCheck", () => {
		test("detect Discord invites", () => {
			expect("discord.gg/whatever").toMatch(DiscordInviteRegExp);
			expect("https://discord.com/invite/hipeople").toMatch(DiscordInviteRegExp);
			expect("discord.com/somethingrandom").not.toMatch(DiscordInviteRegExp);
		});
		test("detect normal links", () => {
			expect("https://google.com/search?q=hi").toMatch(UrlRegExp);
			expect("https://www.pornhub.com").toMatch(UrlRegExp);
			expect("http://example.what").toMatch(UrlRegExp);
			expect("thisshouldnt.match").not.toMatch(UrlRegExp);
		});
	});
});
