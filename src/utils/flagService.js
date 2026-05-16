import * as configcat from "@configcat/sdk/node";
import {configDotenv} from "dotenv";
configDotenv();

const client = configcat.getClient(
    process.env.CONFIGCAT_SDK_KEY,
    configcat.PollingMode.AutoPoll,
    {pollIntervalSeconds: 60}
);

function buildCCUser(user)
{
    return new configcat.User(
        user.id,
        user.email,
        user.country || "IN",
        {
            plan: user.plan,
            orgId: user.orgId,
            role: user.role,
        }
    );
}

async function getFlagsForUser(user)
{
    const ccUser = buildCCUser(user);

    const [v2Engine, exportPdf, rateLimitFree] = await Promise.all([
        client.getValueAsync("v2_analytics_engine", false, ccUser),
        client.getValueAsync("export_to_pdf", false, ccUser),
        client.getValueAsync("rate_limit_free_tier", false, ccUser),
    ]);

    return {
        v2Engine,
        exportPdf,
        rateLimitFree,
    };
}

async function getFlag(flagKey, user, defaultValue = false)
{
    const ccUser = buildCCUser(user);
    return client.getValueAsync(flagKey, defaultValue, ccUser);
}

export { getFlagsForUser, getFlag };
