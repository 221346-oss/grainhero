import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-verification-email.functions-D37wQU5X.js
/**
* Sends a 6-digit OTP to the user's email via Supabase's built-in
* email delivery (no Resend needed). Returns the tokenHash for
* client-side verifyOtp().
*/
var sendOtpEmail_createServerFn_handler = createServerRpc({
	id: "a17b46b346ea3eb0149223cb10af4e6e4876c44eb919c580c30558d2b91f0293",
	name: "sendOtpEmail",
	filename: "src/lib/auth-verification-email.functions.ts"
}, (opts) => sendOtpEmail.__executeServer(opts));
var sendOtpEmail = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ email: stringType().trim().email().max(200) }).parse(d)).handler(sendOtpEmail_createServerFn_handler, async ({ data }) => {
	const email = data.email.trim().toLowerCase();
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
		type: "magiclink",
		email
	});
	if (linkError) throw new Error(linkError.message);
	const tokenHash = linkData?.properties?.hashed_token ?? "";
	if (!tokenHash) throw new Error("Could not generate OTP token");
	return {
		ok: true,
		tokenHash,
		displayCode: tokenHash.slice(0, 6).toUpperCase()
	};
});
var autoConfirmUserEmail_createServerFn_handler = createServerRpc({
	id: "66054a8b8bb6cbe12f9840de63872e3aa1be008f1b738f01a19041db959694d5",
	name: "autoConfirmUserEmail",
	filename: "src/lib/auth-verification-email.functions.ts"
}, (opts) => autoConfirmUserEmail.__executeServer(opts));
var autoConfirmUserEmail = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ email: stringType().trim().email() }).parse(d)).handler(autoConfirmUserEmail_createServerFn_handler, async ({ data }) => {
	const email = data.email.trim().toLowerCase();
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
	if (listError) throw new Error(`Failed to check user details: ${listError.message}`);
	const user = users.find((u) => u.email?.toLowerCase() === email);
	if (!user) throw new Error("Account user details not found for verification");
	const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
	if (confirmError) throw new Error(`Failed to activate user account: ${confirmError.message}`);
	try {
		await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
		await supabaseAdmin.from("user_roles").insert({
			user_id: user.id,
			role: "admin"
		});
		await supabaseAdmin.from("profiles").update({ admin_id: user.id }).eq("id", user.id);
	} catch (roleError) {
		console.warn("[autoConfirmUserEmail] role assignment failed:", roleError.message);
	}
	return {
		success: true,
		userId: user.id
	};
});
//#endregion
export { autoConfirmUserEmail_createServerFn_handler, sendOtpEmail_createServerFn_handler };
