import express from "express";
import passport from "passport";
import Log, { LogType } from "../../util/Log.js";

const router = express.Router();

router.get("/discord", passport.authenticate("discord"));

router.get("/discord/redirect", passport.authenticate("discord", {
    failureRedirect: "/auth/failed"
}), (req, res) => {
    res.redirect("/dashboard");
});

router.get("/logout", (req, res) => {
    req.logout({ keepSessionInfo: true }, (err) => {
        if (err) Log(err, LogType.Error);
    });
    res.redirect("/");
});

export default router;