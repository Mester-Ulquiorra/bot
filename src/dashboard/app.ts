import express, { NextFunction, Request, Response } from "express";
import * as fs from "fs";
import * as https from "https";
import { join } from "path";
import { fileURLToPath } from "url";
import config from "../config.js";
import passport from "passport";
import authRouter from "./routes/auth.js";
import session from "express-session";
import "../database.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = express();
app.use(session({
    secret: config.DANGER.DASH_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

import "./strategies/discord.js";

app.set("views", join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index", {
        message: "Hey Mester!"
    });
});

app.get("/dashboard", isAuthenticated, (req, res) => {
    res.render("dashboard", {
        user: req.user,
    });
});

app.use("/auth", authRouter);

const httpsOptions = {
    key: fs.readFileSync(config.DANGER.DASH_KEY),
    cert: fs.readFileSync(config.DANGER.DASH_CERT)
};

https.createServer(httpsOptions, app).listen(3000, () => {
    console.log("Listening on port 3000");
});

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/auth/discord");
}