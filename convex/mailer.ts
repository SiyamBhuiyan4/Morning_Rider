"use node";

import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/*
  Sends email through the office Gmail account (free, ~500 emails a day).
  Set once by Siyam, never stored in code:
    npx convex env set GMAIL_USER <the gmail address> --prod
    npx convex env set GMAIL_APP_PASSWORD <16-letter app password> --prod
*/
export const sendPassword = internalAction({
  args: {
    logId: v.id("emailLog"),
    to: v.string(),
    name: v.string(),
    phone: v.string(),
    role: v.union(v.literal("merchant"), v.literal("rider")),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      await ctx.runMutation(internal.support.markEmail, { logId: args.logId, status: "failed", error: "Email sending is not set up yet." });
      return null;
    }
    const site = process.env.SITE_URL ?? "https://morning-rider.vercel.app";
    const loginUrl = `${site}${args.role === "rider" ? "/rider" : "/login"}`;
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    try {
      const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
      await transport.sendMail({
        from: `Morning Rider <${user}>`,
        to: args.to,
        subject: "Your new Morning Rider password",
        text: [
          `Hello ${args.name},`,
          "",
          "The Morning Rider office has set a new password for your account.",
          "",
          `Phone number: ${args.phone}`,
          `New password: ${args.password}`,
          "",
          `Sign in here: ${loginUrl}`,
          "After you sign in, you can change it from Account > Change password.",
          "",
          "If you did not ask for this, call Morning Rider at 01314747084.",
        ].join("\n"),
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:16px">
<h2 style="color:#f57a10;margin:0 0 12px">Morning Rider</h2>
<p>Hello ${esc(args.name)},</p>
<p>The Morning Rider office has set a new password for your account.</p>
<table style="background:#f6f7fb;border-radius:12px;padding:12px 16px;width:100%">
<tr><td style="color:#667">Phone number</td><td style="font-weight:bold;font-family:monospace">${esc(args.phone)}</td></tr>
<tr><td style="color:#667">New password</td><td style="font-weight:bold;font-family:monospace;font-size:18px">${esc(args.password)}</td></tr>
</table>
<p style="margin:20px 0"><a href="${loginUrl}" style="background:#f57a10;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Sign in</a></p>
<p style="color:#667;font-size:13px">After you sign in, you can change it from Account &gt; Change password.<br>If you did not ask for this, call Morning Rider at 01314747084.</p>
</div>`,
      });
      await ctx.runMutation(internal.support.markEmail, { logId: args.logId, status: "sent" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.support.markEmail, { logId: args.logId, status: "failed", error: msg.slice(0, 200) });
    }
    return null;
  },
});
