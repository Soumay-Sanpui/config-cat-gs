import {Router} from 'express';
import featureGateMiddleware from "../middleware/featureGate.middleware.js";
import rateLimitGateMiddleware from "../middleware/rateLimitGate.middleware.js";
import {getFlagsForUser} from "../utils/flagService.js";
import {getAllUsage, getUsage} from "../utils/rateLimitTracker.js";
import {enqueueEmail} from "../services/sqs.service.js";

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

analyticsRouter.get("/usage", async (req, res) => {
    const usage = await getUsage(req.user.id);

    res.status(200).json({
        user: req.user.email,
        plan: req.user.plan,
        usage,
    });
});

analyticsRouter.get("/usage/all", async (req, res) => {
    const all = getAllUsage();
    res.json({
        trackedUser: all.length,
        usage: all,
    });
});

// Simulate 20 anonymous users hitting the percentage bucket
// None of them match any targeting rule — pure hash-based rollout
analyticsRouter.get("/rollout/simulate", async (req, res) => {
    const { getFlagsForUser } = await import("../utils/flagService.js");

    const simulatedUsers = Array.from({ length: 20 }, (_, i) => ({
        id:      `sim_user_${i + 1}`,
        email:   `user${i + 1}@randomcorp.com`,  // matches no whitelist/blacklist rule
        plan:    "free",
        orgId:   `org_sim_${i + 1}`,
        country: "IN",
        role:    "member",
    }));

    const results = await Promise.all(
        simulatedUsers.map(async (user) => {
            const flags = await getFlagsForUser(user);
            return {
                userId:   user.id,
                email:    user.email,
                v2Engine: flags.v2Engine,   // true or false based on hash
            };
        })
    );

    const onCount  = results.filter(r => r.v2Engine).length;
    const offCount = results.filter(r => !r.v2Engine).length;

    res.json({
        summary: {
            total:         20,
            v2Engine_ON:   onCount,
            v2Engine_OFF:  offCount,
            approxPercent: `${(onCount / 20) * 100}%`,
        },
        breakdown: results,
    });
});

analyticsRouter.get("/queue-message", async (req, res) => {
    await enqueueEmail({
        userId: req.user.id,
        email: req.user.email,
        plan: req.user?.plan,
        type: "TEST_SQS_EMAIL",
        timestamp: new Date().toISOString(),
    });
    res.status(200).json({
        message: "Test email event enqueued successfully",
    })
})
export default analyticsRouter;
