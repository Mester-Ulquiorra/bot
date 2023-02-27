import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import config from "../../config.js";
import DashboardConfig from "../../database/DashboardConfig.js";

passport.serializeUser((user: { userId: string; }, done) => {
    done(null, user.userId);
});

passport.deserializeUser((id: string, done) => {
    DashboardConfig.findOne({ userId: id }, { _id: 0, __v: 0 })
        .then(user => {
            if (!user) done(null, null);
            else {
                user.avatar = `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`;
                done(null, user);
            }
        });
});

passport.use(new DiscordStrategy({
    clientID: config.DANGER.CLIENT_ID,
    clientSecret: config.DANGER.CLIENT_SECRET,
    callbackURL: config.DANGER.CALLBACK_URL,
    scope: ["identify", "guilds"]
}, async (accessToken, refreshToken, profile, done) => {
    let user = await DashboardConfig.findOneAndUpdate({ userId: profile.id }, {
        avatar: profile.avatar
    });
    if (user) return done(null, user);

    user = await DashboardConfig.create({
        userId: profile.id,
        avatar: profile.avatar
    });

    done(null, user);
}));