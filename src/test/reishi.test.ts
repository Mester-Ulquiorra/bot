import assert from "assert";
import { describe, it } from "node:test";
import { DetectFlood } from "../util/Reishi/CheckFlood.js";
import { DiscordInviteRegExp, UrlRegExp } from "../util/Reishi/CheckLink.js";
import { DetectProfanity } from "../util/Reishi/CheckProfanity.js";

describe("Reishi", () => {
    describe("ProfanityCheck", () => {
        it("should detect simple swear words", () => {
            assert.equal(DetectProfanity("Hey nigga"), "nigga");
            assert.equal(DetectProfanity("Shut up you motherfucker"), "motherfucker");
            assert.equal(DetectProfanity("This is a clean message"), null);
        });
        it("should ignore case", () => {
            assert.equal(DetectProfanity("I'm doing some MASturbation"), "masturbation");
            assert.equal(DetectProfanity("YOU'RE SUCH A MOFO"), "mofo");
        });
        it("should detect words that contain punctuation", () => {
            assert.equal(DetectProfanity("COMG!"), "comg");
            assert.equal(DetectProfanity("yeah, she is such a pussylips."), "pussylips");
            assert.notEqual(DetectProfanity("FUCK!!! should return the stripped down word"), "fuck!!!");
        });
        it("should reverse leetspeak", () => {
            assert.equal(DetectProfanity("don't be a pu$$y"), "pussy");
            assert.equal(DetectProfanity("so there was this f4ggot"), "faggot");
            assert.equal(DetectProfanity("bl0wj0b$"), "blowjobs");
        });
        it("should also detect fragmented words", () => {
            assert.equal(DetectProfanity("di ck"), "dick");
            assert.equal(DetectProfanity("lmao, look at that pu ssy"), "pussy");
        });
        it("should reverse leetspeek in fragmented words", () => {
            assert.equal(DetectProfanity("there is this n4 zi"), "nazi");
            assert.equal(DetectProfanity("he is a mo th3 rfu ck3 r"), "motherfucker");
        });
        it("should ignore puncutation and other special characters", () => {
            assert.equal(DetectProfanity("look, mom I'm a fi ........-.-. n .-.-.-!! gerf --.-.->\" ucke --/!.., r"), "fingerfucker");
            assert.equal(DetectProfanity("**MAS** -- +u!**r!b 4t --- i**  0n"), "masturbation");
        });
    });
    describe("FloodCheck", () => {
        it("should detect 4 or more newlines in a row", () => {
            assert.equal(DetectFlood(`This message has 4 newlines in a row



            hi`), "too many newlines in a row");
            assert.equal(DetectFlood(`This message has 6 newlines in a row





            hi`), "too many newlines in a row");
            assert.notEqual(DetectFlood(`This message has 3 newlines in a row


            hi`), "too many newlines in a row");
        });
        it("should detect 10 or more newlines overall", () => {
            assert.equal(DetectFlood(`This is a very long message
            
            
            
            
            hi
            
            
            
            
            
            
            hey`), "too many newlines");
            assert.equal(DetectFlood(`print("Chest")
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
            coding a game in python be like`), "too many newlines");
            assert.equal(DetectFlood(`Basically this is a long message
            but it doesn't have
            4 or more newlines in a row
            and it also has less than
            10 newlines overall, therefore it
            should not get detected
            and that's why we include it in this test
            because we never know and it might always fail
            anyway goodbye people`), null);
        });
        it("should detect repeated words", () => {
            assert.equal(DetectFlood("Hello, I'm repeating repeating repeating repeating repeating repeating repeating "), "repeated word repeating");
            assert.equal(DetectFlood("hello hello hello hello hello hello"), "repeated word hello");
            assert.notEqual(DetectFlood("Hey, you're hey, hey?"), "hey");
        });
        it("should detect repeated letters", () => {
            assert.equal(DetectFlood("hellllllllllllo"), "repeated letter l");
            assert.equal(DetectFlood("craaaaaaazy"), "repeated letter a");
            assert.notEqual(DetectFlood("what's uppppp"), "repeated letter p");
        });
        it("should ignore leet speak", () => {
            assert.equal(DetectFlood("hiii111i1i1"), "repeated letter i");
            assert.equal(DetectFlood("Wo444a444h"), "repeated letter a");
            assert.equal(DetectFlood("This is r3p3tition repetition r3pet1tion repe+ition repetiti0n r3p3+1+10n r3p3+1ti0n"), "repeated word repetition");
        });
    });
    describe("LinkCheck", () => {
        it("should detect Discord invites", () => {
            assert.match("discord.gg/whatever", DiscordInviteRegExp);
            assert.match("discord.com/invite/hipeople", DiscordInviteRegExp);
            assert.doesNotMatch("discord.com/somethingrandom", DiscordInviteRegExp);
        });
        it("should detect normal links", () => {
            assert.match("https://google.com/search?q=hi", UrlRegExp);
            assert.match("https://www.pornhub.com", UrlRegExp);
            assert.match("http://example.what", UrlRegExp);
            assert.doesNotMatch("thisshouldnt.match", UrlRegExp);
        });
    });
});