import assert from "assert";
import { describe, it } from "node:test";
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
        });
    });
});