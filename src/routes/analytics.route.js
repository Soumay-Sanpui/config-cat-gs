import {Router} from 'express';
import featureGateMiddleware from "../middleware/featureGate.middleware.js";
import rateLimitGateMiddleware from "../middleware/rateLimitGate.middleware.js";
import {getFlagsForUser} from "../utils/flagService.js";

const MOCK_USER = {
    alice: {
        id: "u1",
        email: "alice@techcorp.com",
        plan: "enterprise",
        orgId: "org_techcorp",
        country: "IN",
        role: "admin",
    },
    bob: {
        id: "u2",
        email: "bob@startupxyz.com",
        plan: "premium",
        orgId: "org_startupxyz",
        country: "IN",
        role: "admin",
    },
    carol: {
        id: "u3",
        email: "carol@freeco.com",
        plan: "free",
        orgId: "org_freeco",
        country: "UK",
        role: "member",
    },
    badguy: {
        id: "u4",
        email: "hacker@badcorp.com",
        plan: "free",
        orgId: "org_badcorp",
        country: "RU",
        role: "member",
    },
};

function mockAuth(req, res, next)
{
    const username = req.query.user || "carol";
    req.user = MOCK_USER[username] || MOCK_USER.carol;
    next();
}

const analyticsRouter = Router();

analyticsRouter.use(mockAuth);

analyticsRouter.get("/query", rateLimitGateMiddleware, async (req, res) => {
    const flags = await getFlagsForUser(req.user);

    const engine = flags.v2Engine ? "v2_engine" : "v1_engine";
    const latency = flags.v2Engine ? "12ms" : "87ms";

    res.json({
        user: req.user.email,
        plan: req.user.plan,
        engine,
        latency,
        data: {
            sessions: 42810,
            pageViews: 198450,
            bounceRate: "38%"
        },
        meta: {
            flags: {
                v2Engine: flags.v2Engine,
                exportPdf: flags.exportPdf,
                rateLimited: flags.rateLimitFree,
            },
        },
    });
});

analyticsRouter.get("/export/pdf", featureGateMiddleware("export_to_pdf"), async (req, res) => {
    res.json({
        user: req.user.email,
        plan: req.user.plan,
        message: "PDF export triggered successfully",
        downloadUrl: "this_is_download_url_of_pdf",
        expiresIn: "1 Hour",
    });
});

analyticsRouter.get("/flags", async (req, res) => {
    const flags = await getFlagsForUser(req.user);

    res.json({
        user: req.user.email,
        plan: req.user.plan,
        orgId: req.user.orgId,
        flags,
    });
});

export default analyticsRouter;
